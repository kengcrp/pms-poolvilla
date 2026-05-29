'use client'

/**
 * ตรวจสอบรายการจอง — Sale Page bookings dashboard.
 * Channel filter pills + status tabs + table + pagination.
 * Currently UI-only with mock data.
 */

import { useMemo, useState } from 'react'
import { Icon } from '@pms/ui'

type PaymentChannel = 'bank_transfer' | 'credit_debit_card' | 'mobile_banking'
type StatusKey = 'pending' | 'approved' | 'rejected' | 'auto_cancelled'
type StatusTab = 'all' | StatusKey

interface MockBooking {
  rowNo: number
  date: string
  property: string
  customer: string
  phone: string
  checkin: string
  checkout: string
  price: number
  status: StatusKey
  channel: PaymentChannel
}

const MOCK_BOOKINGS: MockBooking[] = [
  { rowNo: 1, date: '11/05/2026 00:37', property: 'TN 005', customer: 'book', phone: '0987654321', checkin: '13/05/2026', checkout: '14/05/2026', price: 2500, status: 'approved', channel: 'bank_transfer' },
  { rowNo: 2, date: '11/05/2026 00:37', property: 'TN 005', customer: 'chiraphong nkainjang', phone: '0938923813', checkin: '10/05/2026', checkout: '11/05/2026', price: 2500, status: 'pending', channel: 'bank_transfer' },
  { rowNo: 3, date: '05/05/2026 03:00', property: 'TN 001', customer: '78686', phone: '08877', checkin: '12/05/2026', checkout: '13/05/2026', price: 3000, status: 'pending', channel: 'bank_transfer' },
  { rowNo: 4, date: '24/03/2026 23:35', property: 'TN 001', customer: 'TestBookFull2', phone: '0987654321', checkin: '05/04/2026', checkout: '06/04/2026', price: 21000, status: 'approved', channel: 'bank_transfer' },
  { rowNo: 5, date: '24/03/2026 23:33', property: 'TN 001', customer: 'TestBookFull', phone: '0987654321', checkin: '24/03/2026', checkout: '25/03/2026', price: 3000, status: 'approved', channel: 'bank_transfer' },
]

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'การจองทั้งหมด' },
  { key: 'pending', label: 'รอดำเนินการ' },
  { key: 'approved', label: 'อนุมัติแล้ว' },
  { key: 'rejected', label: 'ไม่อนุมัติ' },
  { key: 'auto_cancelled', label: 'ยกเลิกอัตโนมัติ' },
]

const STATUS_BADGES: Record<StatusKey, { label: string; cls: string }> = {
  pending:        { label: 'รอดำเนินการ', cls: 'bg-amber-100 text-amber-700' },
  approved:       { label: 'อนุมัติแล้ว',  cls: 'bg-emerald-100 text-emerald-700' },
  rejected:       { label: 'ไม่อนุมัติ',   cls: 'bg-red-100 text-red-700' },
  auto_cancelled: { label: 'ยกเลิกอัตโนมัติ', cls: 'bg-gray-200 text-gray-600' },
}

const PAYMENT_CHANNELS: { key: PaymentChannel; label: string }[] = [
  { key: 'bank_transfer', label: 'โอนเงิน' },
  { key: 'credit_debit_card', label: 'บัตรเครดิต/บัตรเดบิต' },
  { key: 'mobile_banking', label: 'โมบายแบงค์กิ้ง' },
]

export default function BookingsPage() {
  const [channel, setChannel] = useState<PaymentChannel>('bank_transfer')
  const [tab, setTab] = useState<StatusTab>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return MOCK_BOOKINGS.filter((b) => {
      if (b.channel !== channel) return false
      if (tab !== 'all' && b.status !== tab) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !b.property.toLowerCase().includes(q) &&
          !b.customer.toLowerCase().includes(q) &&
          !b.phone.includes(search)
        ) return false
      }
      return true
    })
  }, [channel, tab, search])

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ตรวจสอบรายการจอง</h1>

      {/* Payment channel pills */}
      <div className="flex flex-wrap items-center gap-2">
        {PAYMENT_CHANNELS.map((c) => {
          const active = channel === c.key
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                setChannel(c.key)
                setPage(1)
              }}
              className={
                active
                  ? 'rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm'
                  : 'rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-brand-300 hover:bg-gray-50'
              }
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap items-end gap-6 border-b border-gray-200">
        {STATUS_TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key)
                setPage(1)
              }}
              className={
                active
                  ? '-mb-px border-b-2 border-brand-500 px-1 pb-2 text-sm font-semibold text-brand-700'
                  : 'pb-2 text-sm font-medium text-gray-500 hover:text-gray-800'
              }
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Table card */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        {/* Counter + search inside card */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-sm text-gray-700">
            ข้อมูลทั้งหมด <span className="font-bold text-gray-900">{filtered.length}</span> รายการ
          </div>
          <div className="flex items-stretch gap-2">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="ค้นหา"
                className="h-10 w-64 rounded-full border border-gray-200 bg-white pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              <Icon name="search" className="size-3.5" />
              ค้นหา
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                {['ลำดับ', 'วันที่', 'ชื่อที่พัก', 'ชื่อลูกค้า', 'เบอร์', 'เช็คอิน', 'เช็คเอาท์', 'ราคาสุทธิ', 'สถานะ', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-500">
                    ไม่พบรายการตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const badge = STATUS_BADGES[b.status]
                  return (
                    <tr key={b.rowNo} className="text-gray-700 hover:bg-gray-50/60">
                      <td className="px-4 py-5 font-medium text-gray-900">{b.rowNo}</td>
                      <td className="px-4 py-5 text-xs text-gray-700">{b.date}</td>
                      <td className="px-4 py-5 font-medium">{b.property}</td>
                      <td className="px-4 py-5">{b.customer}</td>
                      <td className="px-4 py-5 font-mono text-xs text-gray-700">{b.phone}</td>
                      <td className="px-4 py-5 text-xs text-gray-700">{b.checkin}</td>
                      <td className="px-4 py-5 text-xs text-gray-700">{b.checkout}</td>
                      <td className="px-4 py-5 font-semibold tabular-nums">
                        {b.price.toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>
                          <span className="size-1.5 rounded-full bg-current opacity-70" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <button
                          type="button"
                          title="ดูรายละเอียด"
                          className="flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-brand-700"
                        >
                          <Icon name="search" className="size-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-2 flex items-center justify-center gap-2 pt-4">
          <PaginationButton ariaLabel="หน้าแรก">«</PaginationButton>
          <PaginationButton ariaLabel="ก่อนหน้า" onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</PaginationButton>
          <div className="flex size-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white shadow-md">
            {page}
          </div>
          <PaginationButton ariaLabel="ถัดไป" onClick={() => setPage((p) => p + 1)}>›</PaginationButton>
          <PaginationButton ariaLabel="หน้าสุดท้าย">»</PaginationButton>
        </div>
      </div>
    </div>
  )
}

function PaginationButton({
  children,
  ariaLabel,
  onClick,
}: {
  children: React.ReactNode
  ariaLabel: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="flex size-8 items-center justify-center rounded-full text-base text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-700"
    >
      {children}
    </button>
  )
}
