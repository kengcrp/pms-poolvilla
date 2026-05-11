'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card } from '@pms/ui'

const reviewStatusLabel: Record<string, { label: string; variant: 'pending' | 'success' | 'danger' | 'default' }> = {
  PENDING: { label: 'รอการตรวจสอบ', variant: 'pending' },
  ACTIVE: { label: 'เปิดใช้งาน', variant: 'success' },
  INACTIVE: { label: 'ปิดใช้งาน', variant: 'default' },
  REJECTED: { label: 'ปฏิเสธ', variant: 'danger' },
}

const typeLabel: Record<string, string> = {
  POOL_VILLA: 'พูลวิลล่า',
  LOFT: 'ลอฟ',
  BNB: 'B&B',
}

export default function ListingsPage() {
  const { data, isPending, error } = trpc.property.list.useQuery()

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ลิสติ้งที่พัก</h1>
          <p className="mt-1 text-sm text-gray-600">
            {isPending ? 'กำลังโหลด...' : `ทั้งหมด ${data?.length ?? 0} รายการ`}
          </p>
        </div>
        <Link href="/manage/listings/new">
          <Button size="md">+ เพิ่มที่พัก</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">เกิดข้อผิดพลาด: {error.message}</div>
      )}

      {!isPending && data && data.length === 0 && (
        <Card className="p-10 text-center">
          <div className="mx-auto mb-3 text-4xl">🏡</div>
          <h3 className="text-base font-semibold text-gray-900">ยังไม่มีที่พัก</h3>
          <p className="mt-1 text-sm text-gray-600">เริ่มเพิ่มที่พักหลังแรกของคุณ</p>
          <Link href="/manage/listings/new" className="mt-4 inline-block">
            <Button size="md">+ เพิ่มที่พักหลังแรก</Button>
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((p) => {
          const name = (p.name as { th?: string })?.th ?? p.code
          const status = reviewStatusLabel[p.reviewStatus] ?? reviewStatusLabel.PENDING!
          const cover = p.images[0]?.url
          return (
            <Card key={p.id} className="overflow-hidden">
              <div className="relative aspect-[16/10] bg-gray-100">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt={name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-4xl text-gray-300">🏠</div>
                )}
                {p.location?.location && (
                  <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-gray-700 backdrop-blur">
                    📍 {p.location.location.name}
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant={status.variant} dot>
                    {status.label}
                  </Badge>
                  {!p.isActive && <Badge variant="default">หยุดให้บริการ</Badge>}
                </div>
                <h3 className="text-base font-semibold text-gray-900">{name}</h3>
                <div className="mt-1 text-xs text-gray-500">
                  {p.code} · {typeLabel[p.type] ?? p.type}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                  <span>🛏 {p.totalBedrooms} ห้องนอน</span>
                  <span>🛁 {p.totalBathrooms} ห้องน้ำ</span>
                  {p.variants.length > 1 && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                      แบ่งห้อง {p.variants.length} แบบ
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/manage/listings/${p.id}/edit`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      แก้ไขข้อมูล
                    </Button>
                  </Link>
                  <Link href={`/manage/calendar?property=${p.id}`} className="flex-1">
                    <Button size="sm" className="w-full">
                      ดูปฏิทิน
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
