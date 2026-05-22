'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Button, Card, Icon, cn } from '@pms/ui'
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

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="ปฏิทิน"
        description="ภาพรวมการจองและสถานะที่พักทุกหลัง — คลิก cell เพื่อจอง/ดูรายละเอียด"
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {properties.map((p) => {
            const name = (p.name as { th?: string })?.th ?? p.code
            const cover = p.images[0]?.url
            const defaultVariant = p.variants.find((v) => v.isDefault)
            if (!defaultVariant) return null
            const defaultVarName =
              (defaultVariant.name as { th?: string })?.th ?? `${defaultVariant.bedrooms} ห้องนอน`
            return (
              <div key={p.id} className="flex flex-col">
                {/* Split-room pill — opens a right-sliding panel for this property */}
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

                <div className="px-5 pb-5 pt-2">
                  <div className="mb-3">
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

                  {/* Default-variant calendar only — split-variant calendars live on the dedicated split page
                      (reachable via the "แบ่งห้อง N" pill above this card). */}
                  <MiniCalendar
                    variantId={defaultVariant.id}
                    bookingWindowMonths={p.bookingWindowMonths}
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

      {/* Layout 2 — days as rows, variants as columns */}
      {layout === 2 && (
        <div className="space-y-5">
          {properties.map((p) => {
            const name = (p.name as { th?: string })?.th ?? p.code
            const cover = p.images[0]?.url
            return (
              <Card key={p.id} className="overflow-hidden">
                <PropertyHeaderRow property={p} name={name} cover={cover} />
                <div className="p-4 pt-0">
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
            )
          })}
        </div>
      )}

      {/* Layout 3 — variants as rows, days as horizontal columns */}
      {layout === 3 && (
        <div className="space-y-5">
          {properties.map((p) => {
            const name = (p.name as { th?: string })?.th ?? p.code
            const cover = p.images[0]?.url
            return (
              <Card key={p.id} className="overflow-hidden">
                <PropertyHeaderRow property={p} name={name} cover={cover} />
                <div className="p-4 pt-0">
                  <PriceTableHorizontal
                    propertyId={p.id}
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

