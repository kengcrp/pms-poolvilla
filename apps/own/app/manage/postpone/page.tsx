'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Icon, cn } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'
import { ymdLocal } from '@/lib/date'
import { BookNewCheckinModal, type PostponeRowForModal } from '@/components/BookNewCheckinModal'

type Scope = 'ACTIVE' | 'EXPIRED' | 'ALL'

const tabs: { key: Scope; label: string }[] = [
  { key: 'ACTIVE', label: 'รอจองวันเข้าพักใหม่' },
  { key: 'EXPIRED', label: 'หมดเขตเลื่อนวัน' },
  { key: 'ALL', label: 'ประวัติเลื่อนเข้าพัก' },
]

const PAGE_SIZE = 10

export default function PostponeHistoryPage() {
  const [scope, setScope] = useState<Scope>('ACTIVE')
  const [page, setPage] = useState(1)
  const [modalRow, setModalRow] = useState<PostponeRowForModal | null>(null)
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.booking.postponeHistory.useQuery({ scope })
  const deletePostpone = trpc.booking.deletePostpone.useMutation({
    onSuccess: () => {
      utils.booking.postponeHistory.invalidate()
      utils.booking.pendingPostponeCount.invalidate()
    },
  })

  const rows = data ?? []
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function format(d: Date | string) {
    return ymdLocal(new Date(d)).split('-').reverse().join('/')
  }
  function formatExpire(d: Date | string) {
    return new Date(d).toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div>
      <PageHeader title="เลื่อนวันเข้าพัก" />

      {/* Tabs — line-style underline beneath the active label */}
      <div className="mb-4 flex border-b border-gray-200">
        {tabs.map((t) => {
          const active = scope === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setScope(t.key)
                setPage(1)
              }}
              className={cn(
                'relative px-5 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'text-brand-700'
                  : 'text-gray-500 hover:text-gray-800',
              )}
            >
              {t.label}
              {active && (
                <span
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-600"
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="mb-3 text-sm text-gray-500">
        ข้อมูลทั้งหมด {rows.length} รายการ
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 text-center">ลำดับ</th>
                <th className="px-4 py-3">ชื่อที่พัก</th>
                <th className="px-4 py-3">ชื่อลูกค้า</th>
                <th className="px-4 py-3">เช็คอิน</th>
                <th className="px-4 py-3">เช็คเอาท์</th>
                <th className="px-4 py-3">หมดเขตเลื่อนวันเข้าพัก</th>
                <th className="px-4 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isPending && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    กำลังโหลด...
                  </td>
                </tr>
              )}
              {!isPending && pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="text-2xl">🔁</div>
                    <p className="mt-2 text-sm text-gray-500">ยังไม่มีรายการในกลุ่มนี้</p>
                  </td>
                </tr>
              )}
              {pageRows.map((p, idx) => {
                const propName =
                  (p.booking.property.name as { th?: string })?.th ?? p.booking.property.code
                const expired = new Date(p.expiresAt) < new Date()
                const orderNo = (safePage - 1) * PAGE_SIZE + idx + 1
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center text-gray-600">{orderNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="truncate">{propName}</div>
                      <code className="mt-0.5 inline-block rounded bg-gray-100 px-1 py-0.5 font-mono text-[10.5px] text-gray-500">
                        {p.booking.property.code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="truncate">{p.booking.customerName}</div>
                      {p.booking.customerPhone && (
                        <div className="text-xs text-gray-500">{p.booking.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{format(p.booking.checkin)}</td>
                    <td className="px-4 py-3 text-gray-700">{format(p.booking.checkout)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 font-semibold',
                          expired ? 'text-red-600' : 'text-gray-700',
                        )}
                      >
                        {formatExpire(p.expiresAt)}
                        <Icon
                          name={expired ? 'alert' : 'calendar'}
                          className={cn('size-3.5', expired ? 'text-red-500' : 'text-gray-400')}
                        />
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Primary action — opens "จองวันเข้าพักใหม่" modal that
                            captures the new check-in/out dates + optional pricing
                            override + note. */}
                        <Button size="sm" onClick={() => setModalRow(p)}>
                          จองวันเข้าพัก
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('ลบรายการเลื่อนวันเข้าพักนี้?'))
                              deletePostpone.mutate({ id: p.id })
                          }}
                          disabled={deletePostpone.isPending}
                          className="flex size-8 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                          title="ลบรายการ"
                          aria-label="ลบรายการ"
                        >
                          <Icon name="trash" className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer — only shows when there's more than one page */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 border-t border-gray-100 bg-gray-50/50 px-4 py-3">
            <PagerBtn disabled={safePage === 1} onClick={() => setPage(1)}>
              «
            </PagerBtn>
            <PagerBtn
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </PagerBtn>
            {Array.from({ length: totalPages }).map((_, i) => {
              const n = i + 1
              const isActive = n === safePage
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  {n}
                </button>
              )
            })}
            <PagerBtn
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              ›
            </PagerBtn>
            <PagerBtn
              disabled={safePage === totalPages}
              onClick={() => setPage(totalPages)}
            >
              »
            </PagerBtn>
          </div>
        )}
      </div>

      {/* "จองวันเข้าพักใหม่" modal — opens when "จองวันเข้าพัก" button is clicked */}
      <BookNewCheckinModal
        open={!!modalRow}
        row={modalRow}
        onClose={() => setModalRow(null)}
        onSuccess={() => {
          utils.booking.postponeHistory.invalidate()
          utils.booking.pendingPostponeCount.invalidate()
        }}
      />
    </div>
  )
}

function PagerBtn({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex size-8 items-center justify-center rounded-full text-sm text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}
