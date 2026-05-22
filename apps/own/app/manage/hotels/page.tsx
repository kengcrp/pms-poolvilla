'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'

export default function HotelsPage() {
  const utils = trpc.useUtils()
  const { data: hotels, isPending } = trpc.hotel.list.useQuery()
  const { data: types } = trpc.hotel.types.useQuery()

  const setActive = trpc.hotel.setActive.useMutation({
    onSuccess: () => utils.hotel.list.invalidate(),
    onError: (e) => alert(e.message),
  })
  const del = trpc.hotel.delete.useMutation({
    onSuccess: () => utils.hotel.list.invalidate(),
    onError: (e) => alert(e.message),
  })

  const items = hotels ?? []

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="โรงแรม" description="จัดการโรงแรม + ประเภทห้อง + การจอง (count-based inventory)">
        <Link href="/manage/hotels/new">
          <Button>
            <Icon name="plus" className="size-3.5" />
            เพิ่มโรงแรม
          </Button>
        </Link>
      </PageHeader>

      {isPending && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          กำลังโหลด...
        </div>
      )}

      {!isPending && items.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon name="bed" className="size-5" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">ยังไม่มีโรงแรม</h3>
          <p className="mt-1 text-sm text-gray-500">เริ่มจากกดปุ่ม &quot;เพิ่มโรงแรม&quot; ด้านบน</p>
          <div className="mt-4">
            <Link href="/manage/hotels/new">
              <Button>
                <Icon name="plus" className="size-3.5" /> เพิ่มโรงแรมแรก
              </Button>
            </Link>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((h) => {
            const name = (h.name as { th?: string })?.th ?? h.code
            const typeLabel = (types ?? []).find((t) => t.code === h.hotelType)?.nameTh ?? h.hotelType
            return (
              <div
                key={h.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2 border-b border-gray-100 bg-gradient-to-br from-brand-50 to-white p-5">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/30">
                    <Icon name="bed" className="size-5" />
                  </div>
                  {h.isActive ? (
                    <Badge variant="success" dot>เปิดขาย</Badge>
                  ) : (
                    <Badge variant="default" dot>ปิด</Badge>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="truncate text-base font-bold text-gray-900">{name}</h3>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5">{h.code}</code>
                    <span>·</span>
                    <span>{typeLabel}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 px-3 py-2 text-center">
                    <div>
                      <div className="text-lg font-bold text-gray-900">{h._count.roomTypes}</div>
                      <div className="text-[10.5px] text-gray-500">ประเภทห้อง</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">{h._count.bookings}</div>
                      <div className="text-[10.5px] text-gray-500">การจอง</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5">
                    <Link href={`/manage/hotels/${h.id}/bookings`} className="flex-1">
                      <Button size="sm" className="w-full">
                        <Icon name="bookings" className="size-3" /> จอง
                      </Button>
                    </Link>
                    <Link href={`/manage/hotels/${h.id}/edit`}>
                      <Button size="sm" variant="outline">
                        <Icon name="edit" className="size-3" /> แก้ไข
                      </Button>
                    </Link>
                    <Button
                      size="icon"
                      variant="outline"
                      title={h.isActive ? 'ปิดขาย' : 'เปิดขาย'}
                      onClick={() => setActive.mutate({ id: h.id, isActive: !h.isActive })}
                    >
                      <Icon name="eye" className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="danger"
                      title="ลบ"
                      onClick={() => {
                        if (confirm(`ลบ "${name}" ?`)) del.mutate({ id: h.id })
                      }}
                    >
                      <Icon name="trash" className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
