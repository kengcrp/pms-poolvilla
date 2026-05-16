'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Icon } from '@pms/ui'
import { MiniCalendar } from '@/components/MiniCalendar'
import { BookingModal } from '@/components/BookingModal'
import { PageHeader } from '@/components/PageHeader'
import { StatusLegend } from '@/components/StatusLegend'

export default function CalendarPage() {
  const { data, isPending } = trpc.property.list.useQuery()
  const properties = data?.properties ?? []
  const [modal, setModal] = useState<{ variantId: string; label: string; date: Date } | null>(null)

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="ปฏิทิน"
        description="ภาพรวมการจองและสถานะที่พักทุกหลัง — คลิก cell เพื่อจอง/ดูรายละเอียด"
      >
        <StatusLegend />
      </PageHeader>

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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {properties.map((p) => {
          const name = (p.name as { th?: string })?.th ?? p.code
          const defaultVariant = p.variants.find((v) => v.isDefault)
          if (!defaultVariant) return null
          const defaultVarName =
            (defaultVariant.name as { th?: string })?.th ?? `${defaultVariant.bedrooms} ห้องนอน`
          return (
            <Card key={p.id} hover className="overflow-hidden">
              <div className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
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
                  {p.variants.length > 1 && <Badge variant="brand">แบ่ง {p.variants.length}</Badge>}
                </div>

                <MiniCalendar
                  variantId={defaultVariant.id}
                  onCellClick={(date) =>
                    setModal({ variantId: defaultVariant.id, label: `${name} — ${defaultVarName}`, date })
                  }
                />

                {p.variants.length > 1 && (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                    {p.variants
                      .filter((v) => !v.isDefault)
                      .map((v) => {
                        const vName = (v.name as { th?: string })?.th ?? `${v.bedrooms} ห้องนอน`
                        return (
                          <div key={v.id}>
                            <div className="mb-2 flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-600">{vName}</span>
                              <span className="inline-flex items-center gap-1.5 text-[10.5px] text-gray-400">
                                <Icon name="users" className="size-2.5" /> {v.maxGuests}
                                <span>·</span>
                                <Icon name="bed" className="size-2.5" /> {v.bedrooms}
                              </span>
                            </div>
                            <MiniCalendar
                              variantId={v.id}
                              onCellClick={(date) =>
                                setModal({ variantId: v.id, label: `${name} — ${vName}`, date })
                              }
                            />
                          </div>
                        )
                      })}
                  </div>
                )}
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
