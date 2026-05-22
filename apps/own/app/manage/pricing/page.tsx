'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Button, Card, Icon, cn } from '@pms/ui'
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
  // Shared "ราคาขาย / ส่ง Agent" mode across all property cards (replaces per-table toggle)
  const [priceMode, setPriceMode] = useState<'sell' | 'agent'>('sell')
  // Right-sliding panel for the split-room pricing view (Layout 1 pill click)
  const [splitPanel, setSplitPanel] = useState<{ propertyId: string } | null>(null)
  // Property-level weekly rate modal — opened from header button (Layout 2/3),
  // shows tabs for ALL variants (เหมาหลัง + แบ่งเปิดห้องนอน) in one place
  const [propertyRateFor, setPropertyRateFor] = useState<string | null>(null)

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
            onClick={() => setPriceMode('sell')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-semibold transition-all',
              priceMode === 'sell' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            ราคาขาย
          </button>
          <button
            type="button"
            onClick={() => setPriceMode('agent')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-semibold transition-all',
              priceMode === 'agent' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700',
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
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="ปรับราคา"
        description="ตั้งค่าราคาเริ่มต้นรายวันของสัปดาห์ — สามารถ override รายวันได้จากปฏิทิน"
      >
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {properties.map((p) => {
            const name = (p.name as { th?: string })?.th ?? p.code
            const cover = p.images[0]?.url
            const defaultVariant = p.variants.find((v) => v.isDefault)
            if (!defaultVariant) return null
            const varName =
              (defaultVariant.name as { th?: string })?.th ?? `${defaultVariant.bedrooms} ห้องนอน`
            return (
              <div key={p.id} className="flex flex-col">
                {/* Split-room pill — clickable, opens the split-calendar view for this property */}
                {p.variants.length > 1 && (
                  <div className="flex justify-end">
                    <SplitRoomBadge
                      count={p.variants.length}
                      onClick={() => setSplitPanel({ propertyId: p.id })}
                    />
                  </div>
                )}
                <Card hover>
                {/* Cover image — padded inside the card on all sides */}
                <div className="p-3">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-brand-300">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={name} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-white/60">
                        <Icon name="home" className="size-12" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 px-5 pb-5 pt-2">
                  <div>
                    <h3 className="truncate font-semibold text-gray-900">{name}</h3>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10.5px]">{p.code}</code>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Icon name="bed" className="size-3 text-gray-400" /> {defaultVariant.bedrooms}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Icon name="users" className="size-3 text-gray-400" /> {defaultVariant.maxGuests}
                      </span>
                    </div>
                  </div>

                  {/* Single rate button — opens PropertyWeeklyPricingModal with tabs for ALL variants
                      (เหมาหลัง + แบ่งเปิดห้องนอน) just like Layout 2/3 header */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setPropertyRateFor(p.id)}
                  >
                    <Icon name="gear" className="size-4" />
                    ตั้งค่าราคา
                  </Button>

                  <MiniCalendar
                    variantId={defaultVariant.id}
                    onCellClick={(date) => openDayEdit(p, defaultVariant.id, date)}
                  />

                  {p.variants.length > 1 && (
                    <div className="space-y-1.5 border-t border-gray-100 pt-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        แบบแบ่งห้อง
                      </div>
                      {p.variants
                        .filter((v) => !v.isDefault)
                        .map((v) => {
                          const vName = (v.name as { th?: string })?.th ?? `${v.bedrooms} ห้องนอน`
                          return (
                            <div
                              key={v.id}
                              className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm text-gray-700"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <Icon name="bed" className="size-3.5 text-gray-400" />
                                {vName}
                              </span>
                              <span className="text-[10.5px] text-gray-400">
                                {v.maxGuests} ท่าน
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* Layout 2 — days as rows, variants as columns */}
      {layout === 2 && (
        <div className="space-y-5">
          {properties.map((p) => {
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
                  actions={propertyActions(p.id, defaultVariant.id, `${name} — ${varName}`, p.partnerListing, defaultVariant.maxGuests)}
                />
                <div className="p-4 pt-0">
                  <PriceTableVertical
                    propertyId={p.id}
                    priceMode={priceMode}
                    onCellClick={(variantId, date) => openDayEdit(p, variantId, date)}
                  />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Layout 3 — variants as rows, days as horizontal columns.
          Keeps the toggle inside the table (its original position) — only Layout 2 lifts it to actions. */}
      {layout === 3 && (
        <div className="space-y-5">
          {properties.map((p) => {
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
                />
                <div className="p-4 pt-0">
                  <PriceTableHorizontal
                    propertyId={p.id}
                    onCellClick={(variantId, date) => openDayEdit(p, variantId, date)}
                  />
                </div>
              </Card>
            )
          })}
        </div>
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
