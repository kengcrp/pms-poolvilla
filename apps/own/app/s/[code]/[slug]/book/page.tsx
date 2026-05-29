'use client'

/**
 * Booking checkout step 1 — guest count, payment-mode selection, and live
 * price breakdown. Reached when the user clicks "จองเลย" on the property
 * detail page.
 *
 * URL: /s/[code]/[slug]/book?in=YYYY-MM-DD&out=YYYY-MM-DD
 *
 * Layout: sticky summary card on the left (image + dates + breakdown), all
 * inputs on the right (guests, payment mode, coupon). The breakdown lives
 * inside the left card so the price stays visible while filling the form.
 */

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@pms/ui'
import { trpc } from '@/lib/trpc'
import { dayInfoFor } from '../InlineCalendar'

type GuestKind = 'adult' | 'child' | 'infant' | 'pet'
type PaymentMode = 'full' | 'half'

const GUEST_ROWS: { key: GuestKind; label: string; sub: string }[] = [
  { key: 'adult',  label: 'ผู้ใหญ่',     sub: 'อายุ 7 ปีขึ้นไป' },
  { key: 'child',  label: 'เด็ก',       sub: 'อายุต่ำกว่า 7 ปี' },
  { key: 'infant', label: 'ทารก',       sub: 'อายุไม่เกิน 2 ปี' },
  { key: 'pet',    label: 'สัตว์เลี้ยง', sub: 'เพิ่มเติม / ไม่บังคับ' },
]

export default function BookCheckoutPage({
  params,
}: {
  params: Promise<{ code: string; slug: string }>
}) {
  const { code, slug } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  // URL is /s/[code]/[slug] where code=ownerSlug, slug=propertyCode, but the
  // tRPC query is `{ slug: ownerSlug, code: propertyCode }` — swap them.
  const { data: property } = trpc.public.propertyByCode.useQuery(
    { slug: code, code: slug },
    { retry: false, refetchOnWindowFocus: false },
  )

  // ── Local state for editable dates — initialized from URL params so the
  // user can adjust check-in/check-out without leaving the page. The popup
  // calendar below shares the same booked/locked rules as the property page.
  const [checkinStr, setCheckinStr] = useState<string>(searchParams.get('in') ?? '')
  const [checkoutStr, setCheckoutStr] = useState<string>(searchParams.get('out') ?? '')
  const [pickerOpen, setPickerOpen] = useState<null | 'in' | 'out'>(null)

  const [guests, setGuests] = useState<Record<GuestKind, number>>({
    adult: 0,
    child: 0,
    infant: 0,
    pet: 0,
  })
  const [coupon, setCoupon] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('full')

  // ── Derived values ──
  const nights = useMemo(() => {
    if (!checkinStr || !checkoutStr) return 0
    const a = new Date(checkinStr).getTime()
    const b = new Date(checkoutStr).getTime()
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
    return Math.max(0, Math.round((b - a) / 86_400_000))
  }, [checkinStr, checkoutStr])

  // Pick a date — respects pickerOpen mode and auto-flips after the first pick.
  function pickDate(d: Date) {
    const ds = ymdLocal(d)
    if (pickerOpen === 'in') {
      setCheckinStr(ds)
      // If checkout is now ≤ new checkin, clear it (user picks again).
      if (checkoutStr && ds >= checkoutStr) setCheckoutStr('')
      setPickerOpen('out')
    } else {
      if (!checkinStr || ds <= checkinStr) return
      setCheckoutStr(ds)
      setPickerOpen(null)
    }
  }

  const propertyName = ((property?.name as { th?: string } | null)?.th ?? '')
  const maxGuests = property?.variants?.[0]?.maxGuests ?? 0
  const bedrooms = property?.totalBedrooms ?? 0
  const locationName = property?.location?.location?.name ?? ''
  const cover = property?.images?.[0]?.url
  const pricePerNight = 8000 // TODO: derive from selected variant weekly pricing
  const basePrice = pricePerNight * nights

  // Add-ons — hard-coded sample rates; real rates come from the variant.
  const adultExtra = guests.adult > 2 ? (guests.adult - 2) * 500 * nights : 0
  const childExtra = guests.child * 500
  const taxFee = basePrice > 0 ? 200 : 0
  const subTotal = basePrice + adultExtra + childExtra + taxFee
  const dueNow = paymentMode === 'full' ? subTotal : Math.round(subTotal / 2)
  const dueLater = subTotal - dueNow

  const totalGuests = guests.adult + guests.child + guests.infant
  const hasGuests = totalGuests > 0
  const canContinue = hasGuests && nights > 0

  function bumpGuest(key: GuestKind, delta: number) {
    setGuests((g) => ({ ...g, [key]: Math.max(0, g[key] + delta) }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar with back link */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <Link
            href={`/s/${code}/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
          >
            <Icon name="chevronLeft" className="size-4" />
            กลับ
          </Link>
          <div className="ml-auto text-sm font-semibold text-gray-900">
            กรอกข้อมูลการจอง
          </div>
        </div>
      </header>

      {/* Single-column layout — mobile-first stacked card flow.
          Centered, narrow max-width for easy scanning on any screen. */}
      <main className="mx-auto max-w-xl space-y-4 px-4 py-6">
        {/* ── Property + dates ─────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="flex gap-3 p-4">
            <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={propertyName} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-gray-300">
                  <Icon name="home" className="size-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-bold text-gray-900">
                {propertyName || 'ที่พัก'}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-600">
                {locationName && (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="pin" className="size-3 text-rose-500" />
                    {locationName}
                  </span>
                )}
                {maxGuests > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="users" className="size-3 text-gray-400" />
                    {maxGuests} ท่าน
                  </span>
                )}
                {bedrooms > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="bed" className="size-3 text-gray-400" />
                    {bedrooms} ห้องนอน
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Date pickers — click to open inline calendar below */}
          <div className="grid grid-cols-2 gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-3 text-sm">
            <DateButton
              label="เช็คอิน"
              value={fmtDate(checkinStr)}
              active={pickerOpen === 'in'}
              onClick={() => setPickerOpen((p) => (p === 'in' ? null : 'in'))}
            />
            <DateButton
              label="เช็คเอาท์"
              value={fmtDate(checkoutStr)}
              active={pickerOpen === 'out'}
              onClick={() => setPickerOpen((p) => (p === 'out' ? null : 'out'))}
            />
          </div>

          {pickerOpen && (
            <div className="border-t border-gray-100 px-4 py-3">
              <InlineDatePicker
                mode={pickerOpen}
                checkinStr={checkinStr}
                checkoutStr={checkoutStr}
                onPick={pickDate}
                onClose={() => setPickerOpen(null)}
              />
            </div>
          )}
        </div>

        {/* ── Guests ───────────────────────────────────────────────────── */}
        <FormCard icon="users" title="จำนวนผู้เข้าพัก">
          <div className="divide-y divide-gray-100">
            {GUEST_ROWS.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{row.label}</div>
                  <div className="text-[11px] text-gray-500">{row.sub}</div>
                </div>
                <Counter
                  value={guests[row.key]}
                  onChange={(delta) => bumpGuest(row.key, delta)}
                />
              </div>
            ))}
          </div>
          {!hasGuests && nights > 0 && (
            <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              กรุณาเลือกจำนวนผู้เข้าพักอย่างน้อย 1 ท่าน
            </div>
          )}
        </FormCard>

        {/* ── Coupon ───────────────────────────────────────────────────── */}
        <FormCard icon="ticket" title="มีโค้ดส่วนลด?">
          <div className="flex gap-2">
            <input
              type="text"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="กรอกโค้ดส่วนลด"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            />
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              ใช้
            </button>
          </div>
        </FormCard>

        {/* ── Payment mode ─────────────────────────────────────────────── */}
        <FormCard icon="cash" title="รูปแบบการชำระเงิน">
          <div className="space-y-2">
            <PaymentOption
              active={paymentMode === 'full'}
              onClick={() => setPaymentMode('full')}
              label="ชำระทั้งหมดตอนนี้"
              desc={subTotal > 0 ? `฿${subTotal.toLocaleString('en-US')}` : ''}
            />
            <PaymentOption
              active={paymentMode === 'half'}
              onClick={() => setPaymentMode('half')}
              label="ชำระบางส่วนตอนนี้"
              desc={
                subTotal > 0
                  ? `จ่ายตอนนี้ ฿${Math.round(subTotal / 2).toLocaleString('en-US')} · ที่เหลือวันเข้าพัก`
                  : 'จ่ายครึ่งหนึ่งตอนนี้ + วันเข้าพัก'
              }
            />
          </div>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            เงื่อนไขเพิ่มเติม
            <Icon name="arrowRight" className="size-3" />
          </button>
        </FormCard>

        {/* ── Breakdown ────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="mb-3 text-sm font-bold text-gray-900">
            {paymentMode === 'full' ? 'ราคารวมทั้งสิ้น' : 'ชำระบางส่วนตอนนี้'}
          </div>
          <div className="space-y-2.5">
            <BreakdownRow
              label="ราคาที่พัก"
              sub={`${nights || '—'} คืน × ฿${pricePerNight.toLocaleString('en-US')}`}
              value={basePrice}
            />
            {adultExtra > 0 && (
              <BreakdownRow
                label="เสริมผู้ใหญ่"
                sub={`${guests.adult - 2} ท่าน × ${nights} คืน`}
                value={adultExtra}
              />
            )}
            {childExtra > 0 && (
              <BreakdownRow
                label="เสริมเด็ก"
                sub={`${guests.child} คน`}
                value={childExtra}
              />
            )}
            <BreakdownRow label="ภาษี + ค่าธรรมเนียม" value={taxFee} />

            {paymentMode === 'half' && subTotal > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                ชำระวันเข้าพักเพิ่มอีก ฿{dueLater.toLocaleString('en-US')}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-baseline justify-between rounded-xl bg-brand-50 px-3 py-3">
            <span className="text-sm font-semibold text-gray-900">
              {paymentMode === 'full' ? 'ราคารวมทั้งสิ้น' : 'ยอดชำระตอนนี้'}
            </span>
            <span className="text-xl font-extrabold text-rose-600">
              ฿{dueNow.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {/* ── Continue CTA — proceeds to /book/payment ─────────────────── */}
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => {
            if (!canContinue) return
            const qs = new URLSearchParams({
              in: checkinStr,
              out: checkoutStr,
              total: String(dueNow),
              mode: paymentMode,
              adult: String(guests.adult),
              child: String(guests.child),
              infant: String(guests.infant),
              pet: String(guests.pet),
            })
            router.push(`/s/${code}/${slug}/book/payment?${qs.toString()}`)
          }}
          className={
            canContinue
              ? 'flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-3.5 text-base font-bold text-white shadow-sm shadow-rose-500/30 transition hover:bg-rose-600'
              : 'flex h-13 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-rose-200 py-3.5 text-base font-bold text-white'
          }
        >
          ถัดไป
          <Icon name="arrowRight" className="size-4" />
        </button>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function DateButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-left transition ${
        active
          ? 'bg-white ring-2 ring-rose-500'
          : 'bg-white ring-1 ring-gray-200 hover:ring-rose-300'
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-bold text-gray-900">
        <Icon name="calendar" className="size-3.5 text-rose-500" />
        {value || 'เลือกวัน'}
      </div>
    </button>
  )
}

/** YYYY-MM-DD using UTC midnight — matches dayInfoFor + URL params. */
function ymdLocal(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────
// InlineDatePicker — Airbnb-style month grid. Mirrors the rules used by
// InlineCalendar on the property detail page:
//   - past dates disabled
//   - booked/pending/hold dates struck-through; selectable as CHECKOUT only
//     (guest leaves morning, next arrives afternoon)
//   - month nav < / > stays in this card
// ─────────────────────────────────────────────────────────────────────────────

const THAI_MONTHS_LONG = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const DOW_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

function buildGrid(year: number, month0: number): Date[] {
  const first = new Date(Date.UTC(year, month0, 1))
  const padStart = first.getUTCDay()
  const cells: Date[] = []
  for (let i = padStart; i > 0; i--) {
    cells.push(new Date(Date.UTC(year, month0, 1 - i)))
  }
  const last = new Date(Date.UTC(year, month0 + 1, 0))
  for (let d = 1; d <= last.getUTCDate(); d++) {
    cells.push(new Date(Date.UTC(year, month0, d)))
  }
  let next = 1
  while (cells.length < 42) {
    cells.push(new Date(Date.UTC(year, month0 + 1, next++)))
  }
  return cells
}

function InlineDatePicker({
  mode,
  checkinStr,
  checkoutStr,
  onPick,
  onClose,
}: {
  mode: 'in' | 'out'
  checkinStr: string
  checkoutStr: string
  onPick: (d: Date) => void
  onClose: () => void
}) {
  const today = useMemo(() => {
    const n = new Date()
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
  }, [])
  const seed = checkinStr ? new Date(checkinStr) : today
  const [view, setView] = useState({
    year: seed.getUTCFullYear(),
    month0: seed.getUTCMonth(),
  })

  function nav(delta: number) {
    setView((v) => {
      const next = v.month0 + delta
      return {
        year: v.year + Math.floor(next / 12),
        month0: ((next % 12) + 12) % 12,
      }
    })
  }

  const cells = buildGrid(view.year, view.month0)
  const todayKey = ymdLocal(today)

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-bold text-gray-900">
          {THAI_MONTHS_LONG[view.month0]} {view.year}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="flex size-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="เดือนก่อน"
          >
            <Icon name="chevronLeft" className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => nav(1)}
            className="flex size-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="เดือนถัดไป"
          >
            <Icon name="chevronRight" className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-gray-500">
        {DOW_SHORT.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d) => {
          const key = ymdLocal(d)
          const isCurrentMonth = d.getUTCMonth() === view.month0
          const isPast = key < todayKey
          const isCheckin = key === checkinStr
          const isCheckout = key === checkoutStr
          const inRange =
            !!checkinStr && !!checkoutStr && key > checkinStr && key < checkoutStr
          const info = dayInfoFor(d)
          const isUnavailable =
            info.status === 'booked' ||
            info.status === 'pending' ||
            info.status === 'hold'
          const allowAsCheckoutOnly = isUnavailable && mode === 'out'
          const disabled =
            isPast ||
            (isUnavailable && !allowAsCheckoutOnly) ||
            (mode === 'out' && !!checkinStr && key <= checkinStr)
          const strikethrough = isUnavailable && !isCheckin && !isCheckout
          const fadedText = !isCurrentMonth || isPast

          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && onPick(d)}
              disabled={disabled}
              className={
                isCheckin || isCheckout
                  ? 'flex aspect-square items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white'
                  : inRange
                    ? 'flex aspect-square items-center justify-center bg-rose-100 text-xs font-medium text-rose-700'
                    : disabled
                      ? 'flex aspect-square items-center justify-center text-xs text-gray-300'
                      : 'flex aspect-square items-center justify-center rounded-full text-xs text-gray-700 hover:bg-gray-100'
              }
            >
              <span
                className={
                  strikethrough
                    ? `line-through ${disabled ? 'text-gray-400' : 'text-gray-500'}`
                    : fadedText && !isCheckin && !isCheckout && !inRange
                      ? 'text-gray-300'
                      : ''
                }
              >
                {d.getUTCDate()}
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full rounded-lg border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
      >
        ปิด
      </button>
    </div>
  )
}

function FormCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: 'users' | 'cash' | 'ticket'
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div className="mb-3 flex items-start gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <Icon name={icon} className="size-4" />
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900">{title}</div>
          {subtitle && <div className="text-[11px] text-gray-500">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}

function PaymentOption({
  active,
  onClick,
  label,
  desc,
}: {
  active: boolean
  onClick: () => void
  label: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
        active
          ? 'border-brand-500 bg-brand-50/50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <span
        className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
          active ? 'border-brand-600' : 'border-gray-300'
        }`}
      >
        {active && <span className="size-1.5 rounded-full bg-brand-600" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="text-[11px] text-gray-500">{desc}</div>
      </div>
    </button>
  )
}

function Counter({
  value,
  onChange,
}: {
  value: number
  onChange: (delta: number) => void
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => onChange(-1)}
        disabled={value <= 0}
        aria-label="ลด"
        className="flex size-8 items-center justify-center rounded-l-full text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
      >
        −
      </button>
      <span className="min-w-[2rem] text-center text-sm font-bold tabular-nums text-gray-900">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(1)}
        aria-label="เพิ่ม"
        className="flex size-8 items-center justify-center rounded-r-full text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
      >
        +
      </button>
    </div>
  )
}

function BreakdownRow({
  label,
  sub,
  value,
}: {
  label: string
  sub?: string
  value: number
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm text-gray-700">{label}</div>
        {sub && <div className="text-[11px] text-gray-500">{sub}</div>}
      </div>
      <div className="text-sm font-semibold tabular-nums text-gray-900">
        ฿{value.toLocaleString('en-US')}
      </div>
    </div>
  )
}
