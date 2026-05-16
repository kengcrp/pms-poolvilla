'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { ymdLocal } from '@/lib/date'
import { Badge, Button, Input, Label, Modal, ModalBody, ModalFooter, Textarea } from '@pms/ui'

interface BookingLite {
  id: string
  customerName: string
  checkin: Date | string
  checkout: Date | string
  status: string
}

interface Props {
  open: boolean
  onClose: () => void
  booking: BookingLite | null
}

export function PostponeModal({ open, onClose, booking }: Props) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState({
    newCheckin: '',
    newCheckout: '',
    reason: '',
    expiresAt: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !booking) return
    setError(null)
    // Default expiry = 30 days from today (local)
    const exp = new Date()
    exp.setDate(exp.getDate() + 30)
    setForm({
      newCheckin: ymdLocal(new Date(booking.checkin)),
      newCheckout: ymdLocal(new Date(booking.checkout)),
      reason: '',
      expiresAt: ymdLocal(exp),
    })
  }, [open, booking])

  const postpone = trpc.booking.postpone.useMutation({
    onSuccess: () => {
      utils.booking.list.invalidate()
      utils.booking.postponeHistory.invalidate()
      utils.calendar.range.invalidate()
      onClose()
    },
    onError: (e) => setError(e.message),
  })

  function submit() {
    if (!booking) return
    setError(null)
    if (!form.newCheckin || !form.newCheckout) return setError('กรุณาเลือกวันที่')
    postpone.mutate({
      id: booking.id,
      newCheckin: form.newCheckin,
      newCheckout: form.newCheckout,
      reason: form.reason || undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
    })
  }

  if (!booking) return null

  return (
    <Modal open={open} onClose={onClose} title="เลื่อนวันเข้าพัก" description={booking.customerName} size="md">
      <ModalBody>
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="text-xs text-gray-500">วันที่ปัจจุบัน</div>
          <div className="mt-0.5 text-sm font-medium text-gray-900">
            {ymdLocal(new Date(booking.checkin))} → {ymdLocal(new Date(booking.checkout))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>วันที่เช็คอินใหม่</Label>
            <Input
              type="date"
              value={form.newCheckin}
              onChange={(e) => setForm({ ...form, newCheckin: e.target.value })}
            />
          </div>
          <div>
            <Label required>วันที่เช็คเอาท์ใหม่</Label>
            <Input
              type="date"
              value={form.newCheckout}
              onChange={(e) => setForm({ ...form, newCheckout: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4">
          <Label>หมดเขตเลื่อนวัน (ถ้าไม่เช็คอินภายในวันนี้ถือเป็นยกเลิก)</Label>
          <Input
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
          <p className="mt-1 text-xs text-gray-500">ค่าเริ่มต้น 30 วันนับจากวันนี้</p>
        </div>

        <div className="mt-4">
          <Label>เหตุผล</Label>
          <Textarea
            rows={3}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="เช่น ลูกค้าติดธุระ ขอเลื่อนนัด"
          />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-800 ring-1 ring-inset ring-blue-200">
          <Badge variant="info">i</Badge>
          <span>
            เมื่อเลื่อนแล้ว — cell ปฏิทินวันเดิมจะปลดล็อค (open) อัตโนมัติ และวันใหม่จะถูก mark ตามสถานะการจองเดิม
          </span>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {error}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button onClick={submit} disabled={postpone.isPending}>
          {postpone.isPending ? 'กำลังเลื่อน...' : 'เลื่อนวันเข้าพัก'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
