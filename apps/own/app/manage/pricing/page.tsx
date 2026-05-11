'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card } from '@pms/ui'
import { MiniCalendar } from '@/components/MiniCalendar'
import { WeeklyPricingModal } from '@/components/WeeklyPricingModal'
import { PageHeader } from '@/components/PageHeader'
import { StatusLegend } from '@/components/StatusLegend'

export default function PricingPage() {
  const { data, isPending } = trpc.property.list.useQuery()
  const [editing, setEditing] = useState<{ variantId: string; name: string } | null>(null)

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="ปรับราคา"
        description="ตั้งค่าราคาเริ่มต้นรายวันของสัปดาห์ — สามารถ override รายวันได้จากปฏิทิน"
      >
        <StatusLegend />
      </PageHeader>

      {isPending && <div className="text-sm text-gray-500">กำลังโหลด...</div>}

      {!isPending && data && data.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-3xl">💰</div>
          <p className="text-sm text-gray-600">ยังไม่มีที่พัก — สร้างที่พักก่อนเพื่อกำหนดราคา</p>
          <Link href="/manage/listings/new" className="mt-4">
            <Button>+ เพิ่มที่พัก</Button>
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((p) => {
          const name = (p.name as { th?: string })?.th ?? p.code
          const defaultVariant = p.variants.find((v) => v.isDefault)
          if (!defaultVariant) return null
          const varName = (defaultVariant.name as { th?: string })?.th ?? `${defaultVariant.bedrooms} ห้องนอน`
          return (
            <Card key={p.id} hover className="overflow-hidden">
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-gray-900">{name}</h3>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10.5px]">{p.code}</code>
                      <span>·</span>
                      <span>🛏 {defaultVariant.bedrooms}</span>
                      <span>·</span>
                      <span>👥 {defaultVariant.maxGuests}</span>
                    </div>
                  </div>
                  {p.variants.length > 1 && <Badge variant="brand">แบ่ง {p.variants.length}</Badge>}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setEditing({ variantId: defaultVariant.id, name: `${name} — ${varName}` })}
                >
                  <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                  ตั้งค่าเรทราคา (สัปดาห์)
                </Button>

                <MiniCalendar variantId={defaultVariant.id} />

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
                          <Button
                            key={v.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setEditing({ variantId: v.id, name: `${name} — ${vName}` })}
                          >
                            ⚙ {vName}
                            <span className="ml-auto text-[10.5px] text-gray-400">
                              👥 {v.maxGuests}
                            </span>
                          </Button>
                        )
                      })}
                  </div>
                )}
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
      />
    </div>
  )
}
