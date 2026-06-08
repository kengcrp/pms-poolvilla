'use client'

import { useEffect, useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Icon, Label, Modal, ModalBody, ModalFooter, NumberInput, cn } from '@pms/ui'
import { ThaiDatePicker } from './ThaiDatePicker'

interface Props {
  open: boolean
  onClose: () => void
  /** Property whose variants' weekly pricing to edit. `null` keeps modal idle. */
  propertyId: string | null
}

const DOW_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

interface Row {
  price: number
  agentPrice: number
  splitOpen: boolean
  minStay: number
  /** Guests included in `price` — 0/null = use the variant's maxGuests as default */
  includedGuests: number
  /** Per-extra-guest fee. 0 = ไม่คิดค่าท่านเพิ่ม */
  extraGuestFee: number
}

/** Date scope for a rate plan (empty strings = no scope / applies always). */
type DateRange = { startDate: string; endDate: string }

/** Enumerate every UTC midnight Date in [start, end] (inclusive). */
function enumerateDates(startYmd: string, endYmd: string): Date[] {
  if (!startYmd || !endYmd || startYmd > endYmd) return []
  const out: Date[] = []
  const cur = new Date(startYmd + 'T00:00:00Z')
  const end = new Date(endYmd + 'T00:00:00Z')
  while (cur <= end) {
    out.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}
function toYmd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/**
 * Per-property weekly rate editor with variant tabs.
 * Loads ALL variants of the property in one go (via property.byId) and lets the user
 * switch between เหมาหลัง + แบ่ง* tabs without closing/reopening the modal.
 * Save commits every variant's weekly pricing + maxGuests in one batch.
 */
export function PropertyWeeklyPricingModal({ open, onClose, propertyId }: Props) {
  const utils = trpc.useUtils()
  const { data: property, isPending } = trpc.property.byId.useQuery(
    { id: propertyId ?? '' },
    { enabled: !!propertyId && open },
  )

  const variants = useMemo(() => property?.variants ?? [], [property])
  const propertyName = property ? ((property.name as { th?: string })?.th ?? property.code) : ''
  const partnerListing = property?.partnerListing ?? false

  const [activeVariantId, setActiveVariantId] = useState<string | null>(null)
  // Per-variant state — keyed by variantId
  const [rowsByVariant, setRowsByVariant] = useState<Record<string, Row[]>>({})
  const [guestsByVariant, setGuestsByVariant] = useState<Record<string, number>>({})
  // Property-level: booking window (months in advance guests may book; null = default)
  const [bookingWindow, setBookingWindow] = useState<number | null>(null)
  const [bookingWindowOpen, setBookingWindowOpen] = useState(false)

  // Effective period for the BASE rate plan — owner can scope these rates to
  // a specific date range. Sessionstorage-persisted per property.
  const [priceStartDate, setPriceStartDate] = useState('')
  const [priceEndDate, setPriceEndDate] = useState('')

  // ── Plan 2 (extra rate plan) ────────────────────────────────────
  // Owners can define a second rate plan with its own date range + 7 DOW prices.
  // On save the rows are written as per-day overrides via setDayOverride so the
  // calendar reflects them without a schema change. Both rows and the date
  // range are persisted client-side (sessionStorage per variant) since the DB
  // only stores one canonical weekly price set per variant.
  const [activePlanByVariant, setActivePlanByVariant] = useState<Record<string, 0 | 1>>({})
  const [plan2RowsByVariant, setPlan2RowsByVariant] = useState<Record<string, Row[]>>({})
  const [plan2RangeByVariant, setPlan2RangeByVariant] = useState<Record<string, DateRange>>({})

  // Hydrate state from API on load. Re-runs when modal opens or property updates.
  useEffect(() => {
    if (!open || !property) return
    const rows: Record<string, Row[]> = {}
    const guests: Record<string, number> = {}
    for (const v of property.variants) {
      const byDow = new Map(v.weeklyPricing.map((w) => [w.dayOfWeek, w]))
      rows[v.id] = Array.from({ length: 7 }, (_, dow) => {
        const w = byDow.get(dow)
        return {
          price: w?.price ? Number(w.price) : 0,
          agentPrice: w?.agentPrice ? Number(w.agentPrice) : 0,
          splitOpen: w?.splitOpen ?? true,
          minStay: w?.minStay ?? 1,
          // null/0 → default to variant maxGuests so the UI always shows something useful
          includedGuests: w?.includedGuests ?? v.maxGuests,
          extraGuestFee: w?.extraGuestFee ? Number(w.extraGuestFee) : 0,
        }
      })
      guests[v.id] = v.maxGuests
    }
    setRowsByVariant(rows)
    setGuestsByVariant(guests)
    setBookingWindow(property.bookingWindowMonths ?? null)

    // Hydrate plan 2 per variant — rows seed from plan 1, ranges from storage.
    const plan2Rows: Record<string, Row[]> = {}
    const plan2Range: Record<string, DateRange> = {}
    const activePlanInit: Record<string, 0 | 1> = {}
    for (const v of property.variants) {
      // Seed plan 2 rows by copying plan 1 — owner usually starts from there.
      plan2Rows[v.id] = rows[v.id]!.map((r) => ({ ...r }))
      plan2Range[v.id] = { startDate: '', endDate: '' }
      activePlanInit[v.id] = 0
      if (typeof window !== 'undefined') {
        try {
          const raw = sessionStorage.getItem(`pms.weeklyPricing.plan2:${v.id}`)
          if (raw) {
            const parsed = JSON.parse(raw) as {
              rows?: Row[]
              startDate?: string
              endDate?: string
            }
            if (Array.isArray(parsed.rows) && parsed.rows.length === 7) {
              plan2Rows[v.id] = parsed.rows
            }
            plan2Range[v.id] = {
              startDate: parsed.startDate ?? '',
              endDate: parsed.endDate ?? '',
            }
          }
        } catch {
          /* malformed — ignore */
        }
      }
    }
    setPlan2RowsByVariant(plan2Rows)
    setPlan2RangeByVariant(plan2Range)
    setActivePlanByVariant(activePlanInit)

    // Default-select the default variant on first hydration
    if (!activeVariantId || !property.variants.some((v) => v.id === activeVariantId)) {
      const def = property.variants.find((v) => v.isDefault)
      setActiveVariantId(def?.id ?? property.variants[0]?.id ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, property])

  // Persist plan 2 (rows + range) per variant on every change.
  useEffect(() => {
    if (!open || typeof window === 'undefined') return
    for (const vid of Object.keys(plan2RowsByVariant)) {
      try {
        sessionStorage.setItem(
          `pms.weeklyPricing.plan2:${vid}`,
          JSON.stringify({
            rows: plan2RowsByVariant[vid],
            startDate: plan2RangeByVariant[vid]?.startDate ?? '',
            endDate: plan2RangeByVariant[vid]?.endDate ?? '',
          }),
        )
      } catch {
        /* quota / disabled — ignore */
      }
    }
  }, [open, plan2RowsByVariant, plan2RangeByVariant])

  // Reset selection AND collapse the booking-window dropdown whenever the modal closes,
  // so reopening it always shows the default state (dropdown collapsed).
  useEffect(() => {
    if (!open) {
      setActiveVariantId(null)
      setBookingWindowOpen(false)
    }
  }, [open])

  // Hydrate the price-period draft from sessionStorage when the modal opens
  // for a property. Keyed per-property so different listings don't collide.
  useEffect(() => {
    if (!open || !propertyId) return
    if (typeof window === 'undefined') return
    try {
      const raw = sessionStorage.getItem(`pms.weeklyPricing.period:${propertyId}`)
      if (!raw) {
        setPriceStartDate('')
        setPriceEndDate('')
        return
      }
      const parsed = JSON.parse(raw) as { start?: string; end?: string }
      setPriceStartDate(parsed.start ?? '')
      setPriceEndDate(parsed.end ?? '')
    } catch {
      /* malformed — ignore */
    }
  }, [open, propertyId])

  // Persist the period draft whenever it changes so refresh / re-open keeps it.
  useEffect(() => {
    if (!open || !propertyId) return
    if (typeof window === 'undefined') return
    sessionStorage.setItem(
      `pms.weeklyPricing.period:${propertyId}`,
      JSON.stringify({ start: priceStartDate, end: priceEndDate }),
    )
  }, [open, propertyId, priceStartDate, priceEndDate])

  const upsert = trpc.pricing.upsertWeekly.useMutation()
  const setDayOverride = trpc.pricing.setDayOverride.useMutation()
  const updateVariant = trpc.variant.update.useMutation()
  const updateProperty = trpc.property.update.useMutation()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSave() {
    if (!property) return
    setSaveError(null)
    setSaving(true)
    try {
      const tasks: Promise<unknown>[] = []
      for (const v of property.variants) {
        const rows = rowsByVariant[v.id]
        const maxGuests = guestsByVariant[v.id]
        if (!rows) continue
        tasks.push(
          upsert.mutateAsync({
            variantId: v.id,
            rows: rows.map((r, dow) => ({
              dayOfWeek: dow,
              price: r.price,
              agentPrice: partnerListing ? (r.agentPrice || null) : null,
              minStay: r.minStay,
              splitOpen: r.splitOpen,
              // 0 / equal-to-maxGuests → null (use variant default); otherwise persist
              includedGuests: r.includedGuests && r.includedGuests > 0 ? r.includedGuests : null,
              extraGuestFee: r.extraGuestFee > 0 ? r.extraGuestFee : null,
            })),
          }),
        )
        if (typeof maxGuests === 'number' && maxGuests !== v.maxGuests) {
          tasks.push(updateVariant.mutateAsync({ id: v.id, maxGuests }))
        }
        // Plan 2 (extra rate plan) — only takes effect when both dates are
        // set. Each day in range gets a per-day override with the matching DOW
        // row. DOW-aware so the extra plan can vary weekday vs weekend.
        const p2Rows = plan2RowsByVariant[v.id]
        const p2Range = plan2RangeByVariant[v.id]
        if (
          p2Rows &&
          p2Range?.startDate &&
          p2Range?.endDate &&
          p2Range.startDate <= p2Range.endDate
        ) {
          for (const day of enumerateDates(p2Range.startDate, p2Range.endDate)) {
            const dow = day.getUTCDay()
            const r = p2Rows[dow]
            if (!r) continue
            const next = new Date(day)
            next.setUTCDate(next.getUTCDate() + 1)
            tasks.push(
              setDayOverride.mutateAsync({
                variantId: v.id,
                checkin: toYmd(day),
                checkout: toYmd(next),
                price: r.price,
                agentPrice: partnerListing ? (r.agentPrice || null) : null,
                priceType: null,
                originalPrice: null,
                originalAgentPrice: null,
                note: 'ราคาซีซัน',
                minStay: r.minStay > 1 ? r.minStay : null,
              }),
            )
          }
        }
      }
      // Property-level: booking window
      if (bookingWindow !== (property.bookingWindowMonths ?? null)) {
        tasks.push(updateProperty.mutateAsync({ id: property.id, bookingWindowMonths: bookingWindow }))
      }
      await Promise.all(tasks)
      utils.calendar.range.invalidate()
      utils.calendar.byProperty.invalidate()
      utils.property.list.invalidate()
      utils.property.byId.invalidate()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  // Which rate plan tab is active for the current variant (0 = base, 1 = extra).
  const activePlanIdx: 0 | 1 = activeVariantId
    ? (activePlanByVariant[activeVariantId] ?? 0)
    : 0
  // The currently-displayed rows + date range depend on which plan tab is on.
  const activeRows =
    activeVariantId
      ? activePlanIdx === 0
        ? rowsByVariant[activeVariantId]
        : plan2RowsByVariant[activeVariantId]
      : undefined
  const activeRange: DateRange = (() => {
    if (!activeVariantId) return { startDate: '', endDate: '' }
    if (activePlanIdx === 0) return { startDate: priceStartDate, endDate: priceEndDate }
    return plan2RangeByVariant[activeVariantId] ?? { startDate: '', endDate: '' }
  })()
  const setActiveRangeStart = (v: string) => {
    if (!activeVariantId) return
    if (activePlanIdx === 0) setPriceStartDate(v)
    else
      setPlan2RangeByVariant((prev) => ({
        ...prev,
        [activeVariantId]: {
          startDate: v,
          endDate: prev[activeVariantId]?.endDate ?? '',
        },
      }))
  }
  const setActiveRangeEnd = (v: string) => {
    if (!activeVariantId) return
    if (activePlanIdx === 0) setPriceEndDate(v)
    else
      setPlan2RangeByVariant((prev) => ({
        ...prev,
        [activeVariantId]: {
          startDate: prev[activeVariantId]?.startDate ?? '',
          endDate: v,
        },
      }))
  }
  /** Write a partial Row update to the active plan's rows for a given DOW. */
  const updateActiveRow = (dow: number, patch: Partial<Row>) => {
    if (!activeVariantId) return
    const setter = activePlanIdx === 0 ? setRowsByVariant : setPlan2RowsByVariant
    setter((prev) => ({
      ...prev,
      [activeVariantId]: (prev[activeVariantId] ?? []).map((r, i) =>
        i === dow ? { ...r, ...patch } : r,
      ),
    }))
  }
  const activeMaxGuests = activeVariantId ? guestsByVariant[activeVariantId] : undefined
  const activeVariant = variants.find((v) => v.id === activeVariantId)
  // "แบ่งห้อง" toggle column only makes sense for split variants — เหมาหลัง IS the whole house.
  const showSplitCol = !!activeVariant && !activeVariant.isDefault
  // Tailwind needs the full class strings to exist at build time — pre-enumerate the 4 combos
  const gridClass =
    partnerListing && showSplitCol
      ? 'grid-cols-[120px_1fr_1fr_120px]' // day + sell + agent + split
      : partnerListing
        ? 'grid-cols-[120px_1fr_1fr]' // day + sell + agent
        : showSplitCol
          ? 'grid-cols-[120px_1fr_120px]' // day + sell + split
          : 'grid-cols-[120px_1fr]' // day + sell

  return (
    <Modal open={open} onClose={onClose} title="ตั้งค่าราคา" description={propertyName} size="xl">
      <ModalBody>
        {isPending || !property || !activeVariantId ? (
          <div className="flex justify-center py-8 text-sm text-gray-500">กำลังโหลด...</div>
        ) : (
          <div className="space-y-5">
            {/* ── เรท tab pill — switches between ราคาพื้นฐาน (DB-backed) and
                ราคาซีซัน (sessionStorage + per-day overrides on save). Pinned
                at the very top so the owner picks which plan they're editing
                BEFORE touching dates / prices. */}
            {activeVariantId && (
              <div className="inline-flex rounded-full bg-gray-100 p-1">
                {(
                  [
                    { idx: 0, label: 'ราคาพื้นฐาน' },
                    { idx: 1, label: 'ราคาซีซัน' },
                  ] as const
                ).map(({ idx, label }) => {
                  const isActive = activePlanIdx === idx
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setActivePlanByVariant((prev) => ({
                          ...prev,
                          [activeVariantId]: idx,
                        }))
                      }
                      className={cn(
                        'whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                        isActive
                          ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                          : 'text-gray-600 hover:text-gray-900',
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── ช่วงวันที่ใช้ราคานี้ — only relevant for ราคาซีซัน. ราคาพื้นฐาน
                applies whenever no season covers a day, so no date scope is
                needed on that tab. */}
            {activePlanIdx === 1 && (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-100 bg-gray-50/40 px-4 py-3">
                  <div className="text-sm font-semibold text-gray-900">
                    ช่วงวันที่ใช้ราคานี้
                    <span className="ml-2 text-[11px] font-medium text-red-600">จำเป็น</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500">
                    ราคาซีซันจะใช้แทนราคาพื้นฐานในช่วงวันที่กำหนด
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                  <div>
                    <Label>วันที่เริ่มต้น</Label>
                    <ThaiDatePicker
                      value={activeRange.startDate}
                      onChange={setActiveRangeStart}
                      placeholder="เลือกวันเริ่มต้น"
                    />
                  </div>
                  <div>
                    <Label>วันที่สิ้นสุด</Label>
                    <ThaiDatePicker
                      value={activeRange.endDate}
                      onChange={setActiveRangeEnd}
                      min={activeRange.startDate || undefined}
                      placeholder="เลือกวันสิ้นสุด"
                    />
                  </div>
                </div>
                {activeRange.startDate &&
                  activeRange.endDate &&
                  activeRange.startDate > activeRange.endDate && (
                    <div className="border-t border-amber-100 bg-amber-50/60 px-4 py-2 text-[11px] text-amber-700">
                      ⚠️ วันที่สิ้นสุดต้องอยู่หลังวันที่เริ่มต้น
                    </div>
                  )}
              </div>
            )}

            {/* Variant tabs — only render when the property actually has more
                than one variant (i.e. owner enabled แบ่งห้องนอน). Single-variant
                properties just show the lone เหมาหลัง rate table without the
                noisy tab row. */}
            {variants.length > 1 && (
              <div className="overflow-x-auto">
                <div className="inline-flex gap-1 rounded-xl bg-gray-100 p-1">
                  {variants.map((v) => {
                    const vName = (v.name as { th?: string })?.th ?? `${v.bedrooms} ห้องนอน`
                    const isActive = activeVariantId === v.id
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setActiveVariantId(v.id)}
                        className={cn(
                          'whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                          isActive
                            ? v.isDefault
                              ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-100'
                              : 'bg-white text-red-600 shadow-sm ring-1 ring-red-100'
                            : 'text-gray-600 hover:text-gray-900',
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name={v.isDefault ? 'home' : 'bed'} className="size-3.5" />
                          {vName}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Guest capacity card removed per UX request. The variant's
                maxGuests / includedGuests / extraGuestFee still persist
                whatever value was last saved — handleSave writes the existing
                form values back untouched, no data loss. */}

            {/* Per-day grid */}
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div
                className={cn(
                  'grid items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500',
                  gridClass,
                )}
              >
                <div>วัน</div>
                <div className="text-center">ราคาขาย (฿)</div>
                {partnerListing && <div className="text-center">ราคาส่ง Agent (฿)</div>}
                {showSplitCol && <div className="text-center">แบ่งห้อง</div>}
              </div>

              <div className="bg-sky-50/60">
                {(activeRows ?? []).map((row, dow) => (
                  <div
                    key={dow}
                    className={cn(
                      'grid items-center gap-3 border-b border-white/80 px-4 py-2 last:border-b-0',
                      gridClass,
                    )}
                  >
                    <div className={cn('text-sm font-medium', !row.splitOpen && showSplitCol ? 'text-gray-400' : 'text-gray-700')}>
                      {DOW_FULL[dow]}
                    </div>

                    {/* When the day is Locked (splitOpen=false), show "—" placeholder
                        instead of the prior numeric value — owner can't edit it anyway. */}
                    {showSplitCol && !row.splitOpen ? (
                      <div className="flex h-10 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-300">
                        —
                      </div>
                    ) : (
                      <NumberInput
                        value={row.price}
                        className="bg-white text-center font-medium"
                        onChange={(v) => updateActiveRow(dow, { price: v })}
                      />
                    )}

                    {partnerListing && (
                      showSplitCol && !row.splitOpen ? (
                        <div className="flex h-10 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-300">
                          —
                        </div>
                      ) : (
                        <NumberInput
                          value={row.agentPrice}
                          className="bg-white text-center font-medium"
                          placeholder="—"
                          onChange={(v) => updateActiveRow(dow, { agentPrice: v })}
                        />
                      )
                    )}

                    {showSplitCol && (
                      <button
                        type="button"
                        onClick={() => updateActiveRow(dow, { splitOpen: !row.splitOpen })}
                        className={cn(
                          'group inline-flex h-9 w-full items-center justify-between rounded-full px-3 text-xs font-semibold shadow-sm transition-colors',
                          row.splitOpen
                            ? 'bg-brand-600 text-white hover:bg-brand-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
                        )}
                        aria-pressed={row.splitOpen}
                        title={row.splitOpen ? 'เปิดให้แบ่งห้อง' : 'ปิด — ห้ามแบ่งห้อง'}
                      >
                        <span className={cn('flex items-center gap-1', row.splitOpen ? 'order-1' : 'order-2 ml-auto')}>
                          <Icon name={row.splitOpen ? 'check' : 'lock'} className="size-3" />
                          {row.splitOpen ? 'Unlock' : 'Lock'}
                        </span>
                        <span
                          className={cn(
                            'size-5 rounded-full bg-white shadow-sm transition-all',
                            row.splitOpen ? 'order-2' : 'order-1',
                          )}
                        />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Booking window (property-level) ──────────────────────
                Accordion: header expands to a list of preset months options. */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setBookingWindowOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
                aria-expanded={bookingWindowOpen}
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900">ช่วงเวลาที่จองได้</div>
                  <div className="mt-0.5 text-[11px] text-gray-500">
                    เกสต์จองล่วงหน้าได้นานแค่ไหน?
                    {bookingWindow !== null && (
                      <span className="ml-1 text-brand-700">
                        · ปัจจุบัน: {bookingWindow === 0 ? 'ปิดการจองล่วงหน้า' : `${bookingWindow} เดือน`}
                      </span>
                    )}
                  </div>
                </div>
                <Icon
                  name={bookingWindowOpen ? 'chevronUp' : 'chevronDown'}
                  className="size-4 text-gray-400"
                />
              </button>

              {bookingWindowOpen && (
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {[
                    { value: 24, label: '24 เดือน' },
                    { value: 12, label: '12 เดือน' },
                    { value: 9, label: '9 เดือน' },
                    { value: 6, label: '6 เดือน' },
                    { value: 3, label: '3 เดือน' },
                    { value: null as number | null, label: 'วันที่ไม่ว่างตามค่าเริ่มต้น' },
                  ].map((opt) => {
                    const isSelected = bookingWindow === opt.value
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => {
                          setBookingWindow(opt.value)
                          setBookingWindowOpen(false) // collapse dropdown after pick
                        }}
                        className={cn(
                          'flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors',
                          isSelected
                            ? 'bg-brand-50/60 font-semibold text-gray-900'
                            : 'text-gray-700 hover:bg-gray-50',
                        )}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Icon name="check" className="size-4 text-brand-600" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <p className="text-[11px] leading-relaxed text-gray-500">
              💡 ปุ่มบันทึกจะอัพเดตเรททุก variant ที่คุณแก้ไข — รวมทั้งแบ่งห้องนอน ในครั้งเดียว
            </p>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {saveError && (
          <div className="mr-auto rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
            {saveError}
          </div>
        )}
        <Button variant="secondary" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button onClick={handleSave} disabled={saving || !property}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

