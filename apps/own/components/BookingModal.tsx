'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { ymdLocal } from '@/lib/date'
import { Badge, Button, Input, Label, Modal, ModalBody, ModalFooter, Select, Textarea, cn } from '@pms/ui'

type Tab = 'quick' | 'pending' | 'invoice' | 'block'

interface Props {
  open: boolean
  onClose: () => void
  variantId: string | null
  variantLabel: string
  initialDate: Date | null
}

const tabs: { key: Tab; label: string }[] = [
  { key: 'quick', label: 'จองด่วน' },
  { key: 'pending', label: 'รอยอด' },
  { key: 'invoice', label: 'ทำใบจอง' },
  { key: 'block', label: 'ปิดซ่อม' },
]

const statusBadgeMap = {
  BOOKED: { label: 'booked', variant: 'danger' as const },
  PENDING_PAYMENT: { label: 'pending_payment', variant: 'warning' as const },
  UNDER_MAINTENANCE: { label: 'under_maintenance', variant: 'default' as const },
  OPEN: { label: 'open', variant: 'success' as const },
}

export function BookingModal({ open, onClose, variantId, variantLabel, initialDate }: Props) {
  const utils = trpc.useUtils()
  const [tab, setTab] = useState<Tab>('quick')
  const [error, setError] = useState<string | null>(null)

  const dateStr = initialDate ? ymdLocal(initialDate) : ''
  const nextDayStr = initialDate
    ? ymdLocal(new Date(initialDate.getTime() + 86400000))
    : ''

  const [form, setForm] = useState({
    checkin: '',
    checkout: '',
    customerName: '',
    customerPhone: '',
    bookerName: '',
    guestCount: 2,
    total: 0,
    deposit: 0,
    paymentMethod: 'TRANSFER' as 'TRANSFER' | 'CARD' | 'MOBILE_BANKING',
    publicNote: '',
    internalNote: '',
    paymentDueAt: '',
    vat: false,
    showLogo: false,
    blockNote: '',
  })

  useEffect(() => {
    if (!open) return
    setError(null)
    setTab('quick')
    setForm({
      checkin: dateStr,
      checkout: nextDayStr,
      customerName: '',
      customerPhone: '',
      bookerName: '',
      guestCount: 2,
      total: 0,
      deposit: 0,
      paymentMethod: 'TRANSFER',
      publicNote: '',
      internalNote: '',
      paymentDueAt: '',
      vat: false,
      showLogo: false,
      blockNote: '',
    })
  }, [open, dateStr, nextDayStr])

  // What's at this date already?
  const { data: cell } = trpc.booking.atDate.useQuery(
    { variantId: variantId ?? '', date: dateStr },
    { enabled: !!variantId && !!dateStr && open },
  )

  const invalidateAll = () => {
    utils.calendar.range.invalidate()
    utils.booking.atDate.invalidate()
  }

  const createConfirmed = trpc.booking.createConfirmed.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(e.message) })
  const createPending = trpc.booking.createPending.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(e.message) })
  const createInvoice = trpc.booking.createInvoice.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(e.message) })
  const blockDates = trpc.booking.blockDates.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(e.message) })
  const cancel = trpc.booking.cancel.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(e.message) })
  const unblock = trpc.booking.unblockDates.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(e.message) })

  if (!variantId) return null

  const submit = () => {
    setError(null)
    if (!form.checkin || !form.checkout) return setError('กรุณาเลือกวันที่')
    const base = {
      variantId,
      checkin: form.checkin,
      checkout: form.checkout,
      customerName: form.customerName,
      customerPhone: form.customerPhone || undefined,
      bookerName: form.bookerName || form.customerName,
      guestCount: form.guestCount,
      total: form.total,
      publicNote: form.publicNote || undefined,
      internalNote: form.internalNote || undefined,
    }
    if (tab === 'block') {
      return blockDates.mutate({
        variantId,
        checkin: form.checkin,
        checkout: form.checkout,
        note: form.blockNote || undefined,
      })
    }
    if (!form.customerName) return setError('กรุณาระบุชื่อลูกค้า')
    if (tab === 'quick') {
      return createConfirmed.mutate({ ...base, paymentMethod: form.paymentMethod })
    }
    if (tab === 'pending') {
      if (!form.paymentDueAt) return setError('กรุณาระบุวันนัดชำระ')
      return createPending.mutate({
        ...base,
        deposit: form.deposit,
        paymentDueAt: new Date(form.paymentDueAt).toISOString(),
        paymentMethod: form.paymentMethod,
      })
    }
    if (tab === 'invoice') {
      return createInvoice.mutate({
        ...base,
        deposit: form.deposit,
        vat: form.vat,
        showLogo: form.showLogo,
        paymentMethod: form.paymentMethod,
      })
    }
  }

  const isExisting = cell && cell.status !== 'OPEN'
  const existingBadge = cell ? statusBadgeMap[cell.status] : null

  return (
    <Modal open={open} onClose={onClose} title="ทำรายการจอง" description={variantLabel} size="lg">
      <ModalBody>
        {isExisting && cell.booking && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <Badge variant={existingBadge!.variant}>{existingBadge!.label}</Badge>
              <span className="text-sm font-medium text-gray-900">{cell.booking.customerName}</span>
            </div>
            <div className="mt-1 text-xs text-gray-600">
              {ymdLocal(cell.booking.checkin)} → {ymdLocal(cell.booking.checkout)} · {cell.booking.guestCount} ท่าน · ฿{Number(cell.booking.total).toLocaleString()}
            </div>
            {cell.booking.publicNote && <div className="mt-1 text-xs text-gray-500">{cell.booking.publicNote}</div>}
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (confirm('ยืนยันยกเลิกการจอง? วันที่จะกลับเป็น open')) cancel.mutate({ id: cell.booking!.id })
                }}
              >
                ยกเลิกการจอง
              </Button>
            </div>
          </div>
        )}

        {isExisting && !cell.booking && cell.status === 'UNDER_MAINTENANCE' && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <Badge variant="default">under_maintenance</Badge>
            {cell.note && <div className="mt-1 text-xs text-gray-600">{cell.note}</div>}
            <div className="mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  unblock.mutate({
                    variantId,
                    checkin: form.checkin,
                    checkout: form.checkout,
                  })
                }
              >
                ปลดล็อค
              </Button>
            </div>
          </div>
        )}

        <div className="mb-4 flex gap-1 border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>วันที่เช็คอิน</Label>
            <Input
              type="date"
              value={form.checkin}
              onChange={(e) => setForm({ ...form, checkin: e.target.value })}
            />
          </div>
          <div>
            <Label required>วันที่เช็คเอาท์</Label>
            <Input
              type="date"
              value={form.checkout}
              onChange={(e) => setForm({ ...form, checkout: e.target.value })}
            />
          </div>
        </div>

        {tab !== 'block' && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Label required>ชื่อลูกค้า</Label>
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                />
              </div>
              <div>
                <Label>เบอร์โทรศัพท์</Label>
                <Input
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Label>ชื่อผู้จอง (ถ้าต่างจากลูกค้า)</Label>
                <Input
                  value={form.bookerName}
                  onChange={(e) => setForm({ ...form, bookerName: e.target.value })}
                  placeholder={form.customerName}
                />
              </div>
              <div>
                <Label required>จำนวนผู้เข้าพัก</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.guestCount}
                  onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Label required>ราคารวม (฿)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.total}
                  onChange={(e) => setForm({ ...form, total: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>วิธีชำระเงิน</Label>
                <Select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as typeof form.paymentMethod })}
                >
                  <option value="TRANSFER">โอนเงิน</option>
                  <option value="CARD">บัตรเครดิต</option>
                  <option value="MOBILE_BANKING">Mobile Banking</option>
                </Select>
              </div>
            </div>

            {(tab === 'pending' || tab === 'invoice') && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label required={tab === 'pending'}>มัดจำ (฿)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.deposit}
                    onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })}
                  />
                </div>
                {tab === 'pending' && (
                  <div>
                    <Label required>กำหนดวันนัดชำระ</Label>
                    <Input
                      type="datetime-local"
                      value={form.paymentDueAt}
                      onChange={(e) => setForm({ ...form, paymentDueAt: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-gray-500">หากเลยกำหนด ระบบจะยกเลิกการจองอัตโนมัติ</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'invoice' && (
              <div className="mt-4 flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.vat}
                    onChange={(e) => setForm({ ...form, vat: e.target.checked })}
                    className="size-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">VAT 7%</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.showLogo}
                    onChange={(e) => setForm({ ...form, showLogo: e.target.checked })}
                    className="size-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">แสดงโลโก้ในใบจอง</span>
                </label>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Label>หมายเหตุ (แสดงในใบจอง)</Label>
                <Textarea
                  rows={3}
                  value={form.publicNote}
                  onChange={(e) => setForm({ ...form, publicNote: e.target.value })}
                />
              </div>
              <div>
                <Label>โน้ตเพิ่มเติม (เฉพาะหลังบ้าน)</Label>
                <Textarea
                  rows={3}
                  value={form.internalNote}
                  onChange={(e) => setForm({ ...form, internalNote: e.target.value })}
                />
              </div>
            </div>
          </>
        )}

        {tab === 'block' && (
          <div className="mt-4">
            <Label>หมายเหตุ (สาเหตุ)</Label>
            <Textarea
              rows={3}
              value={form.blockNote}
              onChange={(e) => setForm({ ...form, blockNote: e.target.value })}
              placeholder="เช่น ซ่อมระบบไฟ, ทำความสะอาดใหญ่"
            />
          </div>
        )}

        {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          ปิด
        </Button>
        <Button onClick={submit}>
          {tab === 'block' ? 'ปิดซ่อม' : tab === 'invoice' ? 'ออกใบจอง' : 'ยืนยัน'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
