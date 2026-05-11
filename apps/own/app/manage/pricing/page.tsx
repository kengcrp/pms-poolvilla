'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card } from '@pms/ui'
import { MiniCalendar } from '@/components/MiniCalendar'
import { WeeklyPricingModal } from '@/components/WeeklyPricingModal'

export default function PricingPage() {
  const { data, isPending } = trpc.property.list.useQuery()
  const [editing, setEditing] = useState<{ variantId: string; name: string } | null>(null)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ปรับราคา</h1>
        <p className="mt-1 text-sm text-gray-600">
          ตั้งค่าราคาเริ่มต้นรายวันของสัปดาห์ — สามารถ override รายวันจากปฏิทินได้
        </p>
      </div>

      <StatusLegend />

      {isPending && <div className="mt-6 text-sm text-gray-500">กำลังโหลด...</div>}

      {!isPending && data && data.length === 0 && (
        <Card className="mt-6 p-10 text-center">
          <p className="text-sm text-gray-600">ยังไม่มีที่พัก — สร้างที่พักก่อนเพื่อกำหนดราคา</p>
          <Link href="/manage/listings/new" className="mt-3 inline-block">
            <Button size="md">+ เพิ่มที่พัก</Button>
          </Link>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((p) => {
          const name = (p.name as { th?: string })?.th ?? p.code
          const defaultVariant = p.variants.find((v) => v.isDefault)
          if (!defaultVariant) return null
          const varName = (defaultVariant.name as { th?: string })?.th ?? `${defaultVariant.bedrooms} ห้องนอน`
          return (
            <Card key={p.id} className="overflow-hidden">
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{name}</h3>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                      <span>{p.code}</span>
                      <span>·</span>
                      <span>🛏 {defaultVariant.bedrooms}</span>
                      <span>·</span>
                      <span>👥 {defaultVariant.maxGuests}</span>
                    </div>
                  </div>
                  {p.variants.length > 1 && (
                    <Badge variant="info">แบ่งห้อง {p.variants.length}</Badge>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setEditing({ variantId: defaultVariant.id, name: `${name} — ${varName}` })}
                >
                  ⚙ ตั้งค่าเรทราคา (สัปดาห์)
                </Button>

                <div className="pt-2">
                  <MiniCalendar variantId={defaultVariant.id} />
                </div>

                {p.variants.length > 1 && (
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <div className="text-xs font-semibold text-gray-500">แบบแบ่งห้อง:</div>
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
                            ⚙ ตั้งค่า: {vName}
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

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <LegendDot color="bg-red-100 text-red-700" label="จองแล้ว" />
      <LegendDot color="bg-amber-100 text-amber-700" label="รอชำระ" />
      <LegendDot color="bg-blue-100 text-blue-700" label="วันสำคัญ" />
      <LegendDot color="bg-emerald-100 text-emerald-700" label="ลดราคา" />
      <LegendDot color="bg-gray-200 text-gray-700" label="ปิดซ่อม" />
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ${color}`}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  )
}
