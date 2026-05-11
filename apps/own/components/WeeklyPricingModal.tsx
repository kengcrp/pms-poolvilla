'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Input, Modal, ModalBody, ModalFooter } from '@pms/ui'

interface Props {
  open: boolean
  onClose: () => void
  variantId: string | null
  variantName: string
}

const DOW_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

export function WeeklyPricingModal({ open, onClose, variantId, variantName }: Props) {
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.pricing.weeklyByVariant.useQuery(
    { variantId: variantId ?? '' },
    { enabled: !!variantId && open },
  )
  const [rows, setRows] = useState<{ price: number; minStay: number }[]>(() =>
    Array.from({ length: 7 }, () => ({ price: 0, minStay: 1 })),
  )

  useEffect(() => {
    if (data) {
      setRows(data.map((r) => ({ price: r.price, minStay: r.minStay })))
    }
  }, [data])

  const upsert = trpc.pricing.upsertWeekly.useMutation({
    onSuccess: () => {
      utils.calendar.range.invalidate()
      onClose()
    },
  })

  function setAll(price: number) {
    setRows((rs) => rs.map(() => ({ price, minStay: 1 })))
  }

  function handleSave() {
    if (!variantId) return
    upsert.mutate({
      variantId,
      rows: rows.map((r, dow) => ({ dayOfWeek: dow, price: r.price, minStay: r.minStay })),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ตั้งค่าเรทราคา"
      description={variantName}
      size="md"
    >
      <ModalBody>
        {isPending ? (
          <div className="text-sm text-gray-500">กำลังโหลด...</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">ตั้งค่าทั้งสัปดาห์เท่ากัน:</span>
              {[2000, 5000, 10000].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAll(p)}
                  className="rounded-full bg-gray-100 px-3 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
                >
                  ฿{p.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_2fr_1fr] items-center gap-3 border-b border-gray-200 pb-2 text-xs font-semibold text-gray-500">
              <div>วัน</div>
              <div>ราคาขาย (฿)</div>
              <div>ขั้นต่ำ (คืน)</div>
            </div>
            {rows.map((row, dow) => (
              <div key={dow} className="grid grid-cols-[1fr_2fr_1fr] items-center gap-3">
                <div className="text-sm text-gray-700">{DOW_FULL[dow]}</div>
                <Input
                  type="number"
                  min={0}
                  step="100"
                  value={row.price}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setRows((rs) => rs.map((r, i) => (i === dow ? { ...r, price: v } : r)))
                  }}
                />
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={row.minStay}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value))
                    setRows((rs) => rs.map((r, i) => (i === dow ? { ...r, minStay: v } : r)))
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button onClick={handleSave} disabled={upsert.isPending || isPending}>
          {upsert.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
