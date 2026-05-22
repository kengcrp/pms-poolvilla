'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, Icon, cn } from '@pms/ui'
import { MiniCalendar } from '@/components/MiniCalendar'
import { BookingModal } from '@/components/BookingModal'
import { StatusLegend } from '@/components/StatusLegend'

interface Props {
  open: boolean
  onClose: () => void
  /** Property whose split variants to display. `null` keeps the panel empty (panel still mounted for animation). */
  propertyId: string | null
}

/**
 * Right-sliding overlay panel that replaces the navigation-to-split-page flow on the calendar page.
 * Mounts permanently so the slide-in/out animation runs every time `open` toggles.
 * Booking clicks open the global BookingModal — same flow as the inline calendar.
 */
export function SplitCalendarPanel({ open, onClose, propertyId }: Props) {
  const { data: property } = trpc.property.byId.useQuery(
    { id: propertyId ?? '' },
    { enabled: !!propertyId && open },
  )
  const [modal, setModal] = useState<{ variantId: string; label: string; date: Date } | null>(null)

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
              ที่พักแบบแบ่งห้อง
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
                      <h3 className="text-base font-bold text-red-600">{vName}</h3>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                        <Icon name="users" className="size-3 text-gray-400" />
                        <span>สำหรับ {v.maxGuests} ท่าน</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <MiniCalendar
                        variantId={v.id}
                        showPriceModeToggle={false}
                        bookingWindowMonths={property?.bookingWindowMonths}
                        isSplitVariant
                        onCellClick={(date) => setModal({ variantId: v.id, label, date })}
                      />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </aside>

      <BookingModal
        open={!!modal}
        onClose={() => setModal(null)}
        variantId={modal?.variantId ?? null}
        variantLabel={modal?.label ?? ''}
        initialDate={modal?.date ?? null}
      />
    </>
  )
}
