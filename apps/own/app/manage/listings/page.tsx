'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Icon } from '@pms/ui'

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
  const properties = data?.properties ?? []
  const slug = data?.ownerSaleSlug

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">ลิสติ้งที่พัก</h1>
          <p className="mt-1 text-sm text-gray-600">
            {isPending ? 'กำลังโหลด...' : `ที่พักทั้งหมด ${properties.length} รายการ`}
          </p>
        </div>
        <Link href="/manage/listings/new">
          <Button>
            <Icon name="plus" className="size-3.5" />
            เพิ่มที่พัก
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          เกิดข้อผิดพลาด: {error.message}
        </div>
      )}

      {!isPending && properties.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-400">
            <Icon name="home" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">ยังไม่มีที่พัก</h3>
          <p className="mt-1 text-sm text-gray-500">เริ่มต้นเพิ่มที่พักหลังแรกของคุณ</p>
          <Link href="/manage/listings/new" className="mt-5">
            <Button>
              <Icon name="plus" className="size-3.5" /> เพิ่มที่พักหลังแรก
            </Button>
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {properties.map((p) => {
          const name = (p.name as { th?: string })?.th ?? p.code
          const status = reviewStatusLabel[p.reviewStatus] ?? reviewStatusLabel.PENDING!
          const cover = p.images[0]?.url
          return (
            <Card key={p.id} hover className="overflow-hidden">
              <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-200">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt={name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-5xl text-gray-300">
                    <Icon name="home" />
                  </div>
                )}
                {p.location?.location && (
                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm backdrop-blur">
                    <Icon name="pin" className="size-3 text-brand-600" />
                    {p.location.location.name}
                  </div>
                )}
                <div className="absolute right-3 top-3">
                  <Badge variant={status.variant} dot>
                    {status.label}
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-gray-900">{name}</h3>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10.5px]">{p.code}</code>
                      <span>·</span>
                      <span>{typeLabel[p.type] ?? p.type}</span>
                    </div>
                  </div>
                  {!p.isActive && <Badge variant="default">หยุดให้บริการ</Badge>}
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Icon name="bed" className="size-3 text-gray-400" /> {p.totalBedrooms} ห้องนอน
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon name="bath" className="size-3 text-gray-400" /> {p.totalBathrooms} ห้องน้ำ
                  </span>
                  {p.variants.length > 1 && (
                    <Badge variant="brand" className="ml-auto">
                      แบ่ง {p.variants.length}
                    </Badge>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Link href={`/manage/listings/${p.id}/edit`}>
                    <Button variant="secondary" size="sm" className="w-full">
                      แก้ไข
                    </Button>
                  </Link>
                  <Link href={`/manage/calendar?property=${p.id}`}>
                    <Button size="sm" className="w-full">
                      ปฏิทิน
                    </Button>
                  </Link>
                  {slug && p.reviewStatus === 'ACTIVE' && p.isActive ? (
                    <a
                      href={`/sale/${slug}/${p.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        ดูที่พัก
                        <Icon name="external" className="size-3" />
                      </Button>
                    </a>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full opacity-50"
                      disabled
                      title={
                        !p.isActive
                          ? 'หยุดให้บริการ'
                          : p.reviewStatus !== 'ACTIVE'
                            ? 'ยังไม่เผยแพร่'
                            : 'ยังไม่ได้ตั้ง slug'
                      }
                    >
                      ดูที่พัก
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
