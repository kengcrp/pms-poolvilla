'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { trpc } from '@/lib/trpc'
import { ymd } from '@/lib/date'
import { findThaiHolidays } from '@/lib/thai-holidays'
import { cn } from '@pms/ui'

interface Props {
  open: boolean
  onClose: () => void
  variantId: string | null
  variantLabel: string
  initialDate: Date | null
  /** Optional seed for multi-pick mode — when provided, the drawer opens in
   *  "เลือกวันเอง" mode with these dates already selected. Used by the calendar
   *  surface's multi-pick toolbar so the owner doesn't have to re-tap each day
   *  inside the drawer. Accepts YYYY-MM-DD strings. */
  initialMultiDates?: string[]
  /** Whether the property opted into ราคาส่ง / Agent pricing. When false the
   *  agent-price section is hidden entirely (the property doesn't sell to
   *  wholesale, so the column would just confuse the owner). */
  partnerListing?: boolean
}

type PriceTag = 'NORMAL' | 'SPECIAL' | 'DISCOUNT'
type SelectMode = 'range' | 'multi'

/**
 * Per-day price override drawer — opens from the right as a dark drawer per the
 * latest UX pass (was a centered modal). Lets the owner set a custom price for
 * a date range and optionally tag the day as "วันสำคัญ" (SPECIAL) or "promotion"
 * (DISCOUNT). All previous functionality is preserved — just re-skinned and
 * re-positioned.
 */
export function DayPriceModal({
  open,
  onClose,
  variantId,
  variantLabel,
  initialDate,
  initialMultiDates,
  partnerListing = false,
}: Props) {
  const utils = trpc.useUtils()
  const [error, setError] = useState<string | null>(null)
  // Inline confirmation after a save/reset succeeds — replaces the auto-close
  // behaviour so the drawer can stay parked while the owner moves on to other
  // properties / dates without losing it.
  const [justSavedAt, setJustSavedAt] = useState<Date | null>(null)

  // Selection mode — "range" = continuous checkin→checkout (existing behaviour);
  // "multi" = freely pick non-contiguous days (e.g. 3, 6, 9, 12) and apply one
  // price to all of them in a single save. Multi mode owns its own set of
  // selected day strings (YYYY-MM-DD) so the range inputs stay untouched.
  const [mode, setMode] = useState<SelectMode>('range')
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())

  // Each time the owner clicks a different cell elsewhere on the page, reset
  // back to single-day (range) mode so a previous multi-pick selection doesn't
  // leak across drawer sessions.
  useEffect(() => {
    if (!initialDate) return
    setMode('range')
    setSelectedDates(new Set())
  }, [initialDate])

  // Seed multi-mode when the parent passes a pre-built list of dates (e.g. from
  // MiniCalendar's "เลือกหลายวัน" toolbar). Runs after the initialDate effect
  // above so the seed wins.
  useEffect(() => {
    if (!initialMultiDates || initialMultiDates.length === 0) return
    setMode('multi')
    setSelectedDates(new Set(initialMultiDates))
  }, [initialMultiDates])

  // Use UTC-based ymd to match how MiniCalendar / API store dates (UTC midnight).
  const dateStr = initialDate ? ymd(initialDate) : ''
  const nextDayStr = initialDate ? ymd(new Date(initialDate.getTime() + 86400000)) : ''

  const [form, setForm] = useState({
    checkin: '',
    checkout: '',
    price: 0,
    agentPrice: 0,
    tag: 'NORMAL' as PriceTag,
    note: '',
    /** Original (pre-discount) price — auto-suggested from the weekly default
     *  when user picks "โปรโมชั่น (ลดราคา)" so the strikethrough comparison
     *  displays correctly in the calendar/pricing views. */
    originalPrice: 0,
    /** Same anchor as `originalPrice` but for the agent / OTA column. */
    originalAgentPrice: 0,
    /** Minimum stay (nights) for this day — defaults to 1, surfaces on the
     *  drawer so the owner can require 2/3 nights on holidays / weekends. */
    minStay: 1,
  })

  // Load current price / override for the clicked date (single-night preview)
  const { data: dayInfo, isFetching: dayLoading } = trpc.calendar.range.useQuery(
    { variantId: variantId ?? '', from: dateStr, to: dateStr },
    { enabled: !!variantId && !!dateStr && open },
  )
  const todayData = dayInfo?.[0]
  // True while the click → data-arrived gap; we suppress the form during this window
  // so the user never sees a flash of "0" before the actual price loads.
  const isLoading = !!variantId && !!dateStr && open && (dayLoading || !dayInfo)

  // Reset form when modal opens — defaults are placeholders while data loads
  useEffect(() => {
    if (!open) return
    setError(null)
    setForm({
      checkin: dateStr,
      checkout: nextDayStr,
      price: 0,
      agentPrice: 0,
      tag: 'NORMAL',
      note: '',
      originalPrice: 0,
      originalAgentPrice: 0,
      minStay: 1,
    })
  }, [open, dateStr, nextDayStr])

  // When data arrives, populate the form with the day's actual override / weekly default
  useEffect(() => {
    if (!todayData) return
    setForm((prev) => ({
      ...prev,
      price: todayData.price ?? 0,
      agentPrice: todayData.agentPrice ?? 0,
      tag:
        todayData.priceType === 'SPECIAL'
          ? 'SPECIAL'
          : todayData.priceType === 'DISCOUNT'
            ? 'DISCOUNT'
            : 'NORMAL',
      note: todayData.note ?? '',
      // If there's already a stored originalPrice (existing discount), reuse it.
      // Otherwise treat the current `price` as the "original" baseline so toggling
      // to DISCOUNT pre-fills sensibly (owner just lowers the price field).
      originalPrice: todayData.originalPrice ?? todayData.price ?? 0,
      // Same logic for agent price — fall back to current agent price as the
      // pre-discount anchor when no stored original exists yet.
      originalAgentPrice:
        todayData.originalAgentPrice ?? todayData.agentPrice ?? 0,
      minStay: todayData.minStay ?? 1,
    }))
  }, [todayData])

  // ESC closes the drawer. We intentionally DON'T lock body scroll any more —
  // the drawer stays parked on the right and the owner can keep clicking other
  // property calendars / scroll the list behind it without the drawer closing.
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('keydown', onEsc)
    }
  }, [open, onClose])

  // Clear the "just saved" feedback whenever the owner clicks a different
  // calendar cell — initialDate is the natural trigger for that.
  useEffect(() => {
    setJustSavedAt(null)
  }, [initialDate, variantId])

  const invalidateAll = () => {
    utils.calendar.range.invalidate()
    utils.calendar.byProperty.invalidate()
  }

  // Drawer stays open after a successful mutation so the owner can move on to
  // another day / property without re-opening it. We just refresh the cached
  // calendar data + flash an inline "บันทึกแล้ว" timestamp as feedback.
  const setOverride = trpc.pricing.setDayOverride.useMutation({
    onSuccess: () => {
      invalidateAll()
      setJustSavedAt(new Date())
    },
    onError: (e) => setError(e.message),
  })
  const clearOverride = trpc.pricing.clearDayOverride.useMutation({
    onSuccess: () => {
      invalidateAll()
      setJustSavedAt(new Date())
    },
    onError: (e) => setError(e.message),
  })

  /** Build the override payload (shared between range + multi submit paths). */
  function buildPayload(checkin: string, checkout: string) {
    return {
      variantId: variantId!,
      checkin,
      checkout,
      price: form.price,
      // Send agent price too — null when 0 so the calendar shows "—" in agent mode
      agentPrice: form.agentPrice > 0 ? form.agentPrice : null,
      priceType: (form.tag === 'NORMAL' ? null : form.tag) as 'SPECIAL' | 'DISCOUNT' | null,
      // Only persist originalPrice for DISCOUNT (and only when higher than the
      // new price) — server enforces the same rule.
      originalPrice:
        form.tag === 'DISCOUNT' && form.originalPrice > form.price ? form.originalPrice : null,
      // Same rule for the agent column.
      originalAgentPrice:
        form.tag === 'DISCOUNT' && form.originalAgentPrice > form.agentPrice
          ? form.originalAgentPrice
          : null,
      // Persist minStay only when owner set > 1 (1 = no minimum, same as null).
      minStay: form.minStay > 1 ? form.minStay : null,
      note: form.note || null,
    }
  }

  // Track bulk-save progress so the button can show "กำลังบันทึก 3/12 วัน..."
  // when the owner picks many days at once.
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

  const submit = async () => {
    if (!variantId) return
    setError(null)

    if (mode === 'multi') {
      const dates = [...selectedDates].sort()
      if (dates.length === 0) return setError('กรุณาเลือกอย่างน้อย 1 วัน')
      setBulkProgress({ done: 0, total: dates.length })
      try {
        // Sequential to avoid hammering the server / hitting any per-tx locks.
        // Slightly slower than Promise.all but the progress counter is honest.
        let done = 0
        for (const d of dates) {
          // Per-day single-night override: checkin = day, checkout = day+1.
          const next = new Date(d + 'T00:00:00Z')
          next.setUTCDate(next.getUTCDate() + 1)
          await setOverride.mutateAsync(buildPayload(d, ymd(next)))
          done += 1
          setBulkProgress({ done, total: dates.length })
        }
        setJustSavedAt(new Date())
      } catch {
        /* error already surfaced via onError → setError */
      } finally {
        setBulkProgress(null)
      }
      return
    }

    // Range mode (existing behaviour).
    if (!form.checkin || !form.checkout) return setError('กรุณาเลือกวันที่')
    if (form.checkin >= form.checkout) return setError('วันออกต้องอยู่หลังวันเข้า')
    setOverride.mutate(buildPayload(form.checkin, form.checkout))
  }

  const reset = () => {
    if (!variantId) return
    clearOverride.mutate({
      variantId,
      checkin: form.checkin,
      checkout: form.checkout,
    })
  }

  const hasExistingOverride =
    !!todayData && (todayData.isOverride && (todayData.priceType !== null || todayData.isOverride))

  // Detect Thai holidays among the date(s) being edited so we can warn the
  // owner ("วันนี้คือวันปีใหม่ — แนะนำตั้งราคาพิเศษ"). For multi mode we look
  // across the picked dates; for range/single we look at form.checkin.
  const holidayHits = useMemo(() => {
    const dates =
      mode === 'multi'
        ? [...selectedDates]
        : form.checkin
          ? [form.checkin]
          : []
    return findThaiHolidays(dates)
  }, [mode, selectedDates, form.checkin])

  if (!open) return null
  if (typeof window === 'undefined') return null

  // Light-themed drawer — responsive position:
  //  • Mobile (<sm): bottom sheet — slides up from the bottom, capped at 85vh
  //    with a rounded top edge. Calendar stays visible above.
  //  • Desktop (sm+): right-side drawer (original) — parked full-height on the
  //    right edge with a max width.
  // No backdrop in either mode so the calendar behind stays interactive.
  // Closing happens via the X button or ESC only.
  const node = (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="ปรับราคารายวัน"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] flex justify-end sm:inset-y-0 sm:left-auto sm:right-0"
    >
      <div className="pointer-events-auto relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:border-y-0 sm:border-r-0 sm:border-l">
        {/* Mobile-only drag handle — visual cue that this is a bottom sheet on
            small screens. Hidden on sm+ where the drawer is on the right. */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <span className="h-1 w-10 rounded-full bg-gray-300" aria-hidden />
        </div>
        {/* Header — property name (big, bold) with bedroom count stacked on a
            second smaller line beneath. variantLabel arrives as "ชื่อบ้าน — N
            ห้องนอน" from the parent; we split on the em-dash to render the
            hierarchy. Close X on the right. */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-5 py-4 backdrop-blur-sm">
          {(() => {
            const [propertyName, ...rest] = variantLabel.split(' — ')
            const bedroomLabel = rest.join(' — ')
            return (
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold tracking-tight text-gray-900">
                  {propertyName || variantLabel}
                </h2>
                {bedroomLabel && (
                  <div className="mt-0.5 truncate text-xs font-medium text-gray-500">
                    {bedroomLabel}
                  </div>
                )}
              </div>
            )
          })()}
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="ปิด"
          >
            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 px-5 py-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-gray-600">
              <span className="size-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              กำลังโหลดข้อมูลราคาวันนี้...
            </div>
          )}

          {/* Date summary chip removed per design — the header chip + footer
              save-count already tell the owner what they're editing. */}

          {/* Thai-holiday banner — shows when any picked date matches a known
              festival/holiday so the owner can decide whether to price a
              premium. Auto-condenses when multiple holidays are picked. */}
          {holidayHits.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
              {holidayHits.length === 1 ? (
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none">
                    {holidayHits[0]!.holiday.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-amber-900">
                      {holidayHits[0]!.holiday.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-amber-700">
                      {holidayHits[0]!.holiday.premium
                        ? 'วันเทศกาลสำคัญ — แนะนำตั้งราคาพิเศษ 🌟'
                        : 'วันหยุดราชการ — ลูกค้าอาจสนใจมากกว่าปกติ'}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-900">
                    <span>🎉</span>
                    เลือกตรงกับวันเทศกาล {holidayHits.length} วัน
                  </div>
                  <div className="space-y-1">
                    {holidayHits.map(({ date, holiday }) => (
                      <div
                        key={date}
                        className="flex items-center gap-2 text-[11px] text-amber-800"
                      >
                        <span>{holiday.emoji}</span>
                        <span className="font-semibold tabular-nums">
                          {new Date(date + 'T00:00:00Z').toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span>·</span>
                        <span>{holiday.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Price cards — ราคาขาย + ราคาส่ง อยู่ข้างกันใน grid 2 คอลัมน์
              (เลื่อนลงเป็น single-column บนมือถือผ่าน sm: breakpoint). When the
              property doesn't sell wholesale (partnerListing=false), ราคาขาย
              takes the full width on its own row. */}
          <div className={cn('grid gap-3', partnerListing ? 'sm:grid-cols-2' : 'grid-cols-1')}>
            {/* Big price headline card — the visual anchor of the drawer */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-baseline justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  ราคาขาย
                </div>
                {form.tag === 'DISCOUNT' &&
                  form.originalPrice > form.price &&
                  form.price > 0 && (
                    <span className="text-xs text-gray-400 line-through tabular-nums">
                      เดิม ฿{form.originalPrice.toLocaleString('en-US')}
                    </span>
                  )}
              </div>
              <div className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-gray-900">
                ฿{form.price.toLocaleString('en-US')}
              </div>
              <PriceInput
                value={form.price}
                onChange={(v) => setForm({ ...form, price: v })}
                placeholder="0"
                accent="brand"
              />
            </div>

            {/* Agent price — only rendered for properties that opted into
                partnerListing (ราคาส่ง). Sits next to the ราคาขาย card. */}
            {partnerListing && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    ราคาส่ง / Agent
                  </div>
                  {form.tag === 'DISCOUNT' &&
                    form.originalAgentPrice > form.agentPrice &&
                    form.agentPrice > 0 && (
                      <span className="text-xs text-gray-400 line-through tabular-nums">
                        เดิม ฿{form.originalAgentPrice.toLocaleString('en-US')}
                      </span>
                    )}
                </div>
                <div className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-gray-900">
                  ฿{form.agentPrice.toLocaleString('en-US')}
                </div>
                <PriceInput
                  value={form.agentPrice}
                  onChange={(v) => setForm({ ...form, agentPrice: v })}
                  placeholder="0"
                />
                <p className="mt-1.5 text-[11px] text-gray-500">
                  ปล่อยเป็น 0 = ใช้ค่ารายสัปดาห์
                </p>
              </div>
            )}
          </div>

          {/* Discount preview lines for agent — surface when the existing
              originalAgentPrice and current agentPrice imply a DISCOUNT diff. */}
          {partnerListing &&
            form.tag === 'DISCOUNT' &&
            form.originalAgentPrice > form.agentPrice &&
            form.agentPrice > 0 && (
              <p className="text-[11px]">
                <span className="text-gray-400 line-through">
                  ฿{form.originalAgentPrice.toLocaleString('en-US')}
                </span>{' '}
                <span className="font-semibold text-red-600">
                  ฿{form.agentPrice.toLocaleString('en-US')}
                </span>{' '}
                <span className="text-gray-400">(โหมด Agent)</span>
              </p>
            )}

          {/* Minimum stay — bordered card so it lines up visually with the
              status card below. Stepper-style input so the owner can tap +/-
              to bump the number of nights required. */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                จำนวนเข้าพักขั้นต่ำ
              </div>
              <div className="inline-flex items-center rounded-full border border-gray-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, minStay: Math.max(1, f.minStay - 1) }))
                  }
                  className="flex size-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30"
                  disabled={form.minStay <= 1}
                  aria-label="ลด"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
                    <path d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" />
                  </svg>
                </button>
                <div className="min-w-[3.5rem] text-center text-sm font-bold tabular-nums text-gray-900">
                  {form.minStay} {form.minStay === 1 ? 'คืน' : 'คืน'}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, minStay: Math.min(60, f.minStay + 1) }))
                  }
                  className="flex size-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30"
                  disabled={form.minStay >= 60}
                  aria-label="เพิ่ม"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
                    <path d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Tag radios — wrapped in a bordered card so the section reads as a
              clearly demarcated block, separate from the price/agent inputs above. */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              สถานะวัน
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { val: 'NORMAL', label: 'ราคาปกติ', color: 'gray' },
                  { val: 'DISCOUNT', label: 'โปรโมชั่น (ลดราคา)', color: 'red' },
                  { val: 'SPECIAL', label: 'วันสำคัญ', color: 'blue' },
                ] as const
              ).map((opt) => {
                const active = form.tag === opt.val
                const isGlow = active && opt.val === 'SPECIAL'
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() =>
                      setForm((f) => {
                        const enteringDiscount =
                          opt.val === 'DISCOUNT' && f.tag !== 'DISCOUNT'
                        return {
                          ...f,
                          tag: opt.val,
                          // Snapshot the current ราคาขาย as the "before discount"
                          // anchor whenever owner transitions INTO DISCOUNT — they
                          // just lower the existing price field and the system
                          // remembers the previous value automatically.
                          originalPrice: enteringDiscount ? f.price : f.originalPrice,
                          // Same snapshot for the agent price column.
                          originalAgentPrice: enteringDiscount
                            ? f.agentPrice
                            : f.originalAgentPrice,
                        }
                      })
                    }
                    className={cn(
                      'relative inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                      // Active วันสำคัญ gets a sparkling gradient + glowing halo
                      // behind it (animated pulse layer below). The other tags
                      // keep their flat color treatment.
                      isGlow
                        ? 'border-transparent bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40'
                        : active
                          ? opt.color === 'red'
                            ? 'border-red-300 bg-red-50 text-red-700 shadow-sm'
                            : opt.color === 'blue'
                              ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                              : 'border-brand-300 bg-brand-50 text-brand-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    {/* Pulsing halo behind the pill — only when วันสำคัญ is
                        active. Uses the same gradient as the pill, blurred &
                        animated with Tailwind's built-in pulse so it reads as
                        "เปร่งประกาย" (glowing). */}
                    {isGlow && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 -z-10 animate-pulse rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 opacity-60 blur-md"
                      />
                    )}
                    {/* Sparkle prefix on active วันสำคัญ for extra flair. */}
                    {isGlow && <span className="text-sm leading-none">✨</span>}
                    {!isGlow && (
                      <span
                        className={cn(
                          'inline-flex size-3.5 items-center justify-center rounded-full border',
                          active
                            ? opt.color === 'red'
                              ? 'border-red-500'
                              : opt.color === 'blue'
                                ? 'border-blue-500'
                                : 'border-brand-500'
                            : 'border-gray-300',
                        )}
                      >
                        {active && (
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              opt.color === 'red'
                                ? 'bg-red-500'
                                : opt.color === 'blue'
                                  ? 'bg-blue-500'
                                  : 'bg-brand-500',
                            )}
                          />
                        )}
                      </span>
                    )}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {hasExistingOverride && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
              วันนี้มีราคา override อยู่แล้ว — กด <strong className="font-bold">"รีเซ็ตเป็นราคาปกติ"</strong> เพื่อล้าง
            </div>
          )}
        </div>

        {/* Footer — sticky action bar. Drawer stays open after save; we surface
            "บันทึกแล้ว HH:MM:SS" on the left as confirmation. */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-200 bg-white/95 px-5 py-3.5 backdrop-blur-sm">
          {hasExistingOverride && (
            <button
              type="button"
              onClick={reset}
              disabled={clearOverride.isPending}
              className="mr-auto text-xs font-medium text-gray-500 transition-colors hover:text-red-600 disabled:opacity-50"
            >
              {clearOverride.isPending ? 'กำลังรีเซ็ต...' : 'รีเซ็ตเป็นราคาปกติ'}
            </button>
          )}
          {!hasExistingOverride && justSavedAt && (
            <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              บันทึกแล้ว {justSavedAt.toLocaleTimeString('th-TH')}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={setOverride.isPending || !!bulkProgress}
            className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-sm shadow-brand-600/30 transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {bulkProgress
              ? `กำลังบันทึก ${bulkProgress.done}/${bulkProgress.total} วัน...`
              : setOverride.isPending
                ? 'กำลังบันทึก...'
                : mode === 'multi' && selectedDates.size > 0
                  ? `บันทึก ${selectedDates.size} วัน`
                  : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}

/** Section heading + spacer used inside the drawer body. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </div>
      {children}
    </div>
  )
}

/** Small calendar glyph used in the date summary chips. */
function Icon({ name }: { name: 'calendar' }) {
  if (name === 'calendar') {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 text-gray-400" aria-hidden>
        <path d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.75A2.25 2.25 0 0 1 18 6.25v9.5A2.25 2.25 0 0 1 15.75 18H4.25A2.25 2.25 0 0 1 2 15.75v-9.5A2.25 2.25 0 0 1 4.25 4H5V2.75A.75.75 0 0 1 5.75 2ZM3.5 8v7.75c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75V8h-13Z" />
      </svg>
    )
  }
  return null
}

/** Number input styled for the light drawer. `accent="brand"` lifts the price
 *  hero card's input visually so it reads as the primary control. */
function PriceInput({
  value,
  onChange,
  placeholder,
  accent,
}: {
  value: number
  onChange: (v: number) => void
  placeholder?: string
  accent?: 'brand'
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      step="100"
      value={value === 0 ? '' : value}
      onChange={(e) => onChange(Number(e.target.value || 0))}
      placeholder={placeholder}
      className={cn(
        'mt-2 w-full rounded-lg border bg-white px-3 py-2 text-base font-semibold tabular-nums text-gray-900 placeholder:font-normal placeholder:text-gray-400 outline-none transition-colors focus:ring-2',
        accent === 'brand'
          ? 'border-brand-200 focus:border-brand-500 focus:ring-brand-500/20'
          : 'border-gray-200 focus:border-brand-500 focus:ring-brand-500/20',
      )}
    />
  )
}
