'use client'

import { use } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Icon } from '@pms/ui'

type Params = Promise<{ slug: string; code: string; bookingCode: string }>

const statusMap: Record<string, { label: string; variant: 'pending' | 'success' | 'info' | 'default' }> = {
  PENDING: { label: 'รอยืนยัน', variant: 'pending' },
  CONFIRMED: { label: 'ยืนยันแล้ว', variant: 'success' },
  COMPLETED: { label: 'เช็คเอาท์แล้ว', variant: 'info' },
  CANCELLED: { label: 'ยกเลิก', variant: 'default' },
}

export default function ConfirmPage({ params }: { params: Params }) {
  const { slug, code, bookingCode } = use(params)
  const { data: booking, isPending } = trpc.public.hotelBookingByCode.useQuery({ slug, bookingCode })

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Icon name="spinner" spin className="size-6 text-gray-400" />
      </div>
    )
  }
  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <Icon name="error" className="mx-auto mb-3 size-8 text-red-500" />
          <h1 className="text-lg font-semibold">ไม่พบการจอง</h1>
        </div>
      </div>
    )
  }

  const hotelName = (booking.hotel.name as { th?: string })?.th ?? booking.hotel.code
  const sb = statusMap[booking.status] ?? statusMap.PENDING!
  const nights = Math.max(
    1,
    Math.round((new Date(booking.checkout).getTime() - new Date(booking.checkin).getTime()) / 86_400_000),
  )

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Success */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-center text-white shadow-xl shadow-emerald-900/20">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <Icon name="success" className="size-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">จองสำเร็จ!</h1>
          <p className="mt-1 text-sm text-white/85">รหัสการจอง: <span className="font-mono font-semibold">{booking.code}</span></p>
        </div>

        {/* Status + summary */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-gray-500">สถานะ</div>
                <div className="mt-0.5"><Badge variant={sb.variant} dot>{sb.label}</Badge></div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider text-gray-500">ยอดรวม</div>
                <div className="text-xl font-bold text-gray-900 tabular-nums">฿{Number(booking.totalAmount).toLocaleString('th-TH')}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6">
            {/* Hotel */}
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon name="bed" className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-gray-900">{hotelName}</h2>
                <div className="mt-0.5 text-xs text-gray-500">
                  <code className="rounded bg-gray-100 px-1 py-0.5">{booking.hotel.code}</code>
                  {booking.hotel.address && <> · {booking.hotel.address}</>}
                </div>
                {booking.hotel.phone && (
                  <div className="mt-1 text-xs text-gray-600">
                    <Icon name="phone" className="mr-1 size-3" />ติดต่อโรงแรม: {booking.hotel.phone}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-4 text-sm">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-gray-500">เช็คอิน</div>
                <div className="mt-0.5 font-semibold text-gray-900">
                  {new Date(booking.checkin).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-gray-500">เช็คเอาท์</div>
                <div className="mt-0.5 font-semibold text-gray-900">
                  {new Date(booking.checkout).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-gray-500">จำนวนคืน</div>
                <div className="mt-0.5 font-semibold text-gray-900">{nights} คืน</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-gray-500">ผู้เข้าพัก</div>
                <div className="mt-0.5 font-semibold text-gray-900">{booking.guestCount} ท่าน</div>
              </div>
            </div>

            {/* Rooms */}
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-wider text-gray-500">ห้องที่จอง</div>
              <ul className="space-y-2">
                {booking.lines.map((l) => {
                  const name = (l.roomType.name as { th?: string })?.th ?? '—'
                  return (
                    <li key={l.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">{name}</div>
                        {l.roomType.bedConfig && (
                          <div className="text-[11px] text-gray-500">{l.roomType.bedConfig}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 tabular-nums">×{l.roomsReserved} ห้อง</div>
                        <div className="text-[11px] text-gray-500 tabular-nums">฿{Number(l.lineSubtotal).toLocaleString('th-TH')}</div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Customer */}
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-wider text-gray-500">ผู้จอง</div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <div className="font-medium text-gray-900">{booking.customerName}</div>
                <div className="text-xs text-gray-500">
                  {booking.customerPhone}
                  {booking.customerEmail && <> · {booking.customerEmail}</>}
                </div>
              </div>
            </div>

            {booking.publicNote && (
              <div>
                <div className="mb-2 text-[11px] uppercase tracking-wider text-gray-500">หมายเหตุ</div>
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
                  📝 {booking.publicNote}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next steps */}
        <div className="mt-5 rounded-2xl bg-blue-50 p-5 ring-1 ring-inset ring-blue-200">
          <div className="flex items-start gap-3">
            <Icon name="info" className="mt-0.5 size-5 shrink-0 text-blue-600" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold">ขั้นตอนถัดไป</p>
              <p className="mt-1 text-blue-800">
                การจองนี้อยู่ใน <span className="font-semibold">สถานะรอยืนยัน</span> ทางโรงแรมจะติดต่อกลับเพื่อยืนยันและแจ้งช่องทางชำระเงิน
                — กรุณาเก็บรหัสการจอง <span className="font-mono font-semibold">{booking.code}</span> ไว้ใช้อ้างอิง
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/hotel/${slug}/${code}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-brand-700">
            <Icon name="arrowLeft" className="size-3.5" /> กลับหน้าโรงแรม
          </Link>
          <Link href="/explore"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800">
            <Icon name="globe" className="size-3.5" /> ดูที่พักอื่นๆ
          </Link>
        </div>
      </div>
    </div>
  )
}
