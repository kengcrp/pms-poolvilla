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
  /** View-only mode — disables cell clicks and hides the BookingModal.
   *  Used by share-friendly listings-calendar pages. */
  readOnly?: boolean
  /** Forwarded to MiniCalendar — when true, no price text appears in cells. */
  hidePrices?: boolean
  /** Forwarded to MiniCalendar — defaults the price view (sell vs agent/wholesale). */
  initialPriceMode?: 'sell' | 'agent'
}

/**
 * Right-sliding overlay panel that replaces the navigation-to-split-page flow on the calendar page.
 * Mounts permanently so the slide-in/out animation runs every time `open` toggles.
 * Booking clicks open the global BookingModal — same flow as the inline calendar.
 */
export function SplitCalendarPanel({
  open,
  onClose,
  propertyId,
  readOnly = false,
  hidePrices = false,
  initialPriceMode = 'sell',
}: Props) {
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
  const cover = property?.images.find((img) => img.type === 'cover')?.url ?? property?.images[0]?.url
  // Show ALL variants — default ("เปิดทั้งหลัง") goes first, splits follow.
  // Default variant is sorted to position 0 for visual hierarchy (full villa first).
  const allVariants = [...(property?.variants ?? [])].sort((a, b) => {
    if (a.isDefault === b.isDefault) return a.sortOrder - b.sortOrder
    return a.isDefault ? -1 : 1
  })

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

      {/* Panel — slides in from the right.
          Width: 96rem (~1536px) so 3 calendar cards have enough breathing room and the
          date numbers / prices never crowd each other. Still capped to the viewport so
          on narrower screens the panel just fills available space. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-[96rem] flex-col bg-gray-50 shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Sticky header — minimal: close button only.
            All other identifiers (property name, section label, status legend) live in the
            scrollable body now, freeing the sticky bar to be a slim affordance for closing. */}
        <header className="sticky top-0 z-10 flex items-center justify-end border-b border-gray-200 bg-white/90 px-6 py-3 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="ปิด"
            title="ปิด"
          >
            <Icon name="close" className="size-5" />
          </button>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          {allVariants.length === 0 ? (
            <Card className="flex flex-col items-center p-12 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-400">
                <Icon name="bed" />
              </div>
              <p className="text-sm text-gray-600">
                ที่พักนี้ยังไม่ได้กำหนดรูปแบบการเปิดขาย
              </p>
            </Card>
          ) : (
            <>
              {/* Property header row — left: compact property card (image + name + meta).
                  Right: StatusLegend anchored to the BOTTOM of the row so it lines up with
                  the lower edge of the property card (cleaner baseline alignment).
                  "ไม่แบ่งห้อง" appears in the legend only when this property has split variants. */}
              {property && (
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <Card className="w-full max-w-lg overflow-hidden">
                    <div className="flex items-center gap-4 p-4">
                      <div className="h-28 w-44 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt={name} className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-gray-300">
                            <Icon name="home" className="size-10" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-bold tracking-tight text-gray-900">
                          {name}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <code className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
                            {property.code}
                          </code>
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-0.5 ring-1 ring-inset ring-gray-200">
                            <Icon name="bed" className="size-3.5 text-gray-700" />
                            <span className="font-semibold tabular-nums text-gray-900">{property.totalBedrooms}</span>
                            <span className="text-xs font-medium text-gray-700">ห้องนอน</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-0.5 ring-1 ring-inset ring-gray-200">
                            <Icon name="bath" className="size-3.5 text-gray-700" />
                            <span className="font-semibold tabular-nums text-gray-900">{property.totalBathrooms}</span>
                            <span className="text-xs font-medium text-gray-700">ห้องน้ำ</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <StatusLegend showSplitLock={allVariants.some((v) => !v.isDefault)} />
                </div>
              )}

              {/* Variant calendar grid — no per-card image; visual identity comes from the
                  colored title + a small variant-type chip above it.
                  Layout: 3 cards per row from lg breakpoint (≥1024px), gap-3 keeps cards
                  close but not touching. Each card stretches to fill its column → longer
                  visual presence per card without crowding. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allVariants.map((v) => {
                  const isDef = v.isDefault
                  const vName = isDef
                    ? `เปิดทั้งหลัง (${v.bedrooms} ห้องนอน)`
                    : ((v.name as { th?: string })?.th ?? `แบ่งเปิด ${v.bedrooms} ห้องนอน`)
                  const label = `${name} — ${vName}`
                  return (
                    <Card key={v.id} className="overflow-hidden">
                      <div className="border-b border-gray-100 px-4 pb-3 pt-4">
                        {/* Variant-type chip (replaces the ribbon over the image) */}
                        <div className="mb-2">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white',
                              isDef ? 'bg-brand-600' : 'bg-red-500',
                            )}
                          >
                            <Icon name={isDef ? 'home' : 'bed'} className="size-2.5" />
                            {isDef ? 'เปิดทั้งหลัง' : 'แบ่งเปิด'}
                          </span>
                        </div>
                        <h3 className={cn('text-base font-bold', isDef ? 'text-brand-700' : 'text-red-600')}>
                          {vName}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-xs font-medium text-gray-800">
                          <span className="inline-flex items-center gap-1">
                            <Icon name="bed" className="size-3 text-gray-600" />
                            <span className="font-semibold text-gray-900">{v.bedrooms}</span> ห้องนอน
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Icon name="users" className="size-3 text-gray-600" />
                            สำหรับ <span className="font-semibold text-gray-900">{v.maxGuests}</span> ท่าน
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <MiniCalendar
                          variantId={v.id}
                          showPriceModeToggle={false}
                          bookingWindowMonths={property?.bookingWindowMonths}
                          partnerListing={property?.partnerListing ?? false}
                          isSplitVariant={!isDef}
                          hideCustomerName={readOnly}
                          hidePrices={hidePrices}
                          initialPriceMode={initialPriceMode}
                          onCellClick={
                            readOnly ? undefined : (date) => setModal({ variantId: v.id, label, date })
                          }
                        />
                      </div>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* BookingModal only mounted when NOT in read-only mode */}
      {!readOnly && (
        <BookingModal
          open={!!modal}
          onClose={() => setModal(null)}
          variantId={modal?.variantId ?? null}
          variantLabel={modal?.label ?? ''}
          initialDate={modal?.date ?? null}
        />
      )}
    </>
  )
}
