'use client'

import { useEffect, useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Icon, Input, Label, Modal, ModalBody, ModalFooter, NumberInput, cn } from '@pms/ui'

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
    // Default-select the default variant on first hydration
    if (!activeVariantId || !property.variants.some((v) => v.id === activeVariantId)) {
      const def = property.variants.find((v) => v.isDefault)
      setActiveVariantId(def?.id ?? property.variants[0]?.id ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, property])

  // Reset selection AND collapse the booking-window dropdown whenever the modal closes,
  // so reopening it always shows the default state (dropdown collapsed).
  useEffect(() => {
    if (!open) {
      setActiveVariantId(null)
      setBookingWindowOpen(false)
    }
  }, [open])

  const upsert = trpc.pricing.upsertWeekly.useMutation()
  const updateVariant = trpc.variant.update.useMutation()
  const updateProperty = trpc.property.update.useMutation()
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!property) return
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
    } finally {
      setSaving(false)
    }
  }

  const activeRows = activeVariantId ? rowsByVariant[activeVariantId] : undefined
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
            {/* Variant tabs — simple pill row (shrinks to content) */}
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

            {/* Guest capacity & extra-guest pricing
                - รองรับสูงสุด = absolute max (PropertyVariant.maxGuests)
                - รวมในราคา   = guests included in base price (VariantWeeklyPricing.includedGuests, written to all 7 DOWs)
                - ค่าท่านเพิ่ม = fee per guest above รวมในราคา (VariantWeeklyPricing.extraGuestFee) */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Icon name="users" className="size-3.5 text-gray-500" />
                จำนวนผู้เข้าพัก
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>รองรับสูงสุด (ท่าน)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={activeMaxGuests ?? 1}
                    onChange={(e) =>
                      setGuestsByVariant((prev) => ({
                        ...prev,
                        [activeVariantId]: Math.max(1, Number(e.target.value || 1)),
                      }))
                    }
                  />
                  <p className="mt-1 text-[10.5px] text-gray-500">เพดานสูงสุดที่บ้านรับได้</p>
                </div>
                <div>
                  <Label>รวมในราคา (ท่าน)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={activeMaxGuests ?? 100}
                    value={activeRows?.[0]?.includedGuests ?? activeMaxGuests ?? 1}
                    onChange={(e) => {
                      const inc = Math.max(1, Number(e.target.value || 1))
                      // Write the same value to all 7 DOW rows so the weekly form keeps a single source
                      setRowsByVariant((prev) => ({
                        ...prev,
                        [activeVariantId]: (prev[activeVariantId] ?? []).map((r) => ({ ...r, includedGuests: inc })),
                      }))
                    }}
                  />
                  <p className="mt-1 text-[10.5px] text-gray-500">จำนวนท่านที่ราคาขายครอบคลุม</p>
                </div>
                <div>
                  <Label>ค่าท่านเพิ่ม / ท่าน (฿)</Label>
                  <NumberInput
                    value={activeRows?.[0]?.extraGuestFee ?? 0}
                    placeholder="0"
                    onChange={(v) => {
                      setRowsByVariant((prev) => ({
                        ...prev,
                        [activeVariantId]: (prev[activeVariantId] ?? []).map((r) => ({ ...r, extraGuestFee: v })),
                      }))
                    }}
                  />
                  <p className="mt-1 text-[10.5px] text-gray-500">คิดเพิ่มเฉพาะท่านที่เกิน "รวมในราคา"</p>
                </div>
              </div>
            </div>

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
                        onChange={(v) => {
                          setRowsByVariant((prev) => ({
                            ...prev,
                            [activeVariantId]: (prev[activeVariantId] ?? []).map((r, i) =>
                              i === dow ? { ...r, price: v } : r,
                            ),
                          }))
                        }}
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
                          onChange={(v) => {
                            setRowsByVariant((prev) => ({
                              ...prev,
                              [activeVariantId]: (prev[activeVariantId] ?? []).map((r, i) =>
                                i === dow ? { ...r, agentPrice: v } : r,
                              ),
                            }))
                          }}
                        />
                      )
                    )}

                    {showSplitCol && (
                      <button
                        type="button"
                        onClick={() =>
                          setRowsByVariant((prev) => ({
                            ...prev,
                            [activeVariantId]: (prev[activeVariantId] ?? []).map((r, i) =>
                              i === dow ? { ...r, splitOpen: !r.splitOpen } : r,
                            ),
                          }))
                        }
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
        <Button variant="secondary" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button onClick={handleSave} disabled={saving || isPending}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
