'use client'

/**
 * ประวัติการทำรายการ — Transaction history
 * 4 tabs: รายการจอง / ปิดซ่อม / เลื่อนวันเข้าพัก / ปรับราคา
 *
 * Tab #1 (รายการจอง) is wired to booking.list. The other three are scaffolds
 * with empty states pending their backend queries.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { cn, Icon } from '@pms/ui'
import { trpc } from '@/lib/trpc'

type TabKey = 'bookings' | 'maintenance' | 'postpone' | 'pricing'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'bookings', label: 'รายการจอง' },
  { key: 'maintenance', label: 'ปิดซ่อม' },
  { key: 'postpone', label: 'เลื่อนวันเข้าพัก' },
  { key: 'pricing', label: 'ปรับราคา' },
]

const PAGE_SIZE = 10

/** Map BookingStatus + active postpone to display text (matches mock image). */
function statusText(s: string, hasActivePostpone: boolean): { text: string; color: string } {
  if (hasActivePostpone) return { text: 'postpone', color: 'text-amber-600' }
  switch (s) {
    case 'CONFIRMED':
      return { text: 'ยืนยัน', color: 'text-emerald-600' }
    case 'PENDING_PAYMENT':
      return { text: 'รอดำเนินการ', color: 'text-sky-600' }
    case 'CANCELLED':
      return { text: 'ยกเลิก', color: 'text-red-600' }
    case 'AUTO_CANCELLED':
      return { text: 'ยกเลิกอัตโนมัติ', color: 'text-gray-500' }
    case 'COMPLETED':
      return { text: 'เสร็จสิ้น', color: 'text-gray-500' }
    default:
      return { text: s, color: 'text-gray-600' }
  }
}

function sourceText(s: string | null | undefined): string {
  switch (s) {
    case 'OWNER_DIRECT':
      return 'เจ้าของจอง'
    case 'PUBLIC_SALE_PAGE':
      return 'Sale Page'
    case 'EXTERNAL_ICAL':
      return 'iCal'
    default:
      return '–'
  }
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '–'
  const dt = new Date(d)
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const yyyy = dt.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '–'
  const dt = new Date(d)
  const hh = String(dt.getHours()).padStart(2, '0')
  const min = String(dt.getMinutes()).padStart(2, '0')
  return `${fmtDate(dt)} ${hh}:${min}`
}

function nameOf(name: unknown): string {
  if (typeof name === 'string') return name
  if (name && typeof name === 'object') {
    const n = name as { th?: string; en?: string }
    return n.th ?? n.en ?? ''
  }
  return ''
}

export default function TransactionsPage() {
  const [tab, setTab] = useState<TabKey>('bookings')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: bookings, isPending: bookingsLoading } = trpc.booking.list.useQuery(
    { search: search || undefined },
    { enabled: tab === 'bookings' },
  )

  const { data: postpones, isPending: postponesLoading } = trpc.booking.postponeHistory.useQuery(
    { scope: 'ALL' },
    { enabled: tab === 'postpone' },
  )

  function submitSearch() {
    setSearch(searchDraft.trim())
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ประวัติการทำรายการ</h1>

      {/* Tabs (Airbnb-style: underline on active) */}
      <div className="flex gap-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key)
              setPage(1)
            }}
            className={cn(
              'relative -mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {tab === 'bookings' && (
          <BookingsTab
            rows={bookings ?? []}
            loading={bookingsLoading}
            searchDraft={searchDraft}
            setSearchDraft={setSearchDraft}
            onSearch={submitSearch}
            page={page}
            setPage={setPage}
          />
        )}
        {tab === 'maintenance' && (
          <EmptyTab
            title="ประวัติปิดซ่อม"
            searchDraft={searchDraft}
            setSearchDraft={setSearchDraft}
            onSearch={submitSearch}
            message="ยังไม่มีรายการปิดซ่อม"
          />
        )}
        {tab === 'postpone' && (
          <PostponeTab
            rows={postpones ?? []}
            loading={postponesLoading}
            searchDraft={searchDraft}
            setSearchDraft={setSearchDraft}
            onSearch={submitSearch}
            page={page}
            setPage={setPage}
          />
        )}
        {tab === 'pricing' && (
          <EmptyTab
            title="ประวัติปรับราคา"
            searchDraft={searchDraft}
            setSearchDraft={setSearchDraft}
            onSearch={submitSearch}
            message="ยังไม่มีรายการปรับราคา"
          />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Table header — count + search + button (shared across all tabs)
// ─────────────────────────────────────────────────────────────────────────────

function TableHeader({
  count,
  searchDraft,
  setSearchDraft,
  onSearch,
}: {
  count: number
  searchDraft: string
  setSearchDraft: (v: string) => void
  onSearch: () => void
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-gray-600">ข้อมูลทั้งหมด {count} รายการ</div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="ค้นหา"
            className="h-9 w-48 rounded-full border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:w-56"
          />
        </div>
        <button
          type="button"
          onClick={onSearch}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <Icon name="search" className="size-3.5" />
          ค้นหา
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Bookings tab — main table from the mock image
// ─────────────────────────────────────────────────────────────────────────────

interface BookingRow {
  id: string
  createdAt: Date
  property: { name: unknown } | null
  customerName: string | null
  checkin: Date
  checkout: Date
  total: { toString(): string } | number
  source: string | null
  status: string
  postpones?: { id: string }[]
}

function BookingsTab({
  rows,
  loading,
  searchDraft,
  setSearchDraft,
  onSearch,
  page,
  setPage,
}: {
  rows: BookingRow[]
  loading: boolean
  searchDraft: string
  setSearchDraft: (v: string) => void
  onSearch: () => void
  page: number
  setPage: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page],
  )

  return (
    <>
      <TableHeader
        count={rows.length}
        searchDraft={searchDraft}
        setSearchDraft={setSearchDraft}
        onSearch={onSearch}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">ลำดับ</th>
              <th className="px-4 py-3 text-left">วันที่ทำรายการ</th>
              <th className="px-4 py-3 text-left">ชื่อที่พัก</th>
              <th className="px-4 py-3 text-left">ชื่อลูกค้า</th>
              <th className="px-4 py-3 text-left">วันที่เช็คอิน</th>
              <th className="px-4 py-3 text-left">วันที่เช็คเอาท์</th>
              <th className="px-4 py-3 text-right">ราคาสุทธิ</th>
              <th className="px-4 py-3 text-left">ช่องทางขาย</th>
              <th className="px-4 py-3 text-left">สถานะ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            )}
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-400">
                  ยังไม่มีรายการจอง
                </td>
              </tr>
            )}
            {!loading &&
              pageRows.map((b, i) => {
                const idx = (page - 1) * PAGE_SIZE + i + 1
                const hasActivePostpone = (b.postpones?.length ?? 0) > 0
                const st = statusText(b.status, hasActivePostpone)
                const total = Number(typeof b.total === 'number' ? b.total : b.total.toString())
                return (
                  <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-600">{idx}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtDateTime(b.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-700">{nameOf(b.property?.name) || '–'}</td>
                    <td className="px-4 py-3 text-gray-700">{b.customerName?.trim() || '–'}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtDate(b.checkin)}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtDate(b.checkout)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {total > 0 ? `฿${total.toLocaleString('en-US')}` : '–'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{sourceText(b.source)}</td>
                    <td className={cn('px-4 py-3 font-medium', st.color)}>{st.text}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/manage/bookings/${b.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                        >
                          <Icon name="invoice" className="size-3.5" />
                          ใบจอง
                        </Link>
                        <Link
                          href={`/manage/bookings/${b.id}`}
                          aria-label="ดูรายละเอียด"
                          className="inline-flex size-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Icon name="search" className="size-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Postpone tab
// ─────────────────────────────────────────────────────────────────────────────

interface PostponeRow {
  id: string
  postponedAt: Date
  oldCheckin: Date
  oldCheckout: Date
  newCheckin: Date | null
  newCheckout: Date | null
  expiresAt: Date
  booking: {
    id: string
    customerName: string | null
    property: { name: unknown } | null
  }
}

function PostponeTab({
  rows,
  loading,
  searchDraft,
  setSearchDraft,
  onSearch,
  page,
  setPage,
}: {
  rows: PostponeRow[]
  loading: boolean
  searchDraft: string
  setSearchDraft: (v: string) => void
  onSearch: () => void
  page: number
  setPage: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const now = Date.now()

  return (
    <>
      <TableHeader
        count={rows.length}
        searchDraft={searchDraft}
        setSearchDraft={setSearchDraft}
        onSearch={onSearch}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">ลำดับ</th>
              <th className="px-4 py-3 text-left">วันที่เลื่อน</th>
              <th className="px-4 py-3 text-left">ชื่อที่พัก</th>
              <th className="px-4 py-3 text-left">ชื่อลูกค้า</th>
              <th className="px-4 py-3 text-left">วันเดิม</th>
              <th className="px-4 py-3 text-left">วันใหม่</th>
              <th className="px-4 py-3 text-left">หมดเขตเลื่อน</th>
              <th className="px-4 py-3 text-left">สถานะ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            )}
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                  ยังไม่มีประวัติเลื่อนวันเข้าพัก
                </td>
              </tr>
            )}
            {!loading &&
              pageRows.map((p, i) => {
                const idx = (page - 1) * PAGE_SIZE + i + 1
                const expired = p.expiresAt.getTime() < now
                const hasNew = p.newCheckin && p.newCheckout
                const stColor = expired
                  ? 'text-gray-500'
                  : hasNew
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                const stText = expired ? 'หมดเขต' : hasNew ? 'กำหนดวันใหม่แล้ว' : 'รอกำหนดวันใหม่'
                return (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-600">{idx}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtDateTime(p.postponedAt)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {nameOf(p.booking.property?.name) || '–'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {p.booking.customerName?.trim() || '–'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {fmtDate(p.oldCheckin)} – {fmtDate(p.oldCheckout)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {hasNew ? `${fmtDate(p.newCheckin)} – ${fmtDate(p.newCheckout)}` : '–'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{fmtDate(p.expiresAt)}</td>
                    <td className={cn('px-4 py-3 font-medium', stColor)}>{stText}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/manage/bookings/${p.booking.id}`}
                        aria-label="ดูรายละเอียด"
                        className="inline-flex size-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Icon name="search" className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty tab — used for ปิดซ่อม + ปรับราคา until backend wired
// ─────────────────────────────────────────────────────────────────────────────

function EmptyTab({
  title,
  searchDraft,
  setSearchDraft,
  onSearch,
  message,
}: {
  title: string
  searchDraft: string
  setSearchDraft: (v: string) => void
  onSearch: () => void
  message: string
}) {
  return (
    <>
      <TableHeader
        count={0}
        searchDraft={searchDraft}
        setSearchDraft={setSearchDraft}
        onSearch={onSearch}
      />
      <div className="px-4 py-16 text-center">
        <div className="text-sm font-medium text-gray-700">{title}</div>
        <div className="mt-1 text-xs text-gray-400">{message}</div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination (« ‹ [n] › »)
// ─────────────────────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  setPage,
}: {
  page: number
  totalPages: number
  setPage: (p: number) => void
}) {
  const go = (p: number) => setPage(Math.min(Math.max(1, p), totalPages))
  return (
    <div className="flex items-center justify-center gap-1 border-t border-gray-100 py-3">
      <PageBtn onClick={() => go(1)} disabled={page === 1} label="«" />
      <PageBtn onClick={() => go(page - 1)} disabled={page === 1} label="‹" />
      <button
        type="button"
        className="inline-flex size-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white"
        aria-current="page"
      >
        {page}
      </button>
      <PageBtn onClick={() => go(page + 1)} disabled={page >= totalPages} label="›" />
      <PageBtn onClick={() => go(totalPages)} disabled={page >= totalPages} label="»" />
    </div>
  )
}

function PageBtn({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void
  disabled: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-full text-xs transition-colors',
        disabled
          ? 'text-gray-300'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
      )}
    >
      {label}
    </button>
  )
}
