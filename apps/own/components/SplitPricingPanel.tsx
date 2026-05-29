'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Card, Icon, cn } from '@pms/ui'
import { MiniCalendar } from '@/components/MiniCalendar'
import { WeeklyPricingModal } from '@/components/WeeklyPricingModal'
import { DayPriceModal } from '@/components/DayPriceModal'
import { StatusLegend } from '@/components/StatusLegend'

interface Props {
  open: boolean
  onClose: () => void
  /** Property whose split variants to display. `null` keeps the panel empty for animation. */
  propertyId: string | null
}

/**
 * Right-sliding overlay panel for the pricing page — mirrors SplitCalendarPanel's UX but the
 * click actions wire up to the per-day price modal and the weekly-rate modal instead of the
 * booking modal. Use the "แบ่งห้อง N ›" pill on the pricing page Layout 1 to open it.
 */
export function SplitPricingPanel({ open, onClose, propertyId }: Props) {
  const { data: property } = trpc.property.byId.useQuery(
    { id: propertyId ?? '' },
    { enabled: !!propertyId && open },
  )
  const [editing, setEditing] = useState<{
    variantId: string
    name: string
    maxGuests: number
    partnerListing: boolean
  } | null>(null)
  const [dayEdit, setDayEdit] = useState<{ variantId: string; name: string; date: Date } | null>(null)

  // Close on ESC
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll while panel is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const name = property ? ((property.name as { th?: string })?.th ?? property.code) : ''
  const splitVariants = property?.variants.filter((v) => !v.isDefault) ?? []

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Panel — slides in from the right */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-6xl flex-col bg-gray-50 shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Sticky header */}
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-6 py-4 backdrop-blur-md">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              ปรับราคาแบบแบ่งห้อง
            </div>
            <h2 className="truncate text-xl font-bold tracking-tight text-gray-900">{name || '—'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <StatusLegend />
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300">
              <Icon name="lock" className="size-3 text-gray-500" />
              ไม่แบ่งห้อง
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ml-1 flex size-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="ปิด"
              title="ปิด"
            >
              <Icon name="close" className="size-5" />
            </button>
          </div>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          {splitVariants.length === 0 ? (
            <Card className="flex flex-col items-center p-12 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-400">
                <Icon name="bed" />
              </div>
              <p className="text-sm text-gray-600">
                ที่พักนี้ยังไม่ได้กำหนดรูปแบบการแบ่งห้อง — สร้าง variant เพิ่มในหน้าลิสติ้งที่พัก
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {splitVariants.map((v) => {
                const vName = (v.name as { th?: string })?.th ?? `แบ่งเปิด ${v.bedrooms} ห้องนอน`
                const label = `${name} — ${vName}`
                return (
                  <Card key={v.id} className="overflow-hidden">
                    <div className="border-b border-gray-100 px-4 pb-3 pt-4">
                      {/* Variant badge — matches SplitCalendarPanel so the user
                          identifies the split variant without a separate title row. */}
                      <div className="mb-2">
                        <span className="inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-sm font-semibold text-white shadow-sm">
                          แบ่งเปิด
                        </span>
                      </div>
                      {/* Title removed — bedroom + guest counts below differentiate variants.
                          Text brand blue; icons stay neutral gray. */}
                      <div className="mt-2 flex items-center gap-4 text-base font-semibold text-brand-700">
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="bed" className="size-4 text-gray-600" />
                          <span>{v.bedrooms}</span> ห้องนอน
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="users" className="size-4 text-gray-600" />
                          สำหรับ <span>{v.maxGuests}</span> ท่าน
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      {/* Per-variant weekly-rate button */}
                      <div className="flex justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setEditing({
                              variantId: v.id,
                              name: label,
                              maxGuests: v.maxGuests,
                              partnerListing: property?.partnerListing ?? false,
                            })
                          }
                        >
                          <Icon name="gear" className="size-4" />
                          ตั้งค่าราคา
                        </Button>
                      </div>
                      {/* Per-day price calendar */}
                      <MiniCalendar
                        variantId={v.id}
                        showPriceModeToggle={false}
                        isSplitVariant
                        onCellClick={(date) => setDayEdit({ variantId: v.id, name: label, date })}
                      />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </aside>

      <WeeklyPricingModal
        open={!!editing}
        onClose={() => setEditing(null)}
        variantId={editing?.variantId ?? null}
        variantName={editing?.name ?? ''}
        initialMaxGuests={editing?.maxGuests ?? 1}
        partnerListing={editing?.partnerListing ?? false}
      />

      <DayPriceModal
        open={!!dayEdit}
        onClose={() => setDayEdit(null)}
        variantId={dayEdit?.variantId ?? null}
        variantLabel={dayEdit?.name ?? ''}
        initialDate={dayEdit?.date ?? null}
      />
    </>
  )
}
