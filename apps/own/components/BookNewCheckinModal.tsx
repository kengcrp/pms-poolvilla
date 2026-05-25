'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Icon, Input, Label } from '@pms/ui'
import { ymdLocal } from '@/lib/date'

/** Shape of one postpone-history row (subset of fields we need to pre-fill). */
export interface PostponeRowForModal {
  id: string
  expiresAt: Date | string
  booking: {
    customerName: string
    customerPhone: string | null
    bookerName: string
    checkin: Date | string
    checkout: Date | string
    total: { toString(): string }
    deposit: { toString(): string }
    property: {
      code: string
      name: unknown
    }
  }
}

interface Props {
  open: boolean
  row: PostponeRowForModal | null
  onClose: () => void
  onSuccess: () => void
}

/** Modal opened from /manage/postpone "จองวันเข้าพักใหม่" — the redesigned
 *  layout compacts customer + original-stay context into a single info card at
 *  the top, then gives the new-dates form a prominent visual block below. */
export function BookNewCheckinModal({ open, row, onClose, onSuccess }: Props) {
  const complete = trpc.booking.completePostpone.useMutation({
    onSuccess: () => {
      onSuccess()
      onClose()
    },
    onError: (e) => setError(e.message),
  })

  const [form, setForm] = useState({
    newCheckin: '',
    newCheckout: '',
    deposit: '',
    total: '',
    note: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!row) return
    setForm({ newCheckin: '', newCheckout: '', deposit: '', total: '', note: '' })
    setError(null)
  }, [row])

  if (!open || !row) return null

  const propertyName =
    (row.booking.property.name as { th?: string })?.th ?? row.booking.property.code
  const originalCheckin = ymdLocal(new Date(row.booking.checkin))
  const originalCheckout = ymdLocal(new Date(row.booking.checkout))
  const originalDeposit = Number(row.booking.deposit.toString())
  const originalTotal = Number(row.booking.total.toString())
  // Calculate original night count for the summary line
  const originalNights = Math.max(
    1,
    Math.round(
      (new Date(row.booking.checkout).getTime() - new Date(row.booking.checkin).getTime()) /
        86_400_000,
    ),
  )

  function submit() {
    if (!row) return
    setError(null)
    if (!form.newCheckin || !form.newCheckout) {
      setError('กรุณาเลือกวันเช็คอินและวันเช็คเอาท์ใหม่')
      return
    }
    complete.mutate({
      id: row.id,
      newCheckin: form.newCheckin,
      newCheckout: form.newCheckout,
      deposit: form.deposit ? Number(form.deposit) : undefined,
      total: form.total ? Number(form.total) : undefined,
      note: form.note || undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-new-checkin-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <h2 id="book-new-checkin-title" className="text-lg font-bold text-gray-900">
              จองวันเข้าพักใหม่
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              เลือกวันใหม่สำหรับ {row.booking.customerName} · {propertyName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="ปิด"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Context summary card — compact icon-led rows, all read-only */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              ข้อมูลการจองเดิม
            </div>
            <div className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2 sm:gap-x-6">
              <SummaryRow
                icon="user"
                label="ลูกค้า"
                value={row.booking.customerName}
                sub={row.booking.customerPhone ?? undefined}
              />
              <SummaryRow
                icon="users"
                label="ผู้จอง / Agent"
                value={row.booking.bookerName || '—'}
              />
              <SummaryRow icon="home" label="ที่พัก" value={propertyName} />
              <SummaryRow
                icon="calendar"
                label="วันเข้าพักเดิม"
                value={`${originalCheckin} → ${originalCheckout}`}
                sub={`${originalNights} คืน`}
              />
              <SummaryRow
                icon="money"
                label="ราคารวม"
                value={`฿${originalTotal.toLocaleString()}`}
              />
              <SummaryRow
                icon="cash"
                label="เงินมัดจำ"
                value={`฿${originalDeposit.toLocaleString()}`}
              />
            </div>
          </div>

          {/* New stay form — visually prominent (brand-tinted card) */}
          <div className="rounded-xl border-2 border-brand-200 bg-brand-50/30 p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-full bg-brand-600 text-white">
                <Icon name="calendarPlus" className="size-3.5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">เลือกวันเข้าพักใหม่</h3>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label required>วันเช็คอินใหม่</Label>
                  <Input
                    type="date"
                    value={form.newCheckin}
                    onChange={(e) => setForm({ ...form, newCheckin: e.target.value })}
                  />
                </div>
                <div>
                  <Label required>วันเช็คเอาท์ใหม่</Label>
                  <Input
                    type="date"
                    value={form.newCheckout}
                    onChange={(e) => setForm({ ...form, newCheckout: e.target.value })}
                  />
                </div>
              </div>

              {/* Pricing override — collapsed by default feel; small + secondary */}
              <details className="rounded-lg border border-gray-200 bg-white p-3 [&[open]>summary>svg]:rotate-180">
                <summary className="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-gray-700 [&::-webkit-details-marker]:hidden">
                  <span>ปรับราคาเพิ่ม (ไม่บังคับ)</span>
                  <svg className="size-3.5 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                </summary>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>เงินมัดจำ</Label>
                    <Input
                      type="number"
                      min={0}
                      step="100"
                      value={form.deposit}
                      onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                      placeholder={`เดิม: ${originalDeposit.toLocaleString()}`}
                    />
                  </div>
                  <div>
                    <Label>ราคารวม</Label>
                    <Input
                      type="number"
                      min={0}
                      step="100"
                      value={form.total}
                      onChange={(e) => setForm({ ...form, total: e.target.value })}
                      placeholder={`เดิม: ${originalTotal.toLocaleString()}`}
                    />
                  </div>
                </div>
              </details>

              <div>
                <Label>หมายเหตุ (ไม่บังคับ)</Label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="เช่น ลูกค้าขอเลื่อน, ปรับตามคำขอ"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/40 px-6 py-3">
          <Button variant="secondary" type="button" onClick={onClose}>
            ปิด
          </Button>
          <Button type="button" onClick={submit} disabled={complete.isPending}>
            {complete.isPending ? 'กำลังบันทึก...' : 'ยืนยันจองวันใหม่'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Single summary row inside the context card — icon + label + value (+ optional sub) */
function SummaryRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: 'user' | 'users' | 'home' | 'calendar' | 'money' | 'cash'
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 ring-1 ring-gray-200">
        <Icon name={icon} className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-gray-900">{value}</div>
        {sub && <div className="text-[11px] text-gray-500">{sub}</div>}
      </div>
    </div>
  )
}
