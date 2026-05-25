'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Button, Card, Icon, Input, cn } from '@pms/ui'
import { MiniCalendar } from '@/components/MiniCalendar'
import { PriceTableVertical } from '@/components/PriceTableVertical'
import { PriceTableHorizontal } from '@/components/PriceTableHorizontal'
import { WeeklyPricingModal } from '@/components/WeeklyPricingModal'
import { PropertyWeeklyPricingModal } from '@/components/PropertyWeeklyPricingModal'
import { DayPriceModal } from '@/components/DayPriceModal'
import { PageHeader } from '@/components/PageHeader'
import { StatusLegend } from '@/components/StatusLegend'
import { SplitRoomBadge } from '@/components/SplitRoomBadge'
import { SplitPricingPanel } from '@/components/SplitPricingPanel'
import { LayoutSwitcher, type Layout } from '@/components/LayoutSwitcher'
import { PropertyHeaderRow } from '@/components/PropertyHeaderRow'
import { PropertyPickerCard } from '@/components/PropertyPickerCard'
import { useLocalStorageState } from '@/lib/use-local-storage-state'

export default function PricingPage() {
  const { data, isPending } = trpc.property.list.useQuery()
  const properties = data?.properties ?? []
  // Shared layout key with the ปฏิทิน page — switching here also affects calendar (and vice versa)
  const [layout, setLayout] = useLocalStorageState<Layout>('pms.layout', 1)
  const [editing, setEditing] = useState<{
    variantId: string
    name: string
    maxGuests: number
    partnerListing: boolean
    isDefault: boolean
  } | null>(null)
  // Day-price modal — opens when user clicks a date cell in any layout
  const [dayEdit, setDayEdit] = useState<{ variantId: string; name: string; date: Date } | null>(null)
  // Price mode kept PER PROPERTY so each card's toggle works independently
  const [priceModeByProperty, setPriceModeByProperty] = useState<Record<string, 'sell' | 'agent'>>({})
  const getPriceMode = (id: string): 'sell' | 'agent' => priceModeByProperty[id] ?? 'sell'
  const setPriceMode = (id: string, mode: 'sell' | 'agent') =>
    setPriceModeByProperty((prev) => ({ ...prev, [id]: mode }))
  // Right-sliding panel for the split-room pricing view (Layout 1 pill click)
  const [splitPanel, setSplitPanel] = useState<{ propertyId: string } | null>(null)
  // Property-level weekly rate modal — opened from header button (Layout 2/3),
  // shows tabs for ALL variants (เหมาหลัง + แบ่งเปิดห้องนอน) in one place
  const [propertyRateFor, setPropertyRateFor] = useState<string | null>(null)
  // Layout-2 only: single-property view + a thumbnail picker on the left to switch.
  // Mirrors the calendar page Layout 2 UX (no scrolling through every property).
  const [pickedId, setPickedId] = useState<string | null>(null)
  useEffect(() => {
    if (!pickedId && properties[0]) setPickedId(properties[0].id)
  }, [properties, pickedId])
  const pickedProperty = properties.find((p) => p.id === pickedId) ?? null

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

  /** Shared helper — build modal payload from a property+variant click. */
  const openDayEdit = (
    p: (typeof properties)[number],
    variantId: string,
    date: Date,
  ) => {
    const name = (p.name as { th?: string })?.th ?? p.code
    const v = p.variants.find((x) => x.id === variantId)
    const vName = v ? ((v.name as { th?: string })?.th ?? `${v.bedrooms} ห้องนอน`) : ''
    setDayEdit({ variantId, name: `${name} — ${vName}`, date })
  }

  /** Actions slot for PropertyHeaderRow in Layout 2/3 — gear button stacked above the price toggle.
   *  Opens the property-wide weekly-rate modal (tabs for เหมาหลัง + แบ่งห้องนอน).
   *  The "ส่ง Agent" option only appears when the property has `partnerListing` enabled. */
  const propertyActions = (
    propertyId: string,
    _variantId: string,
    _displayName: string,
    partnerListing: boolean,
    _maxGuests: number,
  ) => (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setPropertyRateFor(propertyId)}
      >
        <Icon name="gear" className="size-4" /> ตั้งค่าราคา
      </Button>
      {partnerListing && (
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setPriceMode(propertyId, 'sell')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-semibold transition-all',
              getPriceMode(propertyId) === 'sell' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            ราคาขาย
          </button>
          <button
            type="button"
            onClick={() => setPriceMode(propertyId, 'agent')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-semibold transition-all',
              getPriceMode(propertyId) === 'agent' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700',
            )}
            title="ราคาสำหรับ Agent (ฟีเจอร์เต็มอยู่ใน roadmap)"
          >
            ส่ง Agent
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="mx-auto max-w-[110rem]">
      <PageHeader title="ปรับราคา">
        <LayoutSwitcher value={layout} onChange={setLayout} />
      </PageHeader>

      <div className="mb-4">
        <StatusLegend />
      </div>

      {isPending && <div className="text-sm text-gray-500">กำลังโหลด...</div>}

      {!isPending && properties.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-400">
            <Icon name="money" />
          </div>
          <p className="text-sm text-gray-600">ยังไม่มีที่พัก — สร้างที่พักก่อนเพื่อกำหนดราคา</p>
          <Link href="/manage/listings/new" className="mt-4">
            <Button>+ เพิ่มที่พัก</Button>
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
            const varName =
              (defaultVariant.name as { th?: string })?.th ?? `${defaultVariant.bedrooms} ห้องนอน`
            return (
              <div key={p.id} className="flex h-full flex-col">
                {/* Split-room pill — clickable, opens the split-calendar view for this property.
                    Invisible placeholder reserves space for single-variant properties so
                    card tops align across the grid. */}
                <div className="flex justify-end">
                  {p.variants.length > 1 ? (
                    <SplitRoomBadge
                      count={p.variants.length}
                      onClick={() => setSplitPanel({ propertyId: p.id })}
                    />
                  ) : (
                    <div className="invisible" aria-hidden>
                      <SplitRoomBadge count={1} />
                    </div>
                  )}
                </div>
                <Card hover className="flex h-full flex-col">
                {/* Cover image — compact landscape banner (aspect 16/7).
                    Name overlays the bottom-left as a frosted dark chip. */}
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
                    {/* Name overlay — frosted dark chip anchored to bottom-left of the
                        image for high-contrast readability against any cover photo. */}
                    <div className="pointer-events-none absolute bottom-2 left-2 right-2">
                      <h3 className="inline-block max-w-full truncate rounded-md bg-black/65 px-2.5 py-1 text-sm font-semibold leading-tight text-white shadow-md ring-1 ring-inset ring-white/10 backdrop-blur-md">
                        {name}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 px-3 pb-3 pt-1">
                  {/* Meta row + ตั้งค่าราคา on the right */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                      {/* Show only the trailing number (strip the "CITY-" prefix) */}
                      <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">{p.code.replace(/^[^-]+-/, '')}</code>
                      <span className="text-gray-300">·</span>
                      <span className="inline-flex items-center gap-1 text-gray-900">
                        <Icon name="bed" className="size-3.5 text-gray-600" />
                        <span className="font-semibold">{defaultVariant.bedrooms}</span>
                        <span className="font-medium text-gray-700">นอน</span>
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="inline-flex items-center gap-1 text-gray-900">
                        <Icon name="users" className="size-3.5 text-gray-600" />
                        <span className="font-semibold">{defaultVariant.maxGuests}</span>
                        <span className="font-medium text-gray-700">ท่าน</span>
                      </span>
                    </div>
                    {/* ตั้งค่าราคา pill — white card-style button matching the design mockup
                        (border + shadow, dark text/icon, rounded-full) */}
                    <button
                      type="button"
                      onClick={() => setPropertyRateFor(p.id)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-900 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow"
                      title="ตั้งค่าราคา"
                    >
                      <Icon name="gear" className="size-3.5 text-gray-700" />
                      ตั้งค่าราคา
                    </button>
                  </div>

                  {/* ราคาขาย / ราคาส่ง toggle — centered row.
                      Sized to roughly match the month-nav pill width below so they line up
                      visually. Always rendered (invisible placeholder when no partnerListing)
                      so card heights match across the grid. */}
                  <div className="flex justify-center" aria-hidden={!p.partnerListing}>
                    <div
                      className={cn(
                        'inline-flex w-[220px] rounded-full bg-gray-100 p-1 shadow-inner',
                        !p.partnerListing && 'invisible',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => p.partnerListing && setPriceMode(p.id, 'sell')}
                        tabIndex={p.partnerListing ? 0 : -1}
                        className={cn(
                          'flex-1 rounded-full py-1 text-xs font-semibold transition-all',
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
                          'flex-1 rounded-full py-1 text-xs font-semibold transition-all',
                          getPriceMode(p.id) === 'agent'
                            ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                            : 'text-gray-500 hover:text-gray-700',
                        )}
                      >
                        ราคาส่ง
                      </button>
                    </div>
                  </div>

                  <MiniCalendar
                    variantId={defaultVariant.id}
                    partnerListing={p.partnerListing}
                    priceMode={getPriceMode(p.id)}
                    dense
                    onCellClick={(date) => openDayEdit(p, defaultVariant.id, date)}
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

      {/* Layout 2 — single property at a time, switched via a vertical thumbnail picker on
          the LEFT (same UX as the calendar page Layout 2). Property name + actions sit
          inside the price table card so everything for the active property is grouped. */}
      {layout === 2 && pickedProperty && (() => {
        const p = pickedProperty
        const name = (p.name as { th?: string })?.th ?? p.code
        const defaultVariant = p.variants.find((v) => v.isDefault)
        if (!defaultVariant) return null
        const varName =
          (defaultVariant.name as { th?: string })?.th ?? `${defaultVariant.bedrooms} ห้องนอน`
        return (
          <div>
            <div className="mb-3 text-sm text-gray-500">ทั้งหมด {properties.length} รายการ</div>
            {/* items-start so the sticky picker doesn't get stretched to match the
                right card — required for sticky to pin while the price table scrolls. */}
            <div className="flex items-start gap-4">
              <PropertyPickerCard
                properties={properties}
                selectedId={pickedId}
                onSelect={setPickedId}
              />

              <div className="min-w-0 flex-1">
                <Card className="overflow-hidden">
                  {/* Property name header — name+code on the left, ตั้งค่าราคา on the right.
                      The ราคาขาย / ราคาส่ง toggle lives INSIDE PriceTableVertical (top-left
                      above the table) — same placement as the calendar page Layout 2. */}
                  <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-1">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold leading-tight tracking-tight text-gray-900">
                        {name}
                      </h2>
                      <code className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10.5px] text-gray-600">
                        {p.code}
                      </code>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPropertyRateFor(p.id)}
                    >
                      <Icon name="gear" className="size-4" /> ตั้งค่าราคา
                    </Button>
                  </div>
                  <div className="p-4">
                    <PriceTableVertical
                      propertyId={p.id}
                      onCellClick={(variantId, date) => openDayEdit(p, variantId, date)}
                    />
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Layout 3 — variants as rows, days as horizontal columns.
          Keeps the toggle inside the table (its original position) — only Layout 2 lifts it to actions. */}
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
            const defaultVariant = p.variants.find((v) => v.isDefault)
            if (!defaultVariant) return null
            const varName =
              (defaultVariant.name as { th?: string })?.th ?? `${defaultVariant.bedrooms} ห้องนอน`
            return (
              <Card key={p.id} className="overflow-hidden">
                <PropertyHeaderRow
                  property={p}
                  name={name}
                  cover={cover}
                  actions={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPropertyRateFor(p.id)}
                    >
                      <Icon name="gear" className="size-4" /> ตั้งค่าราคา
                    </Button>
                  }
                  belowImage={
                    p.partnerListing && (
                      <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
                        <button
                          type="button"
                          onClick={() => setPriceMode(p.id, 'sell')}
                          className={cn(
                            'rounded-full px-4 py-1 text-xs font-semibold transition-all',
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
                            'rounded-full px-4 py-1 text-xs font-semibold transition-all',
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
                    onCellClick={(variantId, date) => openDayEdit(p, variantId, date)}
                  />
                </div>
              </Card>
            )
          })}
        </div>
          )}
        </>
      )}

      <WeeklyPricingModal
        open={!!editing}
        onClose={() => setEditing(null)}
        variantId={editing?.variantId ?? null}
        variantName={editing?.name ?? ''}
        initialMaxGuests={editing?.maxGuests ?? 1}
        partnerListing={editing?.partnerListing ?? false}
        isDefault={editing?.isDefault ?? false}
      />

      <DayPriceModal
        open={!!dayEdit}
        onClose={() => setDayEdit(null)}
        variantId={dayEdit?.variantId ?? null}
        variantLabel={dayEdit?.name ?? ''}
        initialDate={dayEdit?.date ?? null}
      />

      <SplitPricingPanel
        open={!!splitPanel}
        onClose={() => setSplitPanel(null)}
        propertyId={splitPanel?.propertyId ?? null}
      />

      <PropertyWeeklyPricingModal
        open={!!propertyRateFor}
        onClose={() => setPropertyRateFor(null)}
        propertyId={propertyRateFor}
      />
    </div>
  )
}
