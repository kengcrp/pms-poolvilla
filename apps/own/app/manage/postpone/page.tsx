'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, cn } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'
import { ymdLocal } from '@/lib/date'

type Scope = 'ACTIVE' | 'EXPIRED' | 'ALL'

const tabs: { key: Scope; label: string }[] = [
  { key: 'ACTIVE', label: 'รอจองวันเข้าพักใหม่' },
  { key: 'EXPIRED', label: 'หมดเขตเลื่อนวัน' },
  { key: 'ALL', label: 'ทั้งหมด' },
]

export default function PostponeHistoryPage() {
  const [scope, setScope] = useState<Scope>('ACTIVE')
  const { data, isPending } = trpc.booking.postponeHistory.useQuery({ scope })

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="เลื่อนวันเข้าพัก" description="ประวัติการเลื่อนวันของลูกค้าทุกหลัง" />

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setScope(t.key)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all',
              scope === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600 hover:text-gray-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isPending && (
        <Card className="p-8 text-center">
          <div className="text-sm text-gray-500">กำลังโหลด...</div>
        </Card>
      )}

      {!isPending && data && data.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <div className="mb-3 text-4xl">🔁</div>
          <p className="text-sm text-gray-500">ยังไม่มีรายการในกลุ่มนี้</p>
        </Card>
      )}

      <div className="space-y-3">
        {data?.map((p) => {
          const now = new Date()
          const expired = new Date(p.expiresAt) < now
          const propName = (p.booking.property.name as { th?: string })?.th ?? p.booking.property.code
          return (
            <Card key={p.id} className="overflow-hidden">
              <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    {expired ? (
                      <Badge variant="danger" dot>
                        หมดเขต
                      </Badge>
                    ) : (
                      <Badge variant="pending" dot>
                        ยังมีผล
                      </Badge>
                    )}
                  </div>
                  <div className="font-semibold text-gray-900">{p.booking.customerName}</div>
                  <div className="mt-0.5 text-xs text-gray-500">{p.booking.customerPhone ?? '—'}</div>
                  {p.reason && <div className="mt-1 text-xs text-gray-500">เหตุผล: {p.reason}</div>}
                </div>

                <div className="md:text-right">
                  <div className="text-sm font-medium text-gray-900">{propName}</div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10.5px]">
                      {p.booking.property.code}
                    </code>
                  </div>
                </div>

                <div className="md:text-right">
                  <div className="text-xs text-gray-500">เดิม</div>
                  <div className="text-sm text-gray-700 line-through">
                    {ymdLocal(p.oldCheckin)} → {ymdLocal(p.oldCheckout)}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">ใหม่</div>
                  <div className="text-sm font-medium text-brand-700">
                    {ymdLocal(p.newCheckin)} → {ymdLocal(p.newCheckout)}
                  </div>
                </div>

                <div className="md:text-right">
                  <div className="text-xs text-gray-500">หมดเขต</div>
                  <div className={cn('text-sm font-medium', expired ? 'text-red-700' : 'text-gray-700')}>
                    {new Date(p.expiresAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="mt-1 text-[10.5px] text-gray-400">
                    เลื่อนเมื่อ{' '}
                    {new Date(p.postponedAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                </div>

                <div>
                  <Link href={`/manage/bookings?focus=${p.bookingId}`}>
                    <Button size="sm" variant="secondary">
                      ดูการจอง
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
