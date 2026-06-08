'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button, Card, Icon, Input, Label, cn } from '@pms/ui'
import { WizardStepper } from '@/components/WizardStepper'

/** Counter row — label on the left, [-] [editable number] [+] cluster on the right.
 *  The number is a real input so the user can type a value directly (instead of
 *  clicking +/- many times). Min/max clamping applies on both ways.
 *
 *  On focus, a "0" value is visually blanked so the user can type directly without
 *  having to delete it first. The underlying value stays 0 until they type. */
function CounterRow({
  label,
  value,
  onChange,
  min = 1,
  max = 100,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  const [focused, setFocused] = useState(false)
  const [hasTyped, setHasTyped] = useState(false)
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))
  // Show blank when focused on a zero value (and the user hasn't typed yet) so they can
  // type freely; show actual value otherwise
  const showEmpty = focused && !hasTyped && value === 0
  const displayValue = showEmpty ? '' : value
  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-lg font-medium text-gray-900">{label}</span>
      <div className="inline-flex items-center gap-3">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          className={cn(
            'flex size-10 items-center justify-center rounded-full border transition-colors',
            value <= min
              ? 'cursor-not-allowed border-gray-200 text-gray-300'
              : 'border-gray-300 text-gray-700 hover:border-brand-400 hover:text-brand-700',
          )}
          aria-label={`ลด ${label}`}
        >
          <Icon name="minus" className="size-4" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={displayValue}
          onFocus={(e) => {
            setFocused(true)
            setHasTyped(false)
            // Select any existing digits — typing replaces them
            e.target.select()
          }}
          onBlur={() => {
            setFocused(false)
            setHasTyped(false)
          }}
          onChange={(e) => {
            setHasTyped(true)
            const raw = e.target.value
            if (raw === '') {
              onChange(min)
              return
            }
            const n = Number(raw)
            if (Number.isNaN(n)) return
            onChange(Math.min(max, Math.max(min, Math.floor(n))))
          }}
          className="w-14 rounded-lg border border-transparent bg-transparent px-1 py-1 text-center text-lg font-bold tabular-nums text-gray-900 transition-colors hover:border-gray-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={label}
        />
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          className={cn(
            'flex size-10 items-center justify-center rounded-full border transition-colors',
            value >= max
              ? 'cursor-not-allowed border-gray-200 text-gray-300'
              : 'border-gray-300 text-gray-700 hover:border-brand-400 hover:text-brand-700',
          )}
          aria-label={`เพิ่ม ${label}`}
        >
          <Icon name="plus" className="size-4" />
        </button>
      </div>
    </div>
  )
}

/** sessionStorage key — persists the new-listing form draft across refresh / back-navigation
 *  so the owner doesn't lose what they typed. Cleared on successful create. */
const FORM_DRAFT_KEY = 'pms.newListing.formDraft'

export default function NewListingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Preset type from the category landing page (e.g. ?type=POOL_VILLA)
  const presetType = searchParams.get('type') ?? ''
  const { data: types } = trpc.property.types.useQuery()
  const [form, setForm] = useState({
    nameTh: '',
    nameEn: '',
    type: presetType,
    // Start at 0 so the user fills them in explicitly; CounterRow's min={0} allows this
    totalBedrooms: 0,
    totalBathrooms: 0,
    defaultVariantMaxGuests: 0,
    /** Show "ราคาส่ง Agent" rows in the pricing / calendar pages (was on /edit before) */
    partnerListing: false,
    /** Unit for partner / agent price — 'THB' (baht) or 'PERCENT' (% off sell price).
     *  Only meaningful when partnerListing is on. */
    agentPriceUnit: 'THB' as 'THB' | 'PERCENT',
  })
  /** Split-room state — when enabled, after property creation we also create one
   *  PropertyVariant per row via the variant.create endpoint.
   *  Draft uses string values so the user can fully CLEAR the field (empty) — number
   *  state would always coerce empty to 0 and re-display "0". Strings are parsed at
   *  validation / save time. */
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [splitVariants, setSplitVariants] = useState<{ bedrooms: number; maxGuests: number }[]>([])
  const [splitDraft, setSplitDraft] = useState<{ bedrooms: string; maxGuests: string }>({
    bedrooms: '',
    maxGuests: '',
  })
  /** Index of the variant currently being edited via the draft form. null = adding new. */
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Scraped data hint from the wizard's external-sites step (sessionStorage)
  const [scrapedName, setScrapedName] = useState<string | null>(null)
  /** Has the saved draft been hydrated yet? Auto-save is gated on this to avoid
   *  overwriting saved data with the initial blank state on first render. */
  const [hydrated, setHydrated] = useState(false)

  // If preset doesn't exist (or none passed) → auto-select first type when list loads
  useEffect(() => {
    if (!types || types.length === 0) return
    const exists = types.some((t) => t.code === form.type)
    if (!exists) {
      setForm((f) => ({ ...f, type: types[0]!.code }))
    }
  }, [types, form.type])

  // Hydrate on mount:
  //  1) Saved draft (highest priority — user already typed these values)
  //  2) Scraped data (only fills in blanks the draft didn't have)
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Load saved draft
    const draftRaw = sessionStorage.getItem(FORM_DRAFT_KEY)
    let draftLoaded = false
    if (draftRaw) {
      try {
        const d = JSON.parse(draftRaw) as {
          form?: Partial<typeof form>
          splitEnabled?: boolean
          splitVariants?: { bedrooms: number; maxGuests: number }[]
          splitDraft?: { bedrooms: string; maxGuests: string }
          editingIdx?: number | null
        }
        if (d.form) setForm((f) => ({ ...f, ...d.form }))
        if (typeof d.splitEnabled === 'boolean') setSplitEnabled(d.splitEnabled)
        if (Array.isArray(d.splitVariants)) setSplitVariants(d.splitVariants)
        // Also restore the currently-typing draft + editing index so half-typed
        // split rows aren't lost on navigation away and back
        if (d.splitDraft) setSplitDraft(d.splitDraft)
        if (typeof d.editingIdx === 'number' || d.editingIdx === null) {
          setEditingIdx(d.editingIdx ?? null)
        }
        draftLoaded = true
      } catch {
        /* malformed — ignore */
      }
    }

    // 2. Scraped listing data — only fills in blanks (won't overwrite saved draft values)
    const raw = sessionStorage.getItem('pms.newListing.scraped')
    if (raw) {
      try {
        const s = JSON.parse(raw) as {
          name?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          maxGuests?: number | null
        }
        setForm((f) => ({
          ...f,
          nameTh: f.nameTh || (s.name ?? ''),
          // Fill blanks (>0 means user already entered something — don't overwrite)
          totalBedrooms: f.totalBedrooms > 0 ? f.totalBedrooms : (s.bedrooms ?? f.totalBedrooms),
          totalBathrooms: f.totalBathrooms > 0 ? f.totalBathrooms : (s.bathrooms ?? f.totalBathrooms),
          defaultVariantMaxGuests:
            f.defaultVariantMaxGuests > 0 ? f.defaultVariantMaxGuests : (s.maxGuests ?? f.defaultVariantMaxGuests),
        }))
        if (s.name) setScrapedName(s.name)
      } catch {
        /* malformed JSON — ignore */
      }
    }

    // Mark hydrated so auto-save can begin. We schedule via microtask so the state
    // updates above commit before the auto-save effect runs (avoids a write race).
    void draftLoaded
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** When was the last successful auto-save? Used for the "บันทึกอัตโนมัติ" indicator. */
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // Auto-save draft on any form / split change — only after hydration so we don't
  // wipe the saved draft with the initial blank state on first mount.
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    sessionStorage.setItem(
      FORM_DRAFT_KEY,
      JSON.stringify({ form, splitEnabled, splitVariants, splitDraft, editingIdx }),
    )
    setLastSavedAt(new Date())
  }, [hydrated, form, splitEnabled, splitVariants, splitDraft, editingIdx])

  // Extra safety net — flush the draft synchronously right before the tab unloads
  // (browser close, hard refresh, navigating away to an external URL). React state
  // updates batch, so an in-flight onChange might not reach the auto-save effect
  // before the page is gone. beforeunload guarantees we capture the latest values.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => {
      try {
        sessionStorage.setItem(
          FORM_DRAFT_KEY,
          JSON.stringify({ form, splitEnabled, splitVariants, splitDraft, editingIdx }),
        )
      } catch {
        /* quota / serialization — ignore */
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [form, splitEnabled, splitVariants, splitDraft, editingIdx])

  const createVariant = trpc.variant.create.useMutation()

  const create = trpc.property.create.useMutation({
    onSuccess: async (created) => {
      // Draft no longer needed — property is in the DB now
      if (typeof window !== 'undefined') sessionStorage.removeItem(FORM_DRAFT_KEY)
      // Create any split variants in sequence so sort_order is deterministic
      try {
        for (const v of splitVariants) {
          await createVariant.mutateAsync({
            propertyId: created.id,
            name: { th: `แบ่งเปิดห้องนอน ${v.bedrooms} ห้อง` },
            bedrooms: v.bedrooms,
            maxGuests: v.maxGuests,
          })
        }
      } catch (e) {
        // Surface the variant error but still continue — property is created
        setError(
          'สร้างที่พักแล้ว แต่บันทึกแบบแบ่งห้องไม่สำเร็จ: ' +
            (e instanceof Error ? e.message : 'unknown'),
        )
      }
      // Onboarding flow — show the amenities step before the full edit page
      router.push(`/manage/listings/${created.id}/policies`)
      router.refresh()
    },
    onError: (e) => {
      setError(e.message)
      setSubmitting(false)
    },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    // TH no longer required — accept any non-empty language combo.
    if (!form.nameTh.trim() && !form.nameEn.trim()) {
      return setError('กรุณาใส่ชื่อที่พักอย่างน้อย 1 ภาษา')
    }
    if (!form.type) return setError('กรุณาเลือกประเภทที่พัก')
    if (form.totalBedrooms < 1) return setError('กรุณาระบุจำนวนห้องนอน')
    if (form.totalBathrooms < 1) return setError('กรุณาระบุจำนวนห้องน้ำ')
    if (form.defaultVariantMaxGuests < 1) return setError('กรุณาระบุจำนวนผู้เข้าพัก')
    setSubmitting(true)
    create.mutate({
      // Only include language fields the user actually filled in — the Zod
      // schema's refinement requires at least one, validated by the form above.
      name: {
        ...(form.nameTh.trim() && { th: form.nameTh.trim() }),
        ...(form.nameEn.trim() && { en: form.nameEn.trim() }),
      },
      type: form.type,
      totalBedrooms: form.totalBedrooms,
      totalBathrooms: form.totalBathrooms,
      defaultVariantMaxGuests: form.defaultVariantMaxGuests,
      partnerListing: form.partnerListing,
      // Only meaningful when partnerListing is on, but harmless to always send.
      agentPriceUnit: form.agentPriceUnit,
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/manage/listings/new/name"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
      >
        <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
        กลับไปแก้ไขชื่อ
      </Link>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">ปรับข้อมูลพื้นฐาน</h1>
          <p className="mt-1.5 text-base text-gray-600">ค่อยเพิ่มรายละเอียดภายหลังก็ได้</p>
        </div>
        {/* Auto-save indicator — tiny visual confirmation that the draft is being persisted */}
        {hydrated && (
          <div className="hidden shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 sm:inline-flex">
            <Icon name="check" className="size-3" />
            บันทึกอัตโนมัติ
            {lastSavedAt && (
              <span className="text-emerald-500">
                · {lastSavedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        )}
      </div>

      <WizardStepper current={3} />

      {/* Banner when scraped data was applied from the wizard's external-sites step */}
      {scrapedName && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-sm">
          <Icon name="check" className="mt-0.5 size-4 text-emerald-600" />
          <div className="flex-1">
            <div className="font-semibold text-emerald-800">ดึงข้อมูลจากลิงก์เรียบร้อย</div>
            <p className="mt-0.5 text-xs leading-relaxed text-emerald-700/90">
              ระบบเติมข้อมูลให้แล้ว ({scrapedName}) — กรุณาตรวจสอบก่อนบันทึก
            </p>
          </div>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          {/* Empty-state warning if DB has no property types seeded */}
          {types && types.length === 0 && (
            <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ยังไม่มีประเภทที่พักในระบบ — กรุณาให้ Admin เพิ่มก่อน
            </div>
          )}

          {/* Property name was captured on step 2 (/new/name) and hydrates silently
              into form.nameTh / form.nameEn — no UI confirmation needed here. */}

          {/* Counter rows for capacity — separated by hairline borders for a clean list look.
              min=0 so values start at 0 and the owner enters explicit numbers. */}
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 px-4">
            <CounterRow
              label="จำนวนห้องนอน"
              value={form.totalBedrooms}
              onChange={(v) => setForm({ ...form, totalBedrooms: v })}
              min={0}
              max={50}
            />
            <CounterRow
              label="จำนวนห้องน้ำ"
              value={form.totalBathrooms}
              onChange={(v) => setForm({ ...form, totalBathrooms: v })}
              min={0}
              max={50}
            />
            <CounterRow
              label="จำนวนผู้เข้าพัก"
              value={form.defaultVariantMaxGuests}
              onChange={(v) => setForm({ ...form, defaultVariantMaxGuests: v })}
              min={0}
              max={100}
            />
          </div>

          {/* Split-room option — toggle to opt in, then add rows of bedrooms+maxGuests.
              Each row becomes a PropertyVariant created right after property.create succeeds. */}
          <div
            className={cn(
              'rounded-xl border-2 p-4 transition-colors',
              splitEnabled ? 'border-brand-200 bg-brand-50/40' : 'border-gray-200 bg-gray-50/40',
            )}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={splitEnabled}
                onChange={(e) => setSplitEnabled(e.target.checked)}
                className="mt-1 size-5 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-gray-900">
                  ท่านมีแบ่งเปิดห้องนอนแบบเหมาหลังด้วยไหม?
                </div>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  <span className="font-medium text-brand-700">แบ่งเปิดห้องนอน</span> ช่วยเพิ่ม
                  โอกาสในการขายเมื่อลูกค้ามากรุ๊ปเล็กลง
                </p>
              </div>
            </label>

            {splitEnabled && (() => {
              // Renders the add/edit panel — used both inline (replacing the edited card)
              // and at the bottom of the list (for adding new variants).
              const renderEditorPanel = () => {
                const bedMax = Math.max(0, form.totalBedrooms - 1)
                const guestMax = form.defaultVariantMaxGuests
                // Parse string drafts → numbers for comparisons / validation
                const bedNum = splitDraft.bedrooms === '' ? 0 : Number(splitDraft.bedrooms)
                const guestNum = splitDraft.maxGuests === '' ? 0 : Number(splitDraft.maxGuests)
                const bedOver = bedNum > bedMax
                const guestOver = guestNum > guestMax
                const isEditing = editingIdx !== null
                /** Allow only digits in the field. Empty string is permitted (= cleared).
                 *  This strips letters/symbols even when pasted, since native type="number"
                 *  doesn't reliably block non-numeric content on every browser. */
                const sanitizeDigits = (raw: string) => raw.replace(/[^\d]/g, '')
                return (
                  <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white/70 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-base font-semibold text-gray-700">
                        <Icon name={isEditing ? 'edit' : 'plus'} className="size-4" />
                        {isEditing ? 'แก้ไขแบบแบ่งห้อง' : 'ขายทั้งหลัง แบ่งเปิดห้องนอน'}
                      </div>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingIdx(null)
                            setSplitDraft({ bedrooms: '', maxGuests: '' })
                            setError(null)
                          }}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                          ยกเลิกการแก้ไข
                        </button>
                      )}
                    </div>
                    {/* items-end + absolute-positioned error so both columns + button stay
                        vertically aligned even when one side has a validation message */}
                    <div className={cn('flex items-end gap-3', (bedOver || guestOver) && 'mb-10')}>
                      <div className="relative flex-1">
                        <Label htmlFor="splitBed">จำนวนห้องนอน</Label>
                        <Input
                          id="splitBed"
                          // text + inputMode=numeric → digit-only on mobile, no spinner UI,
                          // and our sanitize step blocks every non-digit char
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={3}
                          value={splitDraft.bedrooms}
                          onChange={(e) =>
                            setSplitDraft({ ...splitDraft, bedrooms: sanitizeDigits(e.target.value) })
                          }
                          aria-invalid={bedOver}
                          className={cn(bedOver && 'border-red-400 focus:ring-red-400')}
                        />
                        {bedOver && (
                          <p className="absolute left-0 top-full mt-1 text-xs text-red-600">
                            ใส่ได้สูงสุด {bedMax} ห้อง (แบบแบ่งต้องน้อยกว่าทั้งหลัง {form.totalBedrooms} ห้อง)
                          </p>
                        )}
                      </div>
                      <div className="relative flex-1">
                        <Label htmlFor="splitGuests">จำนวนผู้เข้าพัก</Label>
                        <Input
                          id="splitGuests"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={3}
                          value={splitDraft.maxGuests}
                          onChange={(e) =>
                            setSplitDraft({ ...splitDraft, maxGuests: sanitizeDigits(e.target.value) })
                          }
                          aria-invalid={guestOver}
                          className={cn(guestOver && 'border-red-400 focus:ring-red-400')}
                        />
                        {guestOver && (
                          <p className="absolute left-0 top-full mt-1 text-xs text-red-600">
                            รองรับได้ไม่เกิน {guestMax} ท่าน (เท่ากับจำนวนผู้เข้าพักของทั้งหลัง)
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          if (bedNum < 1) {
                            setError('กรุณาระบุจำนวนห้องนอนของแบบแบ่งห้อง')
                            return
                          }
                          if (bedNum >= form.totalBedrooms) {
                            setError(
                              `ใส่ได้สูงสุด ${bedMax} ห้อง (แบบแบ่งต้องน้อยกว่าทั้งหลัง ${form.totalBedrooms} ห้อง)`,
                            )
                            return
                          }
                          if (guestNum < 1) {
                            setError('กรุณาระบุจำนวนผู้เข้าพักของแบบแบ่งห้อง')
                            return
                          }
                          if (guestNum > guestMax) {
                            setError(
                              `รองรับได้สูงสุด ${guestMax} ท่าน (จากที่พักรองรับ ${guestMax} ท่าน)`,
                            )
                            return
                          }
                          setError(null)
                          const payload = { bedrooms: bedNum, maxGuests: guestNum }
                          if (editingIdx !== null) {
                            // Update in place
                            setSplitVariants((prev) =>
                              prev.map((v, i) => (i === editingIdx ? payload : v)),
                            )
                            setEditingIdx(null)
                          } else {
                            // Append new
                            setSplitVariants((prev) => [...prev, payload])
                          }
                          // Reset draft back to empty — owner fills again next time
                          setSplitDraft({ bedrooms: '', maxGuests: '' })
                        }}
                        disabled={form.totalBedrooms <= 1 || bedOver || guestOver}
                      >
                        {isEditing ? 'บันทึก' : 'เพิ่ม'}
                      </Button>
                    </div>
                    {form.totalBedrooms <= 1 && (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        ที่พักนี้มี {form.totalBedrooms} ห้องนอน (ต้องมีมากกว่า 2
                        ห้องนอนจึงจะแบ่งได้)
                      </p>
                    )}
                  </div>
                )
              }

              return (
                <div className="mt-4 space-y-3 border-t border-brand-200 pt-4">
                  {/* Variant list — always shows "เหมาทั้งหลัง" (the default whole-house
                      variant) at the top, followed by any split variants the user added. */}
                  <div className="space-y-2">
                    {/* Default whole-house variant — readonly (cannot be removed) */}
                    <div className="flex items-center gap-3 rounded-lg border border-brand-300 bg-brand-50/40 px-3 py-2.5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white">
                        <Icon name="home" className="size-4" />
                      </div>
                      <div className="flex-1 text-base text-gray-800">
                        <span className="font-medium text-brand-700">เหมาทั้งหลัง</span>
                        <span className="ml-2 text-sm text-gray-500">
                          {form.totalBedrooms} ห้อง · สำหรับ {form.defaultVariantMaxGuests} ท่าน
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                        default
                      </span>
                    </div>

                    {/* Split variants — sorted by bedrooms DESC. While editing, ALL split
                        cards are hidden (only the default "เหมาทั้งหลัง" stays) and the
                        editor panel takes over below. Cards return after save/cancel. */}
                    {editingIdx === null &&
                      splitVariants
                        .map((v, originalIdx) => ({ ...v, originalIdx }))
                        .sort((a, b) => b.bedrooms - a.bedrooms)
                        .map((v) => {
                          const idx = v.originalIdx
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5"
                            >
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                                <span className="text-base font-bold">{v.bedrooms}</span>
                              </div>
                              <div className="flex-1 text-base text-gray-800">
                                <span className="font-medium">แบ่งเปิดห้องนอน</span>
                                <span className="ml-2 text-sm text-gray-500">
                                  {v.bedrooms} ห้อง · สำหรับ {v.maxGuests} ท่าน
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setError(null)
                                  setEditingIdx(idx)
                                  setSplitDraft({
                                    bedrooms: String(v.bedrooms),
                                    maxGuests: String(v.maxGuests),
                                  })
                                }}
                                className="flex size-9 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
                                title="แก้ไข"
                                aria-label="แก้ไข"
                              >
                                <Icon name="edit" className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSplitVariants((prev) => prev.filter((_, i) => i !== idx))
                                  // If we were editing this row, cancel the edit
                                  if (editingIdx === idx) {
                                    setEditingIdx(null)
                                    setSplitDraft({ bedrooms: '', maxGuests: '' })
                                  } else if (editingIdx !== null && editingIdx > idx) {
                                    // Adjust the editing index since the array shrank
                                    setEditingIdx(editingIdx - 1)
                                  }
                                }}
                                className="flex size-9 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                title="ลบ"
                                aria-label="ลบ"
                              >
                                <Icon name="trash" className="size-4" />
                              </button>
                            </div>
                          )
                        })}
                  </div>

                  {/* Editor panel — always visible. Doubles as add-new (when editingIdx===null)
                      and as edit-in-place (when editingIdx !== null, with all split cards hidden) */}
                  {renderEditorPanel()}
                </div>
              )
            })()}
          </div>

          {/* ─── ตัวเลือกเสริม — partner / agent listing toggle ─────────────── */}
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              ตัวเลือกเสริม
            </div>

            {/* Outer card holds 2 zones:
                  1. checkbox + description (clickable label)
                  2. price-unit radio cards (only when checkbox is ON)
                Separating zones avoids the previous `preventDefault`
                hack that kept inner clicks from toggling the parent label. */}
            <div
              className={cn(
                'overflow-hidden rounded-2xl border bg-white transition-all',
                form.partnerListing
                  ? 'border-brand-400 shadow-sm shadow-brand-500/10'
                  : 'border-gray-200',
              )}
            >
              {/* Zone 1: checkbox + description */}
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 p-4 transition-colors',
                  form.partnerListing ? 'bg-brand-50/40' : 'hover:bg-gray-50',
                )}
              >
                <input
                  type="checkbox"
                  checked={form.partnerListing}
                  onChange={(e) =>
                    setForm({ ...form, partnerListing: e.target.checked })
                  }
                  className="mt-0.5 size-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon name="users" className="size-4 text-brand-600" />
                    <span className="text-sm font-semibold text-gray-900">
                      ต้องการลงประกาศกับพาทเนอร์ / Agent
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">
                    เปิดใช้งานเพื่อให้แสดงตัวเลือก{' '}
                    <strong>"ราคาส่ง Agent"</strong> ในหน้า{' '}
                    <strong>ปรับราคา</strong> และ <strong>ปฏิทิน</strong> —
                    ช่วยให้คุณตั้งราคาแยกสำหรับการขายผ่านพาทเนอร์ (OTA / Agent)
                  </p>
                </div>
              </label>

              {/* Zone 2: price-unit selector — bigger radio cards instead of a
                  tucked-away pill. Each card shows the symbol + label so the
                  difference between flat baht and percent-off is unmistakable. */}
              {form.partnerListing && (
                <div className="border-t border-brand-200/60 bg-white p-4">
                  <div className="mb-2 text-xs font-semibold text-gray-700">
                    หน่วยราคาส่ง Agent
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <PriceUnitOption
                      active={form.agentPriceUnit === 'THB'}
                      onClick={() => setForm({ ...form, agentPriceUnit: 'THB' })}
                      symbol="฿"
                      label="ราคาส่ง"
                      desc="ระบุเป็นจำนวนเงิน (บาท) แยกจากราคาขาย"
                    />
                    <PriceUnitOption
                      active={form.agentPriceUnit === 'PERCENT'}
                      onClick={() => setForm({ ...form, agentPriceUnit: 'PERCENT' })}
                      symbol="%"
                      label="เปอร์เซ็นต์"
                      desc="คิดเป็น % ลดจากราคาขาย เช่น 10% off"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
            <Link href="/manage/listings">
              <Button variant="secondary" type="button">
                ยกเลิก
              </Button>
            </Link>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : 'สร้างและไปแก้ไขรายละเอียด'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

/** Radio-card option for the agent-price unit selector — symbol + label + desc. */
function PriceUnitOption({
  active,
  onClick,
  symbol,
  label,
  desc,
}: {
  active: boolean
  onClick: () => void
  symbol: string
  label: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all',
        active
          ? 'border-brand-500 bg-brand-50 shadow-sm shadow-brand-500/10'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
      )}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg text-base font-extrabold',
          active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500',
        )}
      >
        {symbol}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'text-sm font-bold',
            active ? 'text-brand-700' : 'text-gray-900',
          )}
        >
          {label}
        </div>
        <div className="mt-0.5 text-[11px] leading-snug text-gray-500">
          {desc}
        </div>
      </div>
    </button>
  )
}
