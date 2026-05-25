'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Icon, Input, Label, Modal, ModalBody, ModalFooter, NumberInput, cn } from '@pms/ui'

interface Props {
  open: boolean
  onClose: () => void
  variantId: string | null
  variantName: string
  /** Initial max-guests value — shown in the guests_count input at the top. */
  initialMaxGuests?: number
  /** When true, an additional "ราคาส่ง Agent" column appears (mirrors property.partnerListing). */
  partnerListing?: boolean
  /** Whether the variant is the "เหมาหลัง" default. Used to hide the per-day "แบ่งห้อง" toggle
   *  — the split toggle is only meaningful for split variants. */
  isDefault?: boolean
}

const DOW_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

interface Row {
  price: number
  agentPrice: number
  splitOpen: boolean
  minStay: number
  /** Guests included in `price` */
  includedGuests: number
  /** Per-extra-guest fee (0 = no extra) */
  extraGuestFee: number
}

export function WeeklyPricingModal({
  open,
  onClose,
  variantId,
  variantName,
  initialMaxGuests = 1,
  partnerListing = false,
  isDefault = false,
}: Props) {
  const showSplitCol = !isDefault
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.pricing.weeklyByVariant.useQuery(
    { variantId: variantId ?? '' },
    { enabled: !!variantId && open },
  )

  const [maxGuests, setMaxGuests] = useState<number>(initialMaxGuests)
  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: 7 }, () => ({
      price: 0,
      agentPrice: 0,
      splitOpen: true,
      minStay: 1,
      includedGuests: initialMaxGuests,
      extraGuestFee: 0,
    })),
  )

  useEffect(() => {
    if (!open) return
    setMaxGuests(initialMaxGuests)
  }, [open, initialMaxGuests])

  useEffect(() => {
    if (data) {
      setRows(
        data.map((r) => ({
          price: r.price,
          agentPrice: r.agentPrice ?? 0,
          splitOpen: r.splitOpen,
          minStay: r.minStay,
          includedGuests: r.includedGuests ?? initialMaxGuests,
          extraGuestFee: r.extraGuestFee ?? 0,
        })),
      )
    }
  }, [data, initialMaxGuests])

  const upsert = trpc.pricing.upsertWeekly.useMutation()
  const updateVariant = trpc.variant.update.useMutation()

  async function handleSave() {
    if (!variantId) return
    // Save weekly pricing + variant max-guests (if changed) in parallel
    await Promise.all([
      upsert.mutateAsync({
        variantId,
        rows: rows.map((r, dow) => ({
          dayOfWeek: dow,
          price: r.price,
          agentPrice: partnerListing ? (r.agentPrice || null) : null,
          minStay: r.minStay,
          splitOpen: r.splitOpen,
          includedGuests: r.includedGuests && r.includedGuests > 0 ? r.includedGuests : null,
          extraGuestFee: r.extraGuestFee > 0 ? r.extraGuestFee : null,
        })),
      }),
      maxGuests !== initialMaxGuests
        ? updateVariant.mutateAsync({ id: variantId, maxGuests })
        : Promise.resolve(),
    ])
    utils.calendar.range.invalidate()
    utils.calendar.byProperty.invalidate()
    utils.property.list.invalidate()
    utils.property.byId.invalidate()
    onClose()
  }

  const saving = upsert.isPending || updateVariant.isPending
  // 4-column grid (day | sell | agent | split) shrinks to 3 cols when no agent column
  // Pre-enumerate the 4 column combos so Tailwind can extract them
  const gridTpl =
    partnerListing && showSplitCol
      ? 'grid-cols-[80px_1fr_1fr_120px]' // day + sell + agent + split
      : partnerListing
        ? 'grid-cols-[80px_1fr_1fr]' // day + sell + agent
        : showSplitCol
          ? 'grid-cols-[80px_1fr_120px]' // day + sell + split
          : 'grid-cols-[80px_1fr]' // day + sell

  return (
    <Modal open={open} onClose={onClose} title="ตั้งค่าราคา" description={variantName} size="lg">
      <ModalBody>
        {isPending ? (
          <div className="flex justify-center py-8 text-sm text-gray-500">กำลังโหลด...</div>
        ) : (
          <div className="space-y-5">
            {/* Guest capacity & extra-guest pricing
                - รองรับสูงสุด = absolute max (PropertyVariant.maxGuests)
                - รวมในราคา   = guests included in base price
                - ค่าท่านเพิ่ม = fee per guest above รวมในราคา (all written to every DOW) */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Icon name="users" className="size-3.5 text-gray-500" />
                จำนวนผู้เข้าพัก
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="guests-count">รองรับสูงสุด (ท่าน)</Label>
                  <Input
                    id="guests-count"
                    type="number"
                    min={1}
                    max={100}
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(Math.max(1, Number(e.target.value || 1)))}
                  />
                  <p className="mt-1 text-[10.5px] text-gray-500">เพดานสูงสุดที่บ้านรับได้</p>
                </div>
                <div>
                  <Label>รวมในราคา (ท่าน)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={maxGuests}
                    value={rows[0]?.includedGuests ?? maxGuests}
                    onChange={(e) => {
                      const inc = Math.max(1, Number(e.target.value || 1))
                      setRows((rs) => rs.map((r) => ({ ...r, includedGuests: inc })))
                    }}
                  />
                  <p className="mt-1 text-[10.5px] text-gray-500">จำนวนท่านที่ราคาขายครอบคลุม</p>
                </div>
                <div>
                  <Label>ค่าท่านเพิ่ม / ท่าน (฿)</Label>
                  <NumberInput
                    value={rows[0]?.extraGuestFee ?? 0}
                    placeholder="0"
                    onChange={(v) => setRows((rs) => rs.map((r) => ({ ...r, extraGuestFee: v })))}
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
                  gridTpl,
                )}
              >
                <div>วัน</div>
                <div className="text-center">ราคาขาย (฿)</div>
                {partnerListing && <div className="text-center">ราคาส่ง Agent (฿)</div>}
                {showSplitCol && <div className="text-center">แบ่งห้อง</div>}
              </div>

              <div className="bg-sky-50/60">
                {rows.map((row, dow) => (
                  <div
                    key={dow}
                    className={cn(
                      'grid items-center gap-3 border-b border-white/80 px-4 py-2 last:border-b-0',
                      gridTpl,
                    )}
                  >
                    {/* day label — left-aligned, single line, same baseline every row */}
                    <div className={cn('text-sm font-medium', !row.splitOpen && showSplitCol ? 'text-gray-400' : 'text-gray-700')}>
                      {DOW_FULL[dow]}
                    </div>

                    {/* selling price — Lock days show "—" placeholder instead of disabled number */}
                    {showSplitCol && !row.splitOpen ? (
                      <div className="flex h-10 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-300">
                        —
                      </div>
                    ) : (
                      <NumberInput
                        value={row.price}
                        className="bg-white text-center font-medium"
                        onChange={(v) => {
                          setRows((rs) => rs.map((r, i) => (i === dow ? { ...r, price: v } : r)))
                        }}
                      />
                    )}

                    {/* agent price — only when partnerListing, Lock days show "—" too */}
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
                            setRows((rs) => rs.map((r, i) => (i === dow ? { ...r, agentPrice: v } : r)))
                          }}
                        />
                      )
                    )}

                    {/* split toggle (Lock / Unlock) — only for non-default variants */}
                    {showSplitCol && (
                      <button
                        type="button"
                        onClick={() =>
                          setRows((rs) =>
                            rs.map((r, i) => (i === dow ? { ...r, splitOpen: !r.splitOpen } : r)),
                          )
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
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button onClick={handleSave} disabled={saving || isPending}>
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
