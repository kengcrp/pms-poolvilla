'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { ymd } from '@/lib/date'
import { Button, Input, Label, Modal, ModalBody, ModalFooter, NumberInput, cn } from '@pms/ui'

interface Props {
  open: boolean
  onClose: () => void
  variantId: string | null
  variantLabel: string
  initialDate: Date | null
}

type PriceTag = 'NORMAL' | 'SPECIAL' | 'DISCOUNT'

/**
 * Per-day price override modal — opened from the pricing page calendar.
 * Lets the owner set a custom price for a date range (defaults to single night)
 * and optionally tag the day as "วันสำคัญ" (SPECIAL) or "promotion" (DISCOUNT).
 */
export function DayPriceModal({ open, onClose, variantId, variantLabel, initialDate }: Props) {
  const utils = trpc.useUtils()
  const [error, setError] = useState<string | null>(null)

  // Use UTC-based ymd to match how MiniCalendar / API store dates (UTC midnight).
  const dateStr = initialDate ? ymd(initialDate) : ''
  const nextDayStr = initialDate ? ymd(new Date(initialDate.getTime() + 86400000)) : ''

  const [form, setForm] = useState({
    checkin: '',
    checkout: '',
    price: 0,
    agentPrice: 0,
    tag: 'NORMAL' as PriceTag,
    note: '',
  })

  // Load current price / override for the clicked date (single-night preview)
  const { data: dayInfo, isFetching: dayLoading } = trpc.calendar.range.useQuery(
    { variantId: variantId ?? '', from: dateStr, to: dateStr },
    { enabled: !!variantId && !!dateStr && open },
  )
  const todayData = dayInfo?.[0]
  // True while the click → data-arrived gap; we suppress the form during this window
  // so the user never sees a flash of "0" before the actual price loads.
  const isLoading = !!variantId && !!dateStr && open && (dayLoading || !dayInfo)

  // Reset form when modal opens — defaults are placeholders while data loads
  useEffect(() => {
    if (!open) return
    setError(null)
    setForm({
      checkin: dateStr,
      checkout: nextDayStr,
      price: 0,
      agentPrice: 0,
      tag: 'NORMAL',
      note: '',
    })
  }, [open, dateStr, nextDayStr])

  // When data arrives, populate the form with the day's actual override / weekly default
  useEffect(() => {
    if (!todayData) return
    setForm((prev) => ({
      ...prev,
      price: todayData.price ?? 0,
      agentPrice: todayData.agentPrice ?? 0,
      tag:
        todayData.priceType === 'SPECIAL'
          ? 'SPECIAL'
          : todayData.priceType === 'DISCOUNT'
            ? 'DISCOUNT'
            : 'NORMAL',
      note: todayData.note ?? '',
    }))
  }, [todayData])

  const invalidateAll = () => {
    utils.calendar.range.invalidate()
    utils.calendar.byProperty.invalidate()
  }

  const setOverride = trpc.pricing.setDayOverride.useMutation({
    onSuccess: () => {
      invalidateAll()
      onClose()
    },
    onError: (e) => setError(e.message),
  })
  const clearOverride = trpc.pricing.clearDayOverride.useMutation({
    onSuccess: () => {
      invalidateAll()
      onClose()
    },
    onError: (e) => setError(e.message),
  })

  const submit = () => {
    if (!variantId) return
    setError(null)
    if (!form.checkin || !form.checkout) return setError('กรุณาเลือกวันที่')
    if (form.checkin >= form.checkout) return setError('วันออกต้องอยู่หลังวันเข้า')
    setOverride.mutate({
      variantId,
      checkin: form.checkin,
      checkout: form.checkout,
      price: form.price,
      // Send agent price too — null when 0 so the calendar shows "—" in agent mode
      agentPrice: form.agentPrice > 0 ? form.agentPrice : null,
      priceType: form.tag === 'NORMAL' ? null : form.tag,
      note: form.note || null,
    })
  }

  const reset = () => {
    if (!variantId) return
    clearOverride.mutate({
      variantId,
      checkin: form.checkin,
      checkout: form.checkout,
    })
  }

  const hasExistingOverride =
    !!todayData && (todayData.isOverride && (todayData.priceType !== null || todayData.isOverride))

  return (
    <Modal open={open} onClose={onClose} title="ปรับราคารายวัน" description={variantLabel} size="lg">
      <ModalBody>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading skeleton — replaces the form during the brief click → data-loaded window
            so the user sees the day's actual price load in without a flash of 0. */}
        {isLoading && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
            <span className="size-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            กำลังโหลดข้อมูลราคาวันนี้...
          </div>
        )}

        {/* Date range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>วันที่เริ่ม</Label>
            <Input
              type="date"
              value={form.checkin}
              onChange={(e) => setForm({ ...form, checkin: e.target.value })}
            />
          </div>
          <div>
            <Label required>วันที่สิ้นสุด</Label>
            <Input
              type="date"
              value={form.checkout}
              onChange={(e) => setForm({ ...form, checkout: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-gray-500">
              ราคาจะใช้กับคืนที่ {form.checkin || '—'} ถึงคืนก่อน {form.checkout || '—'}
            </p>
          </div>
        </div>

        {/* Prices */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-brand-50/50 p-4 ring-1 ring-inset ring-brand-100">
            <Label>ราคาขาย (฿)</Label>
            <NumberInput
              value={form.price}
              onChange={(v) => setForm({ ...form, price: v })}
              className="text-lg font-semibold tabular-nums"
            />
          </div>
          <div className="rounded-xl bg-amber-50/50 p-4 ring-1 ring-inset ring-amber-100">
            <Label>ราคาส่ง / Agent (฿)</Label>
            <NumberInput
              value={form.agentPrice}
              onChange={(v) => setForm({ ...form, agentPrice: v })}
              className="text-lg font-semibold tabular-nums"
              placeholder="0"
              title="ตั้งราคาส่ง Agent สำหรับวันนี้ (ใช้แทนค่าตั้งต้นรายสัปดาห์)"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              ปล่อยเป็น 0 = ใช้ค่ารายสัปดาห์ที่ตั้งไว้
            </p>
          </div>
        </div>

        {/* Tag radios */}
        <div className="mt-5">
          <Label>สถานะวัน</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                { val: 'NORMAL', label: 'ราคาปกติ', class: 'text-gray-700' },
                { val: 'DISCOUNT', label: 'โปรโมชั่น (ลดราคา)', class: 'text-red-600' },
                { val: 'SPECIAL', label: 'วันสำคัญ (ราคาพิเศษ)', class: 'text-blue-600' },
              ] as const
            ).map((opt) => {
              const active = form.tag === opt.val
              return (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setForm({ ...form, tag: opt.val })}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm shadow-brand-500/10'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex size-3.5 items-center justify-center rounded-full border',
                      active ? 'border-brand-500' : 'border-gray-300',
                    )}
                  >
                    {active && <span className="size-1.5 rounded-full bg-brand-600" />}
                  </span>
                  <span className={opt.class}>{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Note */}
        <div className="mt-5">
          <Label>หมายเหตุ (เช่น "ราคาปีใหม่")</Label>
          <Input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="ระบุเหตุผลการปรับราคา (ไม่บังคับ)"
          />
        </div>

        {hasExistingOverride && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
            วันนี้มีราคา override อยู่แล้ว — กด <strong>"รีเซ็ตเป็นราคาปกติ"</strong> เพื่อล้าง
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {hasExistingOverride && (
          <Button
            variant="ghost"
            onClick={reset}
            disabled={clearOverride.isPending}
            className="mr-auto text-gray-500 hover:text-red-600"
          >
            {clearOverride.isPending ? 'กำลังรีเซ็ต...' : 'รีเซ็ตเป็นราคาปกติ'}
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button onClick={submit} disabled={setOverride.isPending}>
          {setOverride.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
