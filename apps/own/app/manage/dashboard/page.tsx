'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card } from '@pms/ui'

export default function DashboardPage() {
  const utils = trpc.useUtils()
  const { data: properties } = trpc.property.list.useQuery()
  const { data: allBookings } = trpc.booking.list.useQuery()
  const { data: pending } = trpc.booking.list.useQuery({ status: 'PENDING_PAYMENT' })

  const [cancelMsg, setCancelMsg] = useState<string | null>(null)
  const runCancel = trpc.booking.runAutoCancel.useMutation({
    onSuccess: (res) => {
      setCancelMsg(`✓ ตรวจสอบเรียบร้อย — ยกเลิกอัตโนมัติ ${res.cancelled} รายการ`)
      utils.booking.list.invalidate()
      utils.calendar.range.invalidate()
      setTimeout(() => setCancelMsg(null), 5000)
    },
  })

  const propCount = properties?.properties.length ?? 0
  const totalBookings = allBookings?.length ?? 0
  const pendingCount = pending?.length ?? 0
  const monthRevenue =
    allBookings
      ?.filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
      .reduce((sum, b) => sum + Number(b.total), 0) ?? 0

  const kpis = [
    { label: 'จำนวนที่พัก', value: String(propCount), sub: 'หลัง', icon: '🏠', tone: 'brand' as const },
    { label: 'การจองทั้งหมด', value: String(totalBookings), sub: 'ครั้ง', icon: '📅', tone: 'success' as const },
    { label: 'รอชำระ', value: String(pendingCount), sub: 'รายการ', icon: '⏳', tone: 'warning' as const },
    { label: 'ยอดรวม (CONFIRMED)', value: `฿${monthRevenue.toLocaleString()}`, sub: '', icon: '💰', tone: 'info' as const },
  ]

  const toneClass = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    info: 'bg-blue-50 text-blue-700',
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">แดชบอร์ด</h1>
        <p className="mt-1 text-sm text-gray-600">ภาพรวมที่พักและการจองของคุณ</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-gray-500">{kpi.label}</div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{kpi.value}</div>
                {kpi.sub && <div className="mt-0.5 text-xs text-gray-400">{kpi.sub}</div>}
              </div>
              <div className={`flex size-10 items-center justify-center rounded-xl text-xl ${toneClass[kpi.tone]}`}>
                {kpi.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">งานที่ต้องตรวจ</h2>
              <p className="text-xs text-gray-500">รายการรอชำระล่าสุด 5 อันดับ</p>
            </div>
          </div>
          {pendingCount === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
              ไม่มีรายการรอชำระ ✓
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pending?.slice(0, 5).map((b) => {
                const propName = (b.property.name as { th?: string })?.th ?? b.property.code
                const overdue = b.paymentDueAt && new Date(b.paymentDueAt) < new Date()
                return (
                  <li key={b.id} className="flex items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{b.customerName}</span>
                        {overdue && <Badge variant="danger">เลยกำหนด</Badge>}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {propName} · ฿{Number(b.total).toLocaleString()}
                        {b.paymentDueAt &&
                          ` · ครบกำหนด ${new Date(b.paymentDueAt).toLocaleString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-1 text-base font-semibold text-gray-900">Auto-cancel</h2>
          <p className="text-xs text-gray-500">
            ตรวจการจองที่เลยกำหนดชำระแล้วยกเลิกอัตโนมัติ
          </p>
          <Button
            className="mt-4 w-full"
            onClick={() => runCancel.mutate()}
            disabled={runCancel.isPending}
          >
            {runCancel.isPending ? 'กำลังตรวจ...' : 'ตรวจตอนนี้'}
          </Button>
          {cancelMsg && (
            <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-inset ring-emerald-200">
              {cancelMsg}
            </div>
          )}
          <p className="mt-4 text-xs text-gray-400">
            Production: ตั้งให้ <code className="rounded bg-gray-100 px-1">POST /api/cron/auto-cancel</code> ทุก 10 นาที (Vercel Cron / Upstash QStash / system cron)
          </p>
        </Card>
      </div>
    </div>
  )
}
