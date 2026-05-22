'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'
import { Badge, Button, Icon, Input, cn, type IconName } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'
import { PostponeModal } from '@/components/PostponeModal'
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

const statusBadge = (
  s: string,
): { label: string; variant: 'pending' | 'success' | 'danger' | 'default' | 'info' } => {
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

const sourceMeta = (s: string): { label: string; icon: IconName } => {
  switch (s) {
    case 'OWNER_DIRECT':
      return { label: 'เจ้าของ', icon: 'user' }
    case 'PUBLIC_SALE_PAGE':
      return { label: 'หน้าขาย', icon: 'globe' }
    case 'EXTERNAL_ICAL':
      return { label: 'OTA', icon: 'link' }
    default:
      return { label: s, icon: 'info' }
  }
}

const fmt = (n: number) => `฿${n.toLocaleString('en-US')}`
const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })

export default function BookingsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [postponeFor, setPostponeFor] = useState<{
    id: string
    customerName: string
    checkin: Date | string
    checkout: Date | string
    status: string
  } | null>(null)

  const utils = trpc.useUtils()
  const { data, isPending } = trpc.booking.list.useQuery({
    status: tab === 'ALL' ? undefined : tab,
    search: search.trim() || undefined,
  })

  const confirmMut = trpc.booking.confirmPending.useMutation({
    onSuccess: () => utils.booking.list.invalidate(),
  })
  const cancelMut = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      utils.booking.list.invalidate()
      utils.calendar.range.invalidate()
    },
  })
  const createInvoice = trpc.accounting.createFromBooking.useMutation({
    onSuccess: (doc) => router.push(`/manage/accounting/${doc.id}`),
  })

  const rows = data ?? []

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="การจอง" description="รวมรายการจองทั้งหมดจากทุกช่องทาง" />

      {/* Tabs + Search */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                tab === t.key
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-xs">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
          />
          <Input
            placeholder="ค้นหาชื่อ / เบอร์โทร..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Loading */}
      {isPending && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          <Icon name="spinner" spin className="mr-2 size-4" /> กำลังโหลด...
        </div>
      )}

      {/* Empty */}
      {!isPending && rows.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
            <Icon name="bookings" className="size-5" />
          </div>
          <p className="text-sm text-gray-500">
            {tab === 'ALL'
              ? 'ยังไม่มีการจอง'
              : `ไม่มีการจองในสถานะ "${tabs.find((t) => t.key === tab)?.label}"`}
          </p>
        </div>
      )}

      {/* Table (desktop) */}
      {!isPending && rows.length > 0 && (
        <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">สถานะ</th>
                  <th className="px-4 py-3 text-left">ลูกค้า</th>
                  <th className="px-4 py-3 text-left">ที่พัก</th>
                  <th className="px-4 py-3 text-left">วันเข้าพัก</th>
                  <th className="px-4 py-3 text-right">ยอด</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((b) => {
                  const sBadge = statusBadge(b.status)
                  const src = sourceMeta(b.source)
                  const propName = (b.property.name as { th?: string })?.th ?? b.property.code
                  const variantName =
                    (b.variant.name as { th?: string })?.th ?? `${b.variant.bedrooms} ห้อง`
                  const nights = Math.max(
                    1,
                    Math.round(
                      (new Date(b.checkout).getTime() - new Date(b.checkin).getTime()) / 86400000,
                    ),
                  )
                  return (
                    <tr key={b.id} className="group transition-colors hover:bg-gray-50/60">
                      {/* Status + source */}
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge variant={sBadge.variant} dot>
                            {sBadge.label}
                          </Badge>
                          <span
                            className="inline-flex items-center gap-1 text-[10.5px] text-gray-500"
                            title={src.label}
                          >
                            <Icon name={src.icon} className="size-3" />
                            {src.label}
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3 align-middle">
                        <div className="font-medium text-gray-900">{b.customerName}</div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          {b.customerPhone ?? '—'}
                          {b.bookerName !== b.customerName && (
                            <span className="text-gray-400"> · จองโดย {b.bookerName}</span>
                          )}
                        </div>
                      </td>

                      {/* Property */}
                      <td className="px-4 py-3 align-middle">
                        <div className="max-w-[240px] truncate font-medium text-gray-900">
                          {propName}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                          <code className="rounded bg-gray-100 px-1 py-0.5 font-mono">
                            {b.property.code}
                          </code>
                          <span className="truncate">{variantName}</span>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3 align-middle">
                        <div className="text-gray-900">
                          {fmtDate(b.checkin)}
                          <span className="mx-1.5 text-gray-300">→</span>
                          {fmtDate(b.checkout)}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          {nights} คืน · {b.guestCount} ท่าน
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right align-middle tabular-nums">
                        <div className="font-semibold text-gray-900">{fmt(Number(b.total))}</div>
                        {Number(b.deposit) > 0 && (
                          <div className="mt-0.5 text-[11px] text-gray-500">
                            มัดจำ {fmt(Number(b.deposit))}
                          </div>
                        )}
                        {b.paymentDueAt && b.status === 'PENDING_PAYMENT' && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-amber-700">
                            <Icon name="clock" className="size-3" />
                            {new Date(b.paymentDueAt).toLocaleString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          {b.status === 'PENDING_PAYMENT' && (
                            <button
                              type="button"
                              title="ยืนยันการจอง"
                              onClick={() => confirmMut.mutate({ id: b.id })}
                              disabled={confirmMut.isPending}
                              className="flex size-8 items-center justify-center rounded-lg text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                            >
                              <Icon name="check" className="size-4" />
                            </button>
                          )}
                          {(b.status === 'PENDING_PAYMENT' || b.status === 'CONFIRMED') && (
                            <button
                              type="button"
                              title="เลื่อนวันเข้าพัก"
                              onClick={() =>
                                setPostponeFor({
                                  id: b.id,
                                  customerName: b.customerName,
                                  checkin: b.checkin,
                                  checkout: b.checkout,
                                  status: b.status,
                                })
                              }
                              className="flex size-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
                            >
                              <Icon name="postpone" className="size-4" />
                            </button>
                          )}
                          {(b.status === 'CONFIRMED' || b.status === 'COMPLETED') && (
                            <button
                              type="button"
                              title="ออกใบจอง"
                              onClick={() =>
                                createInvoice.mutate({
                                  bookingId: b.id,
                                  type: 'INVOICE',
                                  withVat: false,
                                })
                              }
                              disabled={createInvoice.isPending}
                              className="flex size-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
                            >
                              <Icon name="invoice" className="size-4" />
                            </button>
                          )}
                          <Link
                            href={`/manage/calendar?focus=${b.variantId}`}
                            title="ดูปฏิทิน"
                            className="flex size-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
                          >
                            <Icon name="calendar" className="size-4" />
                          </Link>
                          {(b.status === 'PENDING_PAYMENT' || b.status === 'CONFIRMED') && (
                            <button
                              type="button"
                              title="ยกเลิก"
                              onClick={() => {
                                if (window.confirm(`ยกเลิกการจองของ ${b.customerName}?`))
                                  cancelMut.mutate({ id: b.id })
                              }}
                              disabled={cancelMut.isPending}
                              className="flex size-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                            >
                              <Icon name="close" className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 text-xs text-gray-500">
            ทั้งหมด {rows.length} รายการ
          </div>
        </div>
      )}

      {/* Card (mobile) */}
      {!isPending && rows.length > 0 && (
        <div className="space-y-2.5 md:hidden">
          {rows.map((b) => {
            const sBadge = statusBadge(b.status)
            const src = sourceMeta(b.source)
            const propName = (b.property.name as { th?: string })?.th ?? b.property.code
            const nights = Math.max(
              1,
              Math.round(
                (new Date(b.checkout).getTime() - new Date(b.checkin).getTime()) / 86400000,
              ),
            )
            return (
              <div
                key={b.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant={sBadge.variant} dot>
                        {sBadge.label}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-[10.5px] text-gray-500">
                        <Icon name={src.icon} className="size-3" />
                        {src.label}
                      </span>
                    </div>
                    <div className="font-semibold text-gray-900">{b.customerName}</div>
                    <div className="text-xs text-gray-500">{b.customerPhone ?? '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-gray-900">{fmt(Number(b.total))}</div>
                    {Number(b.deposit) > 0 && (
                      <div className="text-[11px] text-gray-500">
                        มัดจำ {fmt(Number(b.deposit))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                  <div>
                    <div className="text-gray-400">ที่พัก</div>
                    <div className="mt-0.5 truncate font-medium text-gray-900">{propName}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">วันที่</div>
                    <div className="mt-0.5 text-gray-900">
                      {fmtDate(b.checkin)} → {fmtDate(b.checkout)}
                    </div>
                    <div className="text-[10.5px] text-gray-500">
                      {nights} คืน · {b.guestCount} ท่าน
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {b.status === 'PENDING_PAYMENT' && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => confirmMut.mutate({ id: b.id })}
                      disabled={confirmMut.isPending}
                    >
                      <Icon name="check" className="size-3" />
                      ยืนยัน
                    </Button>
                  )}
                  {(b.status === 'PENDING_PAYMENT' || b.status === 'CONFIRMED') && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setPostponeFor({
                          id: b.id,
                          customerName: b.customerName,
                          checkin: b.checkin,
                          checkout: b.checkout,
                          status: b.status,
                        })
                      }
                    >
                      เลื่อน
                    </Button>
                  )}
                  {(b.status === 'CONFIRMED' || b.status === 'COMPLETED') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        createInvoice.mutate({
                          bookingId: b.id,
                          type: 'INVOICE',
                          withVat: false,
                        })
                      }
                      disabled={createInvoice.isPending}
                    >
                      ใบจอง
                    </Button>
                  )}
                  <Link href={`/manage/calendar?focus=${b.variantId}`} className="ml-auto">
                    <Button size="sm" variant="ghost">
                      <Icon name="calendar" className="size-3" />
                      ปฏิทิน
                    </Button>
                  </Link>
                  {(b.status === 'PENDING_PAYMENT' || b.status === 'CONFIRMED') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`ยกเลิกการจองของ ${b.customerName}?`))
                          cancelMut.mutate({ id: b.id })
                      }}
                      disabled={cancelMut.isPending}
                      className="text-red-600 hover:bg-red-50"
                    >
                      ยกเลิก
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PostponeModal
        open={!!postponeFor}
        onClose={() => setPostponeFor(null)}
        booking={postponeFor}
      />
    </div>
  )
}
