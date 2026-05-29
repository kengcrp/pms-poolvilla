'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Button, Card, Icon, Input, cn } from '@pms/ui'
import { MiniCalendar } from '@/components/MiniCalendar'
import { PriceTableVertical } from '@/components/PriceTableVertical'
import { PriceTableHorizontal } from '@/components/PriceTableHorizontal'
import { BookingModal } from '@/components/BookingModal'
import { PageHeader } from '@/components/PageHeader'
import { StatusLegend } from '@/components/StatusLegend'
import { SplitRoomBadge } from '@/components/SplitRoomBadge'
import { SplitCalendarPanel } from '@/components/SplitCalendarPanel'
import { LayoutSwitcher, type Layout } from '@/components/LayoutSwitcher'
import { PropertyHeaderRow } from '@/components/PropertyHeaderRow'
import { PropertyPickerCard } from '@/components/PropertyPickerCard'
import { useLocalStorageState } from '@/lib/use-local-storage-state'

export default function CalendarPage() {
  const { data, isPending } = trpc.property.list.useQuery()
  const properties = data?.properties ?? []
  // Persist layout choice across refresh / navigation
  // Shared layout key with the ปรับราคา page — choice persists across both menus
  const [layout, setLayout] = useLocalStorageState<Layout>('pms.layout', 1)
  const [modal, setModal] = useState<{ variantId: string; label: string; date: Date } | null>(null)
  // Layout-1 only: clicking "แบ่งห้อง N ›" pill opens a right-sliding panel instead of navigating
  const [splitPanel, setSplitPanel] = useState<{ propertyId: string } | null>(null)
  // Search (shared by Layout 1 + Layout 3) — filter property grid by name or code
  const [search, setSearch] = useState('')
  const filteredProperties = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return properties
    return properties.filter((p) => {
      const name = ((p.name as { th?: string })?.th ?? '').toLowerCase()
      return name.includes(q) || p.code.toLowerCase().includes(q)
    })
  }, [properties, search])
  // Price mode kept PER PROPERTY (Layout 1 + 3) so flipping the toggle on one card
  // doesn't affect the others. Default 'sell' when no entry exists.
  const [priceModeByProperty, setPriceModeByProperty] = useState<Record<string, 'sell' | 'agent'>>({})
  const getPriceMode = (id: string): 'sell' | 'agent' => priceModeByProperty[id] ?? 'sell'
  const setPriceMode = (id: string, mode: 'sell' | 'agent') =>
    setPriceModeByProperty((prev) => ({ ...prev, [id]: mode }))
  // Layout-2 only: single-property view + a dropdown to switch (instead of scrolling through all)
  const [pickedId, setPickedId] = useState<string | null>(null)
  // Default to the first property once data loads, but don't override a manual pick
  useEffect(() => {
    if (!pickedId && properties[0]) setPickedId(properties[0].id)
  }, [properties, pickedId])
  const pickedProperty = properties.find((p) => p.id === pickedId) ?? null

  return (
    <div className="mx-auto max-w-[110rem]">
      <PageHeader title="ปฏิทิน">
        <LayoutSwitcher value={layout} onChange={setLayout} />
      </PageHeader>

      <div className="mb-4">
        <StatusLegend />
      </div>

      {isPending && <div className="text-sm text-gray-500">กำลังโหลด...</div>}

      {!isPending && properties.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-400">
            <Icon name="calendar" />
          </div>
          <p className="text-sm text-gray-600">ยังไม่มีที่พัก</p>
          <Link href="/manage/listings/new" className="mt-4">
            <Button>
              <Icon name="plus" className="size-3.5" /> เพิ่มที่พัก
            </Button>
          </Link>
        </Card>
      )}

      {/* Layout 1 — card grid with cover image + mini calendars */}
      {layout === 1 && (
        <>
          {/* Search bar — filters the grid by property name or code */}
          <div className="mb-4 flex items-center gap-2">
            <div className="relative max-w-md flex-1">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ / รหัสที่พัก"
                className="pl-9"
              />
            </div>
            <span className="text-sm text-gray-500">
              {search ? `พบ ${filteredProperties.length} / ${properties.length} รายการ` : `ทั้งหมด ${properties.length} รายการ`}
            </span>
          </div>

          {filteredProperties.length === 0 ? (
            <Card className="flex flex-col items-center p-12 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-400">
                <Icon name="search" />
              </div>
              <p className="text-sm text-gray-600">ไม่พบที่พักตามคำค้นหา</p>
            </Card>
          ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredProperties.map((p) => {
            const name = (p.name as { th?: string })?.th ?? p.code
            const cover = p.images[0]?.url
            const defaultVariant = p.variants.find((v) => v.isDefault)
            if (!defaultVariant) return null
            const defaultVarName =
              (defaultVariant.name as { th?: string })?.th ?? `${defaultVariant.bedrooms} ห้องนอน`
            // Determine if ALL split variants are fully Locked across every weekly DOW
            // → SplitRoomBadge becomes unclickable + shows lock icon
            const splitVariants = p.variants.filter((v) => !v.isDefault)
            const splitLocked =
              splitVariants.length > 0 &&
              splitVariants.every((v) => {
                const w = v.weeklyPricing ?? []
                // If weekly settings exist for the variant AND every row is splitOpen=false
                return w.length > 0 && w.every((row) => row.splitOpen === false)
              })
            return (
              <div key={p.id} className="flex h-full flex-col">
                {/* Split-room pill — opens a right-sliding panel for this property.
                    Always render the row (invisible placeholder when no split variants)
                    so card tops align across the grid. */}
                <div className="flex justify-end">
                  {p.variants.length > 1 ? (
                    <SplitRoomBadge
                      count={p.variants.length}
                      locked={splitLocked}
                      onClick={
                        splitLocked ? undefined : () => setSplitPanel({ propertyId: p.id })
                      }
                    />
                  ) : (
                    <div className="invisible" aria-hidden>
                      <SplitRoomBadge count={1} />
                    </div>
                  )}
                </div>
                <Card hover className="flex h-full flex-col">
                {/* Cover image — compact landscape banner (aspect 16/7) so the card stays
                    short enough to fit multiple properties per viewport.
                    Property name overlays the bottom-left as a frosted dark chip. */}
                <div className="p-2">
                  <div className="relative aspect-[16/7] overflow-hidden rounded-lg bg-gradient-to-br from-brand-100 to-brand-300">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={name} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-white/60">
                        <Icon name="home" className="size-9" />
                      </div>
                    )}
                    {/* Name overlay only — code chip removed per design preference. */}
                    <div className="pointer-events-none absolute bottom-2 left-2 right-2">
                      <h3 className="inline-block max-w-full truncate rounded-md bg-black/65 px-2.5 py-1 text-sm font-semibold leading-tight text-white shadow-md ring-1 ring-inset ring-white/10 backdrop-blur-md">
                        {name}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="px-3 pb-3 pt-1">
                  {/* Bed/guest stats + price toggle on the SAME row.
                      Stats sit left, toggle pinned right (justify-between).
                      Toggle is compact (auto width, smaller text) so it fits
                      alongside the stats without wrapping on narrow cards. */}
                  <div className="mb-3 flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-900">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="bed" className="size-3.5 text-gray-600" />
                        <span className="font-semibold">{defaultVariant.bedrooms}</span>
                        <span className="font-medium text-gray-700">นอน</span>
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Icon name="users" className="size-3.5 text-gray-600" />
                        <span className="font-semibold">{defaultVariant.maxGuests}</span>
                        <span className="font-medium text-gray-700">ท่าน</span>
                      </span>
                    </div>

                    {/* Compact toggle — pinned right. Invisible placeholder
                        when no partnerListing so row heights match. */}
                    <div
                      className={cn(
                        'inline-flex shrink-0 rounded-full bg-gray-100 p-0.5 shadow-inner',
                        !p.partnerListing && 'invisible',
                      )}
                      aria-hidden={!p.partnerListing}
                    >
                      <button
                        type="button"
                        onClick={() => p.partnerListing && setPriceMode(p.id, 'sell')}
                        tabIndex={p.partnerListing ? 0 : -1}
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all',
                          getPriceMode(p.id) === 'sell'
                            ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                            : 'text-gray-500 hover:text-gray-700',
                        )}
                      >
                        ราคาขาย
                      </button>
                      <button
                        type="button"
                        onClick={() => p.partnerListing && setPriceMode(p.id, 'agent')}
                        tabIndex={p.partnerListing ? 0 : -1}
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all',
                          getPriceMode(p.id) === 'agent'
                            ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                            : 'text-gray-500 hover:text-gray-700',
                        )}
                      >
                        ราคาส่ง
                      </button>
                    </div>
                  </div>

                  {/* Default-variant calendar only — split-variant calendars live on the dedicated split page
                      (reachable via the "แบ่งห้อง N" pill above this card). */}
                  <MiniCalendar
                    variantId={defaultVariant.id}
                    bookingWindowMonths={p.bookingWindowMonths}
                    partnerListing={p.partnerListing}
                    priceMode={getPriceMode(p.id)}
                    dense
                    onCellClick={(date) =>
                      setModal({ variantId: defaultVariant.id, label: `${name} — ${defaultVarName}`, date })
                    }
                  />
                </div>
              </Card>
              </div>
            )
          })}
        </div>
          )}
        </>
      )}

      {/* Layout 2 — one property at a time, switched via a vertical thumbnail strip
          (PropertyPickerCard) on the LEFT. Selected property's name + meta sits above the
          price table on the right. Fast at-a-glance property switching: recognize the cover
          image, click the thumbnail, the table swaps instantly. */}
      {layout === 2 && pickedProperty && (() => {
        const p = pickedProperty
        const name = (p.name as { th?: string })?.th ?? p.code
        return (
          <div>
            <div className="mb-3 text-sm text-gray-500">ทั้งหมด {properties.length} รายการ</div>
            {/* items-start so the sticky picker doesn't get stretched to match the
                right card height — required for `position: sticky` to actually pin
                while the calendar table scrolls. */}
            <div className="flex items-start gap-4">
              <PropertyPickerCard
                properties={properties}
                selectedId={pickedId}
                onSelect={setPickedId}
              />

              <div className="min-w-0 flex-1">
                <Card className="overflow-hidden">
                  {/* Property name header — inside the table card, no divider line below.
                      Code (CITY-XXX) sits underneath the name as a small mono chip. */}
                  <div className="px-4 pt-3 pb-1">
                    <h2 className="truncate text-lg font-bold leading-tight tracking-tight text-gray-900">
                      {name}
                    </h2>
                    {/* Code chip removed per design preference. */}
                  </div>

                  <div className="p-4">
                    <PriceTableVertical
                      propertyId={p.id}
                      onCellClick={(variantId, date) => {
                        const v = p.variants.find((x) => x.id === variantId)
                        const vName = v ? ((v.name as { th?: string })?.th ?? `${v.bedrooms} นอน`) : ''
                        setModal({ variantId, label: `${name} — ${vName}`, date })
                      }}
                    />
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Layout 3 — variants as rows, days as horizontal columns */}
      {layout === 3 && (
        <>
          {/* Search bar — shared with Layout 1 (search state persists when switching) */}
          <div className="mb-4 flex items-center gap-2">
            <div className="relative max-w-md flex-1">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ / รหัสที่พัก"
                className="pl-9"
              />
            </div>
            <span className="text-sm text-gray-500">
              {search ? `พบ ${filteredProperties.length} / ${properties.length} รายการ` : `ทั้งหมด ${properties.length} รายการ`}
            </span>
          </div>

          {filteredProperties.length === 0 ? (
            <Card className="flex flex-col items-center p-12 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-400">
                <Icon name="search" />
              </div>
              <p className="text-sm text-gray-600">ไม่พบที่พักตามคำค้นหา</p>
            </Card>
          ) : (
        <div className="space-y-5">
          {filteredProperties.map((p) => {
            const name = (p.name as { th?: string })?.th ?? p.code
            const cover = p.images[0]?.url
            return (
              <Card key={p.id} className="overflow-hidden">
                <PropertyHeaderRow
                  property={p}
                  name={name}
                  cover={cover}
                  belowName={
                    p.partnerListing && (
                      // Slight negative left margin so the pill's visual left edge
                      // (the bg padding) aligns with the property name's "H" above.
                      <div className="-ml-2 inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
                        <button
                          type="button"
                          onClick={() => setPriceMode(p.id, 'sell')}
                          className={cn(
                            'rounded-full px-5 py-1.5 text-sm font-semibold transition-all',
                            getPriceMode(p.id) === 'sell'
                              ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                              : 'text-gray-500 hover:text-gray-700',
                          )}
                        >
                          ราคาขาย
                        </button>
                        <button
                          type="button"
                          onClick={() => setPriceMode(p.id, 'agent')}
                          className={cn(
                            'rounded-full px-5 py-1.5 text-sm font-semibold transition-all',
                            getPriceMode(p.id) === 'agent'
                              ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                              : 'text-gray-500 hover:text-gray-700',
                          )}
                        >
                          ราคาส่ง
                        </button>
                      </div>
                    )
                  }
                />
                <div className="p-4 pt-0">
                  <PriceTableHorizontal
                    propertyId={p.id}
                    priceMode={getPriceMode(p.id)}
                    onCellClick={(variantId, date) => {
                      const v = p.variants.find((x) => x.id === variantId)
                      const vName = v ? ((v.name as { th?: string })?.th ?? `${v.bedrooms} นอน`) : ''
                      setModal({ variantId, label: `${name} — ${vName}`, date })
                    }}
                  />
                </div>
              </Card>
            )
          })}
        </div>
          )}
        </>
      )}

      <BookingModal
        open={!!modal}
        onClose={() => setModal(null)}
        variantId={modal?.variantId ?? null}
        variantLabel={modal?.label ?? ''}
        initialDate={modal?.date ?? null}
      />

      <SplitCalendarPanel
        open={!!splitPanel}
        onClose={() => setSplitPanel(null)}
        propertyId={splitPanel?.propertyId ?? null}
      />
    </div>
  )
}

