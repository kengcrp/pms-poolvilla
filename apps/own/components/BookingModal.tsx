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

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'quick', label: 'จองด่วน', icon: '⚡' },
  { key: 'pending', label: 'รอยอด', icon: '⏳' },
  { key: 'invoice', label: 'ทำใบจอง', icon: '🧾' },
  { key: 'block', label: 'ปิดซ่อม', icon: '🛠' },
]

const statusBadgeMap = {
  BOOKED: { label: 'จองแล้ว', variant: 'danger' as const },
  PENDING_PAYMENT: { label: 'รอชำระ', variant: 'warning' as const },
  UNDER_MAINTENANCE: { label: 'ปิดซ่อม', variant: 'default' as const },
  OPEN: { label: 'ว่าง', variant: 'success' as const },
}

export function BookingModal({ open, onClose, variantId, variantLabel, initialDate }: Props) {
  const utils = trpc.useUtils()
  const [tab, setTab] = useState<Tab>('quick')
  const [error, setError] = useState<string | null>(null)

  const dateStr = initialDate ? ymdLocal(initialDate) : ''
  const nextDayStr = initialDate ? ymdLocal(new Date(initialDate.getTime() + 86400000)) : ''

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
    couponCode: '',
  })
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; discount: number; code: string } | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setTab('quick')
    setAppliedCoupon(null)
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
      couponCode: '',
    })
  }, [open, dateStr, nextDayStr])

  const { data: cell } = trpc.booking.atDate.useQuery(
    { variantId: variantId ?? '', date: dateStr },
    { enabled: !!variantId && !!dateStr && open },
  )

  const invalidateAll = () => {
    utils.calendar.range.invalidate()
    utils.booking.atDate.invalidate()
  }

  const [validating, setValidating] = useState(false)
  async function applyCoupon() {
    setError(null)
    if (!form.couponCode.trim()) return
    if (!form.total || form.total <= 0) {
      return setError('กรอกราคารวมก่อนใช้คูปอง')
    }
    setValidating(true)
    try {
      const res = await utils.coupon.validate.fetch({ code: form.couponCode, basePrice: form.total })
      if (!res.ok) {
        setAppliedCoupon(null)
        return setError(res.reason ?? 'คูปองใช้ไม่ได้')
      }
      setAppliedCoupon({ id: res.coupon.id, discount: res.discount, code: res.coupon.code })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setValidating(false)
    }
  }
  function clearCoupon() {
    setAppliedCoupon(null)
    setForm({ ...form, couponCode: '' })
  }

  const createConfirmed = trpc.booking.createConfirmed.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(e.message) })
  const createPending = trpc.booking.createPending.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(e.message) })
  const createInvoice = trpc.booking.createInvoice.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(e.message) })
  const blockDates = trpc.booking.blockDates.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(e.message) })
  const cancel = trpc.booking.cancel.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(e.message) })
  const unblock = trpc.booking.unblockDates.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(e.message) })

  const submit = () => {
    if (!variantId) return
    setError(null)
    if (!form.checkin || !form.checkout) return setError('กรุณาเลือกวันที่')
    const finalTotal = appliedCoupon ? Math.max(0, form.total - appliedCoupon.discount) : form.total
    const base = {
      variantId,
      checkin: form.checkin,
      checkout: form.checkout,
      customerName: form.customerName,
      customerPhone: form.customerPhone || undefined,
      bookerName: form.bookerName || form.customerName,
      guestCount: form.guestCount,
      total: finalTotal,
      publicNote: form.publicNote || undefined,
      internalNote: form.internalNote || undefined,
      couponId: appliedCoupon?.id,
    }
    if (tab === 'block') {
      return blockDates.mutate({ variantId: variantId!, checkin: form.checkin, checkout: form.checkout, note: form.blockNote || undefined })
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
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={existingBadge!.variant} dot>{existingBadge!.label}</Badge>
                  <span className="font-semibold text-gray-900">{cell.booking.customerName}</span>
                </div>
                <div className="mt-1.5 text-xs text-gray-600">
                  {ymdLocal(cell.booking.checkin)} → {ymdLocal(cell.booking.checkout)} · {cell.booking.guestCount} ท่าน · ฿{Number(cell.booking.total).toLocaleString()}
                </div>
                {cell.booking.publicNote && <div className="mt-1 text-xs text-gray-500">{cell.booking.publicNote}</div>}
              </div>
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
          <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="default" dot>ปิดซ่อม</Badge>
                {cell.note && <div className="mt-1.5 text-xs text-gray-600">{cell.note}</div>}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => variantId && unblock.mutate({ variantId, checkin: form.checkin, checkout: form.checkout })}
              >
                ปลดล็อค
              </Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl bg-gray-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                tab === t.key
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Date row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>วันที่เช็คอิน</Label>
            <Input type="date" value={form.checkin} onChange={(e) => setForm({ ...form, checkin: e.target.value })} />
          </div>
          <div>
            <Label required>วันที่เช็คเอาท์</Label>
            <Input type="date" value={form.checkout} onChange={(e) => setForm({ ...form, checkout: e.target.value })} />
          </div>
        </div>

        {tab !== 'block' && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Label required>ชื่อลูกค้า</Label>
                <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </div>
              <div>
                <Label>เบอร์โทรศัพท์</Label>
                <Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Label>ชื่อผู้จอง</Label>
                <Input
                  value={form.bookerName}
                  onChange={(e) => setForm({ ...form, bookerName: e.target.value })}
                  placeholder={form.customerName || 'ถ้าต่างจากลูกค้า'}
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

            <div className="mt-4">
              <Label>คูปอง</Label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="success" dot>
                      {appliedCoupon.code}
                    </Badge>
                    <span className="text-sm text-emerald-800">
                      ส่วนลด ฿{appliedCoupon.discount.toLocaleString()} · สุทธิ ฿{Math.max(0, form.total - appliedCoupon.discount).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearCoupon}
                    className="text-xs text-emerald-700 hover:text-emerald-900"
                  >
                    ลบ
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={form.couponCode}
                    onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                    placeholder="กรอกรหัสคูปอง"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={applyCoupon}
                    disabled={!form.couponCode || validating}
                  >
                    {validating ? '...' : 'ใช้'}
                  </Button>
                </div>
              )}
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
                  </div>
                )}
              </div>
            )}

            {tab === 'pending' && (
              <p className="mt-1 text-xs text-gray-500">
                💡 หากเลยกำหนดและยังไม่ชำระ ระบบจะยกเลิกอัตโนมัติ
              </p>
            )}

            {tab === 'invoice' && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition-colors hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.vat}
                    onChange={(e) => setForm({ ...form, vat: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">VAT 7%</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition-colors hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.showLogo}
                    onChange={(e) => setForm({ ...form, showLogo: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">แสดงโลโก้ในใบจอง</span>
                </label>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Label>หมายเหตุ (แสดงในใบจอง)</Label>
                <Textarea rows={3} value={form.publicNote} onChange={(e) => setForm({ ...form, publicNote: e.target.value })} />
              </div>
              <div>
                <Label>โน้ตเพิ่มเติม (เฉพาะหลังบ้าน)</Label>
                <Textarea rows={3} value={form.internalNote} onChange={(e) => setForm({ ...form, internalNote: e.target.value })} />
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

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {error}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          ปิด
        </Button>
        <Button onClick={submit} variant={tab === 'block' ? 'secondary' : tab === 'invoice' ? 'primary' : 'primary'}>
          {tab === 'block' ? 'ปิดซ่อม' : tab === 'invoice' ? 'ออกใบจอง' : tab === 'pending' ? 'บันทึก รอยอด' : 'จองด่วน'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
