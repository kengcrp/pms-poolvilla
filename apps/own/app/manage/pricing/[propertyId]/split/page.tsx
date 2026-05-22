'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button, Card, Icon, cn } from '@pms/ui'
import { MiniCalendar } from '@/components/MiniCalendar'
import { WeeklyPricingModal } from '@/components/WeeklyPricingModal'
import { DayPriceModal } from '@/components/DayPriceModal'
import { StatusLegend } from '@/components/StatusLegend'

/**
 * Per-variant price split-view — reached via the "แบ่งห้อง N" pill on the pricing page.
 * Same data as the calendar split view but the click target is the per-day price modal
 * (not the booking modal) and each variant gets a "ตั้งค่าราคา" weekly-rate button.
 */
export default function PricingSplitPage() {
  const params = useParams<{ propertyId: string }>()
  const { data: property, isPending } = trpc.property.byId.useQuery(
    { id: params.propertyId },
    { enabled: !!params.propertyId },
  )
  const [editing, setEditing] = useState<{
    variantId: string
    name: string
    maxGuests: number
    partnerListing: boolean
  } | null>(null)
  const [dayEdit, setDayEdit] = useState<{ variantId: string; name: string; date: Date } | null>(null)

  if (isPending) {
    return <div className="mx-auto max-w-7xl text-sm text-gray-500">กำลังโหลด...</div>
  }
  if (!property) {
    return <div className="mx-auto max-w-7xl text-sm text-gray-500">ไม่พบที่พัก</div>
  }

  const name = (property.name as { th?: string })?.th ?? property.code
  const splitVariants = property.variants.filter((v) => !v.isDefault)

  return (
    <div className="mx-auto max-w-[100rem]">
      {/* Top bar — back link + extended legend */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/manage/pricing"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <Icon name="chevronLeft" className="size-3.5" />
          กลับ
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <StatusLegend />
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300">
            <Icon name="lock" className="size-3 text-gray-500" />
            ไม่แบ่งห้อง
          </span>
        </div>
      </div>

      <h1 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">{name}</h1>

      {splitVariants.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-400">
            <Icon name="bed" />
          </div>
          <p className="text-sm text-gray-600">
            ที่พักนี้ยังไม่ได้กำหนดรูปแบบการแบ่งห้อง — สร้าง variant เพิ่มในหน้าลิสติ้งที่พัก
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {splitVariants.map((v) => {
          const vName = (v.name as { th?: string })?.th ?? `แบ่งเปิด ${v.bedrooms} ห้องนอน`
          const label = `${name} — ${vName}`
          return (
            <Card key={v.id} className="overflow-hidden">
              <div className="border-b border-gray-100 px-4 pb-3 pt-4">
                <h3 className={cn('text-base font-bold text-red-600')}>{vName}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <Icon name="users" className="size-3 text-gray-400" />
                  <span>สำหรับ {v.maxGuests} ท่าน</span>
                </div>
              </div>
              <div className="space-y-3 p-4">
                {/* Weekly-rate button — opens WeeklyPricingModal for THIS variant */}
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setEditing({
                        variantId: v.id,
                        name: label,
                        maxGuests: v.maxGuests,
                        partnerListing: property.partnerListing,
                      })
                    }
                  >
                    <Icon name="gear" className="size-4" />
                    ตั้งค่าราคา
                  </Button>
                </div>
                {/* Per-day price calendar — click cell opens DayPriceModal */}
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
    </div>
  )
}
