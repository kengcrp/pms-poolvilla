'use client'

/**
 * Client-side booking card with date picker popup.
 *
 * Workflow matches the 4-step sale-page UX:
 *   1. Empty state — both fields empty, "จองเลย" button disabled
 *   2. User picks check-in (via inline calendar OR this popup) → check-in
 *      field fills + × clear button appears, picker mode flips to 'out'
 *   3. User picks check-out → both fields filled, total cost displays,
 *      "จองเลย" button activates (solid pink)
 *   4. Click × on either field to clear it (resets to step 2 or 1)
 */

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Icon } from '@pms/ui'
import { useBooking } from './BookingContext'
import { dayInfoFor } from './InlineCalendar'

interface BookingCardProps {
  pricePerNight: number
  splitRoom?: boolean // when true, show per-room guest count chips
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const WEEK_HEADERS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
function format(d: Date | null): string {
  if (!d) return ''
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

export function BookingCard({ pricePerNight, splitRoom = false }: BookingCardProps) {
  // Shared state — same source the inline CalendarSection writes to
  const {
    checkin,
    checkout,
    setCheckin,
    setCheckout,
    pickerMode,
    setPickerMode,
    pickDate,
    nights,
  } = useBooking()
  const router = useRouter()
  const routeParams = useParams<{ code: string; slug: string }>()

  const today = (() => {
    const n = new Date()
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
  })()

  const [pickerOpen, setPickerOpen] = useState<null | 'in' | 'out'>(null)
  const [view, setView] = useState({
    year: (checkin ?? today).getUTCFullYear(),
    month0: (checkin ?? today).getUTCMonth(),
  })

  // Close on click outside
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!pickerOpen) return
    function onDocClick(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setPickerOpen(null)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [pickerOpen])

  function handlePick(d: Date) {
    pickDate(d)
    if (pickerOpen === 'in') setPickerOpen('out')
    else if (pickerOpen === 'out') setPickerOpen(null)
  }

  function nav(delta: number) {
    setView((v) => {
      const next = v.month0 + delta
      return {
        year: v.year + Math.floor(next / 12),
        month0: ((next % 12) + 12) % 12,
      }
    })
  }

  const total = pricePerNight * nights
  const bookingReady = !!checkin && !!checkout && nights > 0

  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
    >
      {/* Dates */}
      <div className="grid grid-cols-2 gap-2">
        <DateField
          label="เช็คอิน"
          value={format(checkin)}
          filled={!!checkin}
          active={pickerOpen === 'in'}
          onClick={() => {
            setPickerOpen(pickerOpen === 'in' ? null : 'in')
            setPickerMode('in')
          }}
          onClear={() => {
            setCheckin(null)
            // Clearing checkin also invalidates checkout
            setCheckout(null)
            setPickerMode('in')
          }}
        />
        <DateField
          label="เช็คเอาท์"
          value={format(checkout)}
          filled={!!checkout}
          active={pickerOpen === 'out'}
          onClick={() => {
            setPickerOpen(pickerOpen === 'out' ? null : 'out')
            setPickerMode('out')
          }}
          onClear={() => {
            setCheckout(null)
            setPickerMode('out')
          }}
        />
      </div>

      {/* Calendar popup — rendered IN FLOW (not absolute) because the parent
          <aside> has overflow-y-auto + max-h, which would clip an absolutely-
          positioned popup. As a flow element it pushes the CTA below and the
          aside scrolls naturally to keep everything reachable. */}
      {pickerOpen && (
        <div className="relative mt-3 rounded-xl bg-white p-3 shadow-[0_15px_40px_rgba(0,0,0,0.18)] ring-1 ring-gray-200">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-bold text-gray-900">
              {THAI_MONTHS[view.month0]} {view.year}
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
            {WEEK_HEADERS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <DateGrid
            view={view}
            checkin={checkin}
            checkout={checkout}
            today={today}
            onPick={handlePick}
            pickerMode={pickerOpen ?? 'in'}
          />

          <div className="mt-2">
            <button
              type="button"
              onClick={() => setPickerOpen(null)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* Per-room guest chips — ONLY show when property has split-room variants */}
      {splitRoom && bookingReady && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-gray-700">แบ่งเปิดห้อง</p>
          <div className="flex flex-wrap gap-2">
            <GuestChip label="2 นอน 4 ท่าน" />
            <GuestChip label="4 นอน 6 ท่าน" />
            <GuestChip label="6 นอน 10 ท่าน" />
            <GuestChip label="8 นอน 12 ท่าน" />
          </div>
        </div>
      )}

      {/* Total — only show once both dates are picked */}
      {bookingReady && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-600">
              ฿ {total.toLocaleString('en-US')}
            </span>
            <span className="text-sm text-gray-600">
              ({nights} {nights === 1 ? 'คืน' : 'คืน'})
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            ราคา ฿{pricePerNight.toLocaleString('en-US')}/คืน
          </p>
        </div>
      )}

      {/* CTA — disabled (light pink) when no booking ready, solid pink when ready.
          On click, route to the checkout step with the selected dates encoded as
          query params (the next page picks them up from useSearchParams). */}
      <button
        type="button"
        disabled={!bookingReady}
        onClick={() => {
          if (!bookingReady || !checkin || !checkout) return
          const inStr = ymd(checkin)
          const outStr = ymd(checkout)
          const code = routeParams?.code ?? ''
          const slug = routeParams?.slug ?? ''
          router.push(`/s/${code}/${slug}/book?in=${inStr}&out=${outStr}`)
        }}
        className={
          bookingReady
            ? 'mt-3 h-12 w-full rounded-xl bg-rose-500 text-base font-bold text-white shadow-sm transition hover:bg-rose-600'
            : 'mt-3 h-12 w-full cursor-not-allowed rounded-xl bg-rose-200 text-base font-bold text-white'
        }
      >
        จองเลย
      </button>
    </div>
  )
}

function DateField({
  label,
  value,
  filled,
  active,
  onClick,
  onClear,
}: {
  label: string
  value: string
  filled: boolean
  active: boolean
  onClick: () => void
  onClear: () => void
}) {
  return (
    <div
      className={
        active
          ? 'relative rounded-xl border-2 border-rose-500 bg-rose-50 px-3 py-2 transition'
          : filled
            ? 'relative rounded-xl border border-rose-300 bg-rose-50/50 px-3 py-2 transition hover:border-rose-500'
            : 'relative rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 transition hover:border-rose-300 hover:bg-rose-50/30'
      }
    >
      <button type="button" onClick={onClick} className="block w-full text-left">
        <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-rose-500">
          <Icon name="calendar" className="size-3" />
          {label}
        </p>
        <p
          className={
            filled
              ? 'mt-0.5 text-sm font-bold text-gray-900'
              : 'mt-0.5 text-sm font-medium text-gray-400'
          }
        >
          {value || 'เลือกวัน'}
        </p>
      </button>
      {/* × clear — only shown when field has a value */}
      {filled && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`ล้าง ${label}`}
          className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full text-rose-400 transition hover:bg-rose-100 hover:text-rose-600"
        >
          <Icon name="close" className="size-3" />
        </button>
      )}
    </div>
  )
}

function GuestChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-rose-400">
      {label}
    </span>
  )
}

function DateGrid({
  view,
  checkin,
  checkout,
  today,
  onPick,
  pickerMode,
}: {
  view: { year: number; month0: number }
  checkin: Date | null
  checkout: Date | null
  today: Date
  onPick: (d: Date) => void
  pickerMode: 'in' | 'out'
}) {
  const first = new Date(Date.UTC(view.year, view.month0, 1))
  const last = new Date(Date.UTC(view.year, view.month0 + 1, 0))
  const padStart = first.getUTCDay()
  const daysInMonth = last.getUTCDate()
  const totalCells = Math.ceil((padStart + daysInMonth) / 7) * 7

  const cells: (Date | null)[] = []
  for (let i = 0; i < padStart; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(Date.UTC(view.year, view.month0, d)))
  }
  while (cells.length < totalCells) cells.push(null)

  const checkinKey = checkin ? ymd(checkin) : null
  const checkoutKey = checkout ? ymd(checkout) : null
  const todayKey = ymd(today)

  return (
    <div className="grid grid-cols-7 gap-0.5">
      {cells.map((d, i) => {
        if (!d) return <div key={`pad-${i}`} />
        const key = ymd(d)
        const isPast = key < todayKey
        const isCheckin = !!checkinKey && key === checkinKey
        const isCheckout = !!checkoutKey && key === checkoutKey
        const inRange =
          !!checkinKey && !!checkoutKey && key > checkinKey && key < checkoutKey
        const isToday = key === todayKey
        // Use the same per-day status source as the inline left calendar so
        // both surfaces always agree on which dates are locked/booked.
        const info = dayInfoFor(d)
        const isUnavailable =
          info.status === 'booked' ||
          info.status === 'pending' ||
          info.status === 'hold'
        // Same hotel-checkout rule as InlineCalendar — booked days are allowed
        // when picking the OUT date (guest leaves morning, next arrives afternoon).
        const allowAsCheckoutOnly = isUnavailable && pickerMode === 'out'
        const disabled =
          isPast ||
          (isUnavailable && !allowAsCheckoutOnly) ||
          (pickerMode === 'out' && !!checkinKey && key <= checkinKey)
        const strikethrough = isUnavailable && !isCheckin && !isCheckout
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
                  : isToday
                    ? 'flex aspect-square items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-900'
                    : disabled
                      ? 'flex aspect-square items-center justify-center text-xs text-gray-300'
                      : 'flex aspect-square items-center justify-center rounded-full text-xs text-gray-700 hover:bg-gray-100'
            }
          >
            <span
              className={
                strikethrough
                  ? `line-through ${disabled ? 'text-gray-400' : 'text-gray-500'}`
                  : ''
              }
            >
              {d.getUTCDate()}
            </span>
          </button>
        )
      })}
    </div>
  )
}
