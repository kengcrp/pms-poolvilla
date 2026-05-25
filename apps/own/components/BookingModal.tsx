'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { ymd } from '@/lib/date'
import { Badge, Button, Icon, Input, Label, Modal, ModalBody, ModalFooter, Select, Textarea, cn, type IconName } from '@pms/ui'

type Tab = 'quick' | 'pending' | 'invoice' | 'block'

interface Props {
  open: boolean
  onClose: () => void
  variantId: string | null
  variantLabel: string
  initialDate: Date | null
}

/** Per-tab active style — matches the eventual booking status color so the
 *  user immediately sees what they're about to create.
 *  จองด่วน=BOOKED red, รอชำระ=PENDING amber, ทำใบจอง=brand, ปิดซ่อม=gray. */
const tabs: { key: Tab; label: string; icon: IconName; activeClass: string }[] = [
  { key: 'quick',   label: 'จองด่วน',  icon: 'bolt',      activeClass: 'bg-white text-red-600 shadow-sm shadow-red-200 ring-1 ring-red-100' },
  { key: 'pending', label: 'รอชำระ',   icon: 'hourglass', activeClass: 'bg-white text-amber-600 shadow-sm shadow-amber-200 ring-1 ring-amber-100' },
  { key: 'invoice', label: 'ทำใบจอง',  icon: 'receipt',   activeClass: 'bg-white text-brand-700 shadow-sm shadow-brand-200 ring-1 ring-brand-100' },
  { key: 'block',   label: 'ปิดซ่อม',  icon: 'toolbox',   activeClass: 'bg-white text-gray-700 shadow-sm ring-1 ring-gray-200' },
]

export function BookingModal({ open, onClose, variantId, variantLabel, initialDate }: Props) {
  const utils = trpc.useUtils()
  const [tab, setTab] = useState<Tab>('quick')
  const [error, setError] = useState<string | null>(null)
  // Postpone mode replaces the booking-creation tabs with a "move check-in date" form.
  // Triggered by the "เลื่อนวันเข้าพัก" button on an existing booking banner.
  const [postponeMode, setPostponeMode] = useState(false)
  const [postponeForm, setPostponeForm] = useState({
    newCheckin: '',
    newCheckout: '',
    /** Free-text additional note — only used when "อื่นๆ" is selected. */
    reason: '',
    /** Checked preset reasons (multi-select) */
    reasonChecks: [] as string[],
    /** Whether "อื่นๆ" is checked — reveals the free-text note field */
    reasonOther: false,
    expiresAt: '',
    /** When true, the owner is postponing without committing to new dates yet.
     *  The booking still appears in /manage/postpone history under "ประวัติเลื่อนเข้าพัก"
     *  with a "ยังไม่ระบุวัน" status, and the original dates are freed. */
    dateUnspecified: false,
  })

  /** Preset postpone reasons — owner ticks one or more; "อื่นๆ" opens a textarea. */
  const POSTPONE_REASON_PRESETS = [
    'สมาชิกในกลุ่มเจ็บป่วยกะทันหัน หรือติดธุระด่วน',
    'สมาชิกในกลุ่มเกิดการเปลี่ยนแปลง (คนมาไม่ได้ / สมาชิกขอยกเลิก)',
    'สภาพอากาศไม่เอื้ออำนวย (เช่น พายุเข้า ฝนตกหนัก น้ำท่วม)',
    'เกิดภัยธรรมชาติตามเส้นทางเดินทางหรือในพื้นที่ที่พัก',
    'ต้องการเปลี่ยนไปพักในโอกาสพิเศษอื่น (เช่น เลื่อนไปตรงวันเกิด วันครบรอบ)',
  ]

  /** Combine ticked presets + optional "อื่นๆ" note into the single reason
   *  string the API expects. Each preset is line-separated for readability. */
  function buildReasonText(): string {
    const parts = [...postponeForm.reasonChecks]
    if (postponeForm.reasonOther && postponeForm.reason.trim()) {
      parts.push(`อื่นๆ: ${postponeForm.reason.trim()}`)
    }
    return parts.join('\n')
  }
  function toggleReasonCheck(text: string) {
    setPostponeForm((prev) => {
      const has = prev.reasonChecks.includes(text)
      return {
        ...prev,
        reasonChecks: has
          ? prev.reasonChecks.filter((r) => r !== text)
          : [...prev.reasonChecks, text],
      }
    })
  }

  // Use UTC-based ymd to match how MiniCalendar / API store dates (UTC midnight).
  // ymdLocal would shift by 1 day in any timezone west of UTC.
  const dateStr = initialDate ? ymd(initialDate) : ''
  const nextDayStr = initialDate ? ymd(new Date(initialDate.getTime() + 86400000)) : ''

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
    // Pending tab keeps date + time separately (joined to ISO on submit)
    paymentDueDate: '',
    paymentDueTime: '',
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
    setPostponeMode(false)
    setPostponeForm({
      newCheckin: '',
      newCheckout: '',
      reason: '',
      reasonChecks: [],
      reasonOther: false,
      expiresAt: '',
      dateUnspecified: false,
    })
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
      paymentDueDate: '',
      paymentDueTime: '',
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

  // When the clicked cell has an existing booking, prefill the form with its data so the
  // user can review / edit instead of starting blank. Runs whenever `cell.booking` loads.
  useEffect(() => {
    if (!open || !cell?.booking) return
    const b = cell.booking
    setForm((prev) => ({
      ...prev,
      checkin: ymd(b.checkin),
      checkout: ymd(b.checkout),
      customerName: b.customerName ?? '',
      customerPhone: b.customerPhone ?? '',
      bookerName: b.bookerName ?? '',
      guestCount: b.guestCount ?? 2,
      total: Number(b.total) || 0,
      publicNote: b.publicNote ?? '',
      internalNote: b.internalNote ?? '',
    }))
  }, [open, cell?.booking])

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

  /**
   * Translate tRPC/Zod errors into a friendly Thai message.
   * - Empty-string Zod validation errors → suggest user fill required fields or set price first
   * - Conflict errors (booking overlap) → already in Thai from the server
   * - Unknown errors → generic Thai fallback
   */
  const friendlyError = (msg: string): string => {
    if (msg.includes('too_small') || msg.includes('must contain at least')) {
      return 'กรุณากรอกข้อมูลให้ครบ — หรือไปตั้งราคาที่หน้า "ปรับราคา" ก่อน แล้วลองอีกครั้ง'
    }
    if (msg.includes('Required') || msg.includes('required')) {
      return 'กรอกข้อมูลให้ครบทุกช่องที่จำเป็น'
    }
    if (msg.startsWith('[')) {
      // Raw Zod JSON — fall back to a friendly message
      return 'ข้อมูลไม่ครบหรือไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง'
    }
    return msg
  }

  const createConfirmed = trpc.booking.createConfirmed.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(friendlyError(e.message)) })
  const createPending = trpc.booking.createPending.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(friendlyError(e.message)) })
  const createInvoice = trpc.booking.createInvoice.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(friendlyError(e.message)) })
  const blockDates = trpc.booking.blockDates.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(friendlyError(e.message)) })
  const cancel = trpc.booking.cancel.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(friendlyError(e.message)) })
  const unblock = trpc.booking.unblockDates.useMutation({ onSuccess: () => { invalidateAll(); onClose() }, onError: (e) => setError(friendlyError(e.message)) })
  // postpone = "เลื่อนวันเข้าพัก" — moves booking to new dates, freeing the original cells.
  // History is visible at /manage/postpone (เมนูเลื่อนวันเข้าพัก).
  const postpone = trpc.booking.postpone.useMutation({
    onSuccess: () => {
      invalidateAll()
      utils.booking.postponeHistory.invalidate()
      // Refresh sidebar badge — "ยังไม่ระบุวัน" postpones bump this counter
      utils.booking.pendingPostponeCount.invalidate()
      onClose()
    },
    onError: (e) => setError(friendlyError(e.message)),
  })

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
    // Quick + pending: customer name optional — fall back to a placeholder so the DB save succeeds
    const customerName = form.customerName || '— ไม่ระบุชื่อ —'
    if (tab === 'quick') {
      return createConfirmed.mutate({ ...base, customerName, paymentMethod: form.paymentMethod })
    }
    if (tab === 'pending') {
      // Combine the split date + time pickers into a single ISO datetime.
      const dueDate = form.paymentDueDate
      const dueTime = form.paymentDueTime || '23:59'
      if (!dueDate) return setError('กรุณาระบุวันนัดชำระ')
      const paymentDueAt = new Date(`${dueDate}T${dueTime}:00`).toISOString()
      return createPending.mutate({
        ...base,
        customerName,
        // "amount" in the UI = total expected payment; mirror to deposit so the booking is fully covered
        deposit: form.total,
        paymentDueAt,
        paymentMethod: form.paymentMethod,
      })
    }
    // Invoice still requires a real customer name (printed on the document)
    if (!form.customerName) return setError('กรุณาระบุชื่อลูกค้า')
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

  /** Switch to postpone mode — pre-fill with current dates so the user only adjusts. */
  function enterPostponeMode() {
    if (!cell?.booking) return
    setError(null)
    setPostponeMode(true)
    setPostponeForm({
      newCheckin: ymd(cell.booking.checkin),
      newCheckout: ymd(cell.booking.checkout),
      reason: '',
      reasonChecks: [],
      reasonOther: false,
      expiresAt: '',
      dateUnspecified: false,
    })
  }

  function submitPostpone() {
    setError(null)
    if (!cell?.booking) return
    // "ยังไม่ระบุวัน" path — skip date validation; backend will mark this as a
    // pending-dates postpone and free the original cells without re-allocating yet.
    if (postponeForm.dateUnspecified) {
      postpone.mutate({
        id: cell.booking.id,
        newCheckin: '',
        newCheckout: '',
        reason: buildReasonText() || undefined,
        expiresAt: postponeForm.expiresAt
          ? new Date(`${postponeForm.expiresAt}T23:59:00`).toISOString()
          : undefined,
      })
      return
    }
    if (!postponeForm.newCheckin || !postponeForm.newCheckout) {
      return setError('กรุณาเลือกวันที่เข้าพักใหม่ หรือติ๊ก "ยังไม่ระบุวัน"')
    }
    if (postponeForm.newCheckout <= postponeForm.newCheckin) {
      return setError('วันเช็คเอาท์ต้องมาหลังวันเช็คอิน')
    }
    postpone.mutate({
      id: cell.booking.id,
      newCheckin: postponeForm.newCheckin,
      newCheckout: postponeForm.newCheckout,
      reason: buildReasonText() || undefined,
      expiresAt: postponeForm.expiresAt
        ? new Date(`${postponeForm.expiresAt}T23:59:00`).toISOString()
        : undefined,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="ทำรายการจอง" description={variantLabel} size="lg">
      <ModalBody>
        {/* Existing booking — show only the two action buttons (เลื่อนวันเข้าพัก + ยกเลิกการจอง).
            The form below auto-fills with the booking's data so the customer info is visible
            in its natural place; no need for a separate summary banner. */}
        {isExisting && cell.booking && !postponeMode && (
          <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={enterPostponeMode}
              className="border-amber-300 bg-white text-amber-700 hover:bg-amber-50"
            >
              <Icon name="calendar" className="size-3" />
              เลื่อนวันเข้าพัก
            </Button>
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

        {/* Tabs — hidden in postpone mode (form takes over the modal body) */}
        {!postponeMode && (
          <div className="mb-5 flex gap-1 rounded-xl bg-gray-100 p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  tab === t.key
                    ? t.activeClass
                    : 'text-gray-600 hover:text-gray-900',
                )}
              >
                <Icon name={t.icon} className="size-3.5" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Postpone form — replaces the booking-creation form while postponeMode is on.
            Submitting calls booking.postpone → history visible at /manage/postpone.
            Redesigned with: compact icon banner, prominent date card, collapsed
            optional fields. */}
        {postponeMode && cell?.booking && (
          <div className="space-y-3">
            {/* Compact context banner — original dates as chips, no long paragraph */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Icon name="alert" className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-amber-900">โหมดเลื่อนวันเข้าพัก</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-amber-800">วันเดิม:</span>
                  <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] text-amber-900 ring-1 ring-amber-200">
                    {ymd(cell.booking.checkin)}
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] text-amber-900 ring-1 ring-amber-200">
                    {ymd(cell.booking.checkout)}
                  </span>
                  <span className="ml-1 text-amber-700">จะกลับเป็นว่างทันที</span>
                </div>
              </div>
            </div>

            {/* New-dates card — only visible when committing new dates */}
            {!postponeForm.dateUnspecified && (
              <div className="rounded-xl border-2 border-brand-200 bg-brand-50/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Icon name="calendarPlus" className="size-3.5" />
                  </div>
                  <span className="text-sm font-bold text-gray-900">เลือกวันเข้าพักใหม่</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label required>วันเช็คอินใหม่</Label>
                    <Input
                      type="date"
                      value={postponeForm.newCheckin}
                      onChange={(e) =>
                        setPostponeForm({ ...postponeForm, newCheckin: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label required>วันเช็คเอาท์ใหม่</Label>
                    <Input
                      type="date"
                      value={postponeForm.newCheckout}
                      onChange={(e) =>
                        setPostponeForm({ ...postponeForm, newCheckout: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Details card — groups deadline + "ยังไม่ระบุวัน" toggle + reason
                in one frame so they read as a single block. Collapsible to reduce
                visual noise when owner just wants to confirm new dates. */}
            <details
              open
              className="rounded-xl border border-gray-200 bg-white p-3 [&[open]>summary>svg]:rotate-180"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold text-gray-700 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-1.5">
                  <Icon name="sliders" className="size-3.5 text-gray-500" />
                  รายละเอียดเพิ่มเติม (ไม่บังคับ)
                </span>
                <svg className="size-3.5 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
              </summary>
              <div className="mt-3 space-y-3">
                {/* 1. วันหมดเขตเลื่อน */}
                <div>
                  <Label>วันหมดเขตเลื่อน</Label>
                  <Input
                    type="date"
                    value={postponeForm.expiresAt}
                    onChange={(e) =>
                      setPostponeForm({ ...postponeForm, expiresAt: e.target.value })
                    }
                  />
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                    <Icon name="info" className="size-3" />
                    ถ้าระบุ ระบบจะแสดงสถานะ "หมดเขตเลื่อนวัน" เมื่อเลยวันนี้
                  </p>
                </div>

                {/* 2. ยังไม่ระบุวัน toggle (moved here from above) — controls whether
                       the postpone commits to new dates or sits "pending" in history. */}
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-all',
                    postponeForm.dateUnspecified
                      ? 'border-brand-500 bg-brand-50/50'
                      : 'border-gray-200 bg-white hover:border-brand-300',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={postponeForm.dateUnspecified}
                    onChange={(e) =>
                      setPostponeForm({ ...postponeForm, dateUnspecified: e.target.checked })
                    }
                    className="mt-0.5 size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-gray-900">ยังไม่ระบุวัน</div>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                      เลื่อนวันเข้าพักโดยยังไม่ตัดสินใจวันใหม่ — รายการจะอยู่ใน
                      <span className="font-medium text-brand-700"> ประวัติเลื่อนเข้าพัก </span>
                      และคืนวันเดิมเป็นว่างทันที
                    </p>
                  </div>
                </label>

                {/* 3. เหตุผล — collapsed by default; click to expand the checklist.
                    Shows a small count badge once any reason is selected so owner can
                    see at a glance whether they've picked one. */}
                <details
                  className="rounded-lg border border-gray-200 bg-white [&[open]>summary>svg]:rotate-180"
                  // Auto-open if any reason was already selected (e.g. editing flow)
                  open={postponeForm.reasonChecks.length > 0 || postponeForm.reasonOther}
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-gray-800 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      เหตุผล
                      {(postponeForm.reasonChecks.length > 0 || postponeForm.reasonOther) && (
                        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                          {postponeForm.reasonChecks.length + (postponeForm.reasonOther ? 1 : 0)}
                        </span>
                      )}
                    </span>
                    <svg className="size-3.5 text-gray-500 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                  </summary>
                  <div className="space-y-1.5 border-t border-gray-100 p-3">
                    {POSTPONE_REASON_PRESETS.map((text) => {
                      const checked = postponeForm.reasonChecks.includes(text)
                      return (
                        <label
                          key={text}
                          className={cn(
                            'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors',
                            checked
                              ? 'border-brand-400 bg-brand-50/40'
                              : 'border-gray-200 bg-white hover:border-gray-300',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleReasonCheck(text)}
                            className="mt-0.5 size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span className="leading-relaxed text-gray-800">{text}</span>
                        </label>
                      )
                    })}

                    {/* "อื่นๆ" — checkbox + textarea (revealed when checked) */}
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors',
                        postponeForm.reasonOther
                          ? 'border-brand-400 bg-brand-50/40'
                          : 'border-gray-200 bg-white hover:border-gray-300',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={postponeForm.reasonOther}
                        onChange={(e) =>
                          setPostponeForm({
                            ...postponeForm,
                            reasonOther: e.target.checked,
                            // Clear the custom note when unchecking "อื่นๆ"
                            reason: e.target.checked ? postponeForm.reason : '',
                          })
                        }
                        className="mt-0.5 size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="leading-relaxed text-gray-800">
                        อื่นๆ พร้อมระบุหมายเหตุ
                      </span>
                    </label>
                    {postponeForm.reasonOther && (
                      <Textarea
                        rows={2}
                        value={postponeForm.reason}
                        onChange={(e) =>
                          setPostponeForm({ ...postponeForm, reason: e.target.value })
                        }
                        placeholder="ระบุหมายเหตุเพิ่มเติม..."
                        className="ml-7"
                      />
                    )}
                  </div>
                </details>
              </div>
            </details>

            {error && (
              <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Booking-creation form — wrapped so postpone mode can hide it cleanly */}
        {!postponeMode && (<>
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
                <Label required={tab === 'invoice'}>ชื่อลูกค้า</Label>
                <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </div>
              <div>
                <Label>เบอร์โทรศัพท์</Label>
                <Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
              </div>
            </div>

            {/* Booker name row — paired with guest-count on invoice, full-width on quick/pending */}
            {tab === 'invoice' ? (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label>ผู้ทำรายการ</Label>
                  <Input
                    value={form.bookerName}
                    onChange={(e) => setForm({ ...form, bookerName: e.target.value })}
                    placeholder={form.customerName || ''}
                  />
                </div>
                <div>
                  <Label required>จำนวนผู้เข้าพัก</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.guestCount}
                    onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })}
                    placeholder="guests_count"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <Label>ผู้ทำรายการ</Label>
                <Input
                  value={form.bookerName}
                  onChange={(e) => setForm({ ...form, bookerName: e.target.value })}
                  placeholder={form.customerName || ''}
                />
              </div>
            )}

            {/* Pending tab — slim form: temporary-lock note + due date/time + amount only */}
            {tab === 'pending' && (
              <>
                <div className="mt-8">
                  <div className="text-sm font-medium text-gray-700">ล็อกชั่วคราว (ไม่บังคับ)</div>
                  <p className="mt-1 text-xs leading-relaxed text-red-500">
                    ระบบจะล็อกห้องชั่วคราวจนถึงวันนัดชำระ หากไม่ชำระตามกำหนด การจองจะถูกยกเลิกอัตโนมัติ
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <Label required>วันนัดชำระ</Label>
                    <Input
                      type="date"
                      value={form.paymentDueDate}
                      onChange={(e) => setForm({ ...form, paymentDueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>เวลา</Label>
                    <Input
                      type="time"
                      value={form.paymentDueTime}
                      onChange={(e) => setForm({ ...form, paymentDueTime: e.target.value })}
                      placeholder="23:59"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Label>จำนวนเงิน (฿)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.total}
                    onChange={(e) => setForm({ ...form, total: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </>
            )}

            {/* Invoice tab — total + deposit row (guest-count handled in the booker row above) */}
            {tab === 'invoice' && (
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
                  <Label required>มัดจำ (฿)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.deposit}
                    onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })}
                    placeholder="quantity"
                  />
                </div>
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

            {/* Invoice tab — VAT + logo checkboxes printed on the booking document */}
            {tab === 'invoice' && (
              <div className="mt-4 space-y-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.vat}
                    onChange={(e) => setForm({ ...form, vat: e.target.checked })}
                    className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">VAT 7%</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
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

            {/* Status indicator — clarifies what status the booking will get on submit */}
            {tab === 'quick' && (
              <div className="mt-4">
                <Badge variant="danger" dot>จองแล้ว</Badge>
              </div>
            )}
            {tab === 'pending' && (
              <div className="mt-4">
                <Badge variant="warning" dot>รอชำระ</Badge>
              </div>
            )}
            {tab === 'invoice' && (
              <div className="mt-4">
                <Badge variant="danger" dot>จองแล้ว</Badge>
              </div>
            )}
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
        </>)}
      </ModalBody>
      <ModalFooter>
        {postponeMode ? (
          <>
            <Button variant="secondary" onClick={() => setPostponeMode(false)}>
              ย้อนกลับ
            </Button>
            <Button onClick={submitPostpone} disabled={postpone.isPending}>
              {postpone.isPending ? 'กำลังเลื่อน...' : 'ยืนยันเลื่อนวันเข้าพัก'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              ปิด
            </Button>
            <Button onClick={submit} variant={tab === 'block' ? 'secondary' : tab === 'invoice' ? 'primary' : 'primary'}>
              {tab === 'block' ? 'ปิดซ่อม' : tab === 'invoice' ? 'ออกใบจอง' : tab === 'pending' ? 'บันทึก รอชำระ' : 'จองด่วน'}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}
