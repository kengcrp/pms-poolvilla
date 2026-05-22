'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Card, Icon, cn } from '@pms/ui'
import { MiniCalendar } from '@/components/MiniCalendar'
import { BookingModal } from '@/components/BookingModal'
import { StatusLegend } from '@/components/StatusLegend'

export default function SplitCalendarPage() {
  const params = useParams<{ propertyId: string }>()
  const { data: property, isPending } = trpc.property.byId.useQuery(
    { id: params.propertyId },
    { enabled: !!params.propertyId },
  )
  const [modal, setModal] = useState<{ variantId: string; label: string; date: Date } | null>(null)

  if (isPending) {
    return <div className="mx-auto max-w-7xl text-sm text-gray-500">กำลังโหลด...</div>
  }
  if (!property) {
    return <div className="mx-auto max-w-7xl text-sm text-gray-500">ไม่พบที่พัก</div>
  }

  const name = (property.name as { th?: string })?.th ?? property.code
  // Split variants only (excludes the "เหมาหลัง" default variant which represents the whole property)
  const splitVariants = property.variants.filter((v) => !v.isDefault)

  return (
    <div className="mx-auto max-w-[100rem]">
      {/* Top bar — back link + extended legend */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/manage/calendar"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <Icon name="chevronLeft" className="size-3.5" />
          กลับ
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <StatusLegend />
          {/* "ไม่แบ่งห้อง" chip — date locked because parent property is booked/blocked */}
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300">
            <Icon name="lock" className="size-3 text-gray-500" />
            ไม่แบ่งห้อง
          </span>
        </div>
      </div>

      {/* Property name */}
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

      {/* Variant grid — each split-variant as its own calendar card */}
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
              <div className="p-4">
                <MiniCalendar
                  variantId={v.id}
                  showPriceModeToggle={false}
                  bookingWindowMonths={property.bookingWindowMonths}
                  isSplitVariant
                  onCellClick={(date) => setModal({ variantId: v.id, label, date })}
                />
              </div>
            </Card>
          )
        })}
      </div>

      <BookingModal
        open={!!modal}
        onClose={() => setModal(null)}
        variantId={modal?.variantId ?? null}
        variantLabel={modal?.label ?? ''}
        initialDate={modal?.date ?? null}
      />
    </div>
  )
}
