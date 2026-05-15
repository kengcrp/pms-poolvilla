'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Input, cn } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'
import { ymdLocal } from '@/lib/date'

type StatusFilter =
  | 'ALL'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'AUTO_CANCELLED'

const tabs: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'ทั้งหมด' },
  { key: 'PENDING_PAYMENT', label: 'รอชำระ' },
  { key: 'CONFIRMED', label: 'ยืนยันแล้ว' },
  { key: 'COMPLETED', label: 'เสร็จสิ้น' },
  { key: 'CANCELLED', label: 'ยกเลิก' },
]

const statusBadge = (s: string): { label: string; variant: 'pending' | 'success' | 'danger' | 'default' | 'info' } => {
  switch (s) {
    case 'PENDING_PAYMENT':
      return { label: 'รอชำระ', variant: 'pending' }
    case 'CONFIRMED':
      return { label: 'ยืนยันแล้ว', variant: 'success' }
    case 'COMPLETED':
      return { label: 'เสร็จสิ้น', variant: 'info' }
    case 'CANCELLED':
      return { label: 'ยกเลิก', variant: 'default' }
    case 'AUTO_CANCELLED':
      return { label: 'หมดเวลาชำระ', variant: 'danger' }
    default:
      return { label: s, variant: 'default' }
  }
}

const sourceBadge = (s: string): { label: string; emoji: string } => {
  switch (s) {
    case 'OWNER_DIRECT':
      return { label: 'จองโดยเจ้าของ', emoji: '👤' }
    case 'PUBLIC_SALE_PAGE':
      return { label: 'หน้าขายสาธารณะ', emoji: '🌐' }
    case 'EXTERNAL_ICAL':
      return { label: 'OTA (iCal)', emoji: '🔗' }
    default:
      return { label: s, emoji: '•' }
  }
}

function formatBahtFull(n: number) {
  return `฿${n.toLocaleString('en-US')}`
}

export default function BookingsPage() {
  const [tab, setTab] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const utils = trpc.useUtils()

  const { data, isPending } = trpc.booking.list.useQuery({
    status: tab === 'ALL' ? undefined : tab,
    search: search.trim() || undefined,
  })

  const confirm = trpc.booking.confirmPending.useMutation({
    onSuccess: () => utils.booking.list.invalidate(),
  })
  const cancel = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      utils.booking.list.invalidate()
      utils.calendar.range.invalidate()
    },
  })

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="การจอง" description="รวมรายการจองทั้งหมดจากทุกช่องทาง" />

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all',
              tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600 hover:text-gray-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="ค้นหาชื่อลูกค้า / เบอร์โทร..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Empty state */}
      {!isPending && data && data.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <div className="mb-3 text-4xl">📋</div>
          <p className="text-sm text-gray-500">
            {tab === 'ALL' ? 'ยังไม่มีการจอง' : `ไม่มีการจองในสถานะ "${tabs.find((t) => t.key === tab)?.label}"`}
          </p>
        </Card>
      )}

      {/* List */}
      <div className="space-y-3">
        {data?.map((b) => {
          const sBadge = statusBadge(b.status)
          const src = sourceBadge(b.source)
          const propName = (b.property.name as { th?: string })?.th ?? b.property.code
          const variantName = (b.variant.name as { th?: string })?.th ?? `${b.variant.bedrooms} ห้อง`
          const nights = Math.max(
            1,
            Math.round(
              (new Date(b.checkout).getTime() - new Date(b.checkin).getTime()) / 86400000,
            ),
          )
          return (
            <Card key={b.id} className="overflow-hidden">
              <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant={sBadge.variant} dot>
                      {sBadge.label}
                    </Badge>
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                      title={src.label}
                    >
                      {src.emoji} {src.label}
                    </span>
                  </div>
                  <div className="text-base font-semibold text-gray-900">{b.customerName}</div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {b.customerPhone ?? '—'}
                    {b.bookerName !== b.customerName && ` · จองโดย ${b.bookerName}`}
                  </div>
                  {b.publicNote && (
                    <div className="mt-1 text-xs text-gray-500 line-clamp-1">📝 {b.publicNote}</div>
                  )}
                </div>

                <div className="md:text-right">
                  <div className="text-sm font-medium text-gray-900">{propName}</div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10.5px]">
                      {b.property.code}
                    </code>{' '}
                    · {variantName}
                  </div>
                </div>

                <div className="md:text-right">
                  <div className="text-sm text-gray-900">
                    {ymdLocal(b.checkin)} → {ymdLocal(b.checkout)}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {nights} คืน · {b.guestCount} ท่าน
                  </div>
                </div>

                <div className="md:text-right">
                  <div className="text-base font-bold text-gray-900">
                    {formatBahtFull(Number(b.total))}
                  </div>
                  {Number(b.deposit) > 0 && (
                    <div className="mt-0.5 text-xs text-gray-500">
                      มัดจำ {formatBahtFull(Number(b.deposit))}
                    </div>
                  )}
                  {b.paymentDueAt && b.status === 'PENDING_PAYMENT' && (
                    <div className="mt-1 text-[10.5px] text-amber-700">
                      ⏰ ครบกำหนด{' '}
                      {new Date(b.paymentDueAt).toLocaleString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 md:flex-col">
                  {b.status === 'PENDING_PAYMENT' && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => confirm.mutate({ id: b.id })}
                      disabled={confirm.isPending}
                    >
                      ยืนยัน
                    </Button>
                  )}
                  {(b.status === 'PENDING_PAYMENT' || b.status === 'CONFIRMED') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm.isPending) return
                        if (window.confirm(`ยกเลิกการจองของ ${b.customerName}?`))
                          cancel.mutate({ id: b.id })
                      }}
                      disabled={cancel.isPending}
                      className="text-red-600 hover:bg-red-50"
                    >
                      ยกเลิก
                    </Button>
                  )}
                  <Link href={`/manage/calendar?focus=${b.variantId}`}>
                    <Button size="sm" variant="secondary">
                      ดูปฏิทิน
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {isPending && (
        <Card className="p-8 text-center">
          <div className="text-sm text-gray-500">กำลังโหลด...</div>
        </Card>
      )}
    </div>
  )
}
