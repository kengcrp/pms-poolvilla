'use client'

/**
 * Inline calendar shown in the property detail page's left column.
 *
 * Now interactive — clicking a date updates the shared booking state (the
 * BookingCard sidebar reads the same checkin/checkout). Click-to-pick
 * alternates based on pickerMode in context.
 */

import { useState } from 'react'
import { Icon } from '@pms/ui'
import { useBooking } from './BookingContext'

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const WEEK_HEADERS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/**
 * Build a full 6-week grid that includes neighboring month days (so the calendar
 * always renders 42 cells with real dates — no blank padding). Matches the
 * reference design where 26-27 from previous month + 1-4 from next month appear
 * grayed out at the edges.
 */
function buildGrid(year: number, month0: number): Date[] {
  const first = new Date(Date.UTC(year, month0, 1))
  const padStart = first.getUTCDay()
  const cells: Date[] = []
  // Previous month's tail
  for (let i = padStart; i > 0; i--) {
    const d = new Date(Date.UTC(year, month0, 1 - i))
    cells.push(d)
  }
  // Current month
  const last = new Date(Date.UTC(year, month0 + 1, 0))
  for (let d = 1; d <= last.getUTCDate(); d++) {
    cells.push(new Date(Date.UTC(year, month0, d)))
  }
  // Pad to 42 cells (6 weeks) with next month's lead
  let next = 1
  while (cells.length < 42) {
    cells.push(new Date(Date.UTC(year, month0 + 1, next++)))
  }
  return cells
}

/**
 * Per-day calendar status (mirrors the backend manage-calendar states).
 *  - 'available'  → bookable, show price
 *  - 'adjusted'   → admin set custom price for this date, show in BLUE
 *  - 'discounted' → admin discounted, show ORIGINAL strike + DISCOUNTED in red
 *  - 'booked'     → red status, sold out (strike date, no price)
 *  - 'pending'    → orange status, awaiting payment (strike date, no price)
 *  - 'hold'       → gray status, on-hold/manual block (strike date, no price)
 */
export type DayStatus = 'available' | 'adjusted' | 'discounted' | 'booked' | 'pending' | 'hold'

export interface DayInfo {
  status: DayStatus
  price: number
  /** Original price for discounted days — gets struck through */
  originalPrice?: number
}

/** Mock per-day data. Replace with tRPC public.calendarRange query later.
 *  Exported so the BookingCard popup calendar can stay in sync — both surfaces
 *  must agree on which dates are booked/locked. */
export function dayInfoFor(d: Date): DayInfo {
  const day = d.getUTCDate()
  // Demo various statuses across the month so each visual state is visible
  if (day === 3 || day === 4) return { status: 'booked', price: 20000 }
  if (day === 10 || day === 11) return { status: 'pending', price: 20000 }
  if (day === 17) return { status: 'hold', price: 20000 }
  if (day === 22 || day === 23) return { status: 'adjusted', price: 25000 }
  if (day === 28 || day === 29) {
    return { status: 'discounted', price: 15000, originalPrice: 20000 }
  }
  return { status: 'available', price: 20000 }
}

export function InlineCalendar() {
  const { checkin, checkout, pickerMode, pickDate } = useBooking()
  const today = (() => {
    const n = new Date()
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
  })()
  // Default month view = check-in month if set, otherwise the current month
  const initialView = checkin ?? today
  const [view, setView] = useState({
    year: initialView.getUTCFullYear(),
    month0: initialView.getUTCMonth(),
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
  const checkinKey = checkin ? ymd(checkin) : null
  const checkoutKey = checkout ? ymd(checkout) : null
  const todayKey = ymd(today)

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      {/* Header: chevron < · month + year · chevron >
          - Year is Gregorian (2026) to match reference design
          - Chevrons in subtle gray-50 circles (visible on hover) */}
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="flex size-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
          aria-label="เดือนก่อน"
        >
          <Icon name="chevronLeft" className="size-4" />
        </button>
        <div className="whitespace-nowrap text-sm font-bold tabular-nums text-gray-900 sm:text-base">
          {THAI_MONTHS[view.month0]} {view.year}
        </div>
        <button
          type="button"
          onClick={() => nav(1)}
          className="flex size-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
          aria-label="เดือนถัดไป"
        >
          <Icon name="chevronRight" className="size-4" />
        </button>
      </div>

      {/* Day-of-week header — clean single-letter style without "." */}
      <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-gray-500">
        {WEEK_HEADERS.map((d) => (
          <div key={d} className="py-1.5">
            {d.replace('.', '')}
          </div>
        ))}
      </div>

      {/* Date grid — each cell shows date number above per-night price.
          Per-day status (booked/pending/hold/adjusted/discounted) is computed
          from dayInfoFor() and dictates colors + interactivity. */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((d) => {
          const key = ymd(d)
          const isPast = key < todayKey
          const isCurrentMonth = d.getUTCMonth() === view.month0
          const isCheckin = !!checkinKey && key === checkinKey
          const isCheckout = !!checkoutKey && key === checkoutKey
          const inRange =
            !!checkinKey && !!checkoutKey && key > checkinKey && key < checkoutKey
          const isToday = key === todayKey
          const info = dayInfoFor(d)
          const isUnavailable =
            info.status === 'booked' ||
            info.status === 'pending' ||
            info.status === 'hold'
          // Hotel-style checkout rule: an unavailable day represents that NIGHT
          // being booked. A guest can still CHECK OUT on that morning (room is
          // free until ~afternoon when the next customer arrives). So when the
          // picker is in "out" mode, allow clicking a struck-through day —
          // they're just leaving before the next guest arrives, no conflict.
          const allowAsCheckoutOnly = isUnavailable && pickerMode === 'out'
          const disabled =
            isPast ||
            (isUnavailable && !allowAsCheckoutOnly) ||
            (pickerMode === 'out' && !!checkinKey && key <= checkinKey)

          const fadedText = !isCurrentMonth || isPast

          // Background tier — selected (rose pill) > in-range (rose-50) >
          // today (gray) > plain. Booked/pending/hold get NO background color
          // (the strike-through on the date number conveys unavailability).
          let bgCls = 'rounded-xl hover:bg-gray-50'
          if (isCheckin || isCheckout) bgCls = 'rounded-xl bg-rose-500 hover:bg-rose-600'
          else if (inRange) bgCls = 'bg-rose-50'
          else if (isUnavailable && isCurrentMonth) bgCls = 'rounded-xl'
          else if (isToday) bgCls = 'rounded-xl bg-gray-100'

          // Date number color — all unavailable states use the same muted gray
          // (strike-through alone is the signal; no per-status color hint)
          const numberCls = isCheckin || isCheckout
            ? 'text-white'
            : fadedText
              ? 'text-gray-300'
              : isUnavailable
                ? 'text-gray-400'
                : 'text-gray-900'

          // Strike-through for unavailable dates
          const numberDecoration =
            isUnavailable && isCurrentMonth ? 'line-through' : ''

          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && pickDate(d)}
              disabled={disabled}
              className={`flex flex-col items-center justify-center gap-0.5 py-3 transition disabled:cursor-not-allowed ${bgCls}`}
            >
              {/* Date number on TOP */}
              <span
                className={`text-base font-bold tabular-nums ${numberCls} ${numberDecoration}`}
              >
                {d.getUTCDate()}
              </span>

              {/* Price BELOW — content depends on status:
                  - booked/pending/hold: NO price (date shows with strike, the
                    background tint conveys the status — matches reference design
                    where empty space below a strike-through date = unavailable)
                  - adjusted: BLUE price
                  - discounted: original price strike + discounted price red
                  - available: gray price as before */}
              {isUnavailable && isCurrentMonth ? (
                // Empty placeholder — keeps cell heights consistent across the grid
                <span className="text-xs" aria-hidden>
                  &nbsp;
                </span>
              ) : info.status === 'discounted' && info.originalPrice && isCurrentMonth ? (
                // Stacked: original price on TOP (strike), discounted price BELOW
                <span className="flex flex-col items-center leading-tight tabular-nums">
                  <span className="text-[10px] text-gray-400 line-through">
                    ฿{info.originalPrice.toLocaleString('en-US')}
                  </span>
                  <span
                    className={
                      isCheckin || isCheckout
                        ? 'text-xs font-bold text-white'
                        : 'text-xs font-bold text-rose-600'
                    }
                  >
                    ฿{info.price.toLocaleString('en-US')}
                  </span>
                </span>
              ) : (
                <span
                  className={`text-xs font-medium tabular-nums ${
                    isCheckin || isCheckout
                      ? 'text-white/90'
                      : fadedText
                        ? 'text-gray-300'
                        : info.status === 'adjusted'
                          ? 'text-sky-600 font-bold'
                          : 'text-gray-600'
                  }`}
                >
                  ฿{info.price.toLocaleString('en-US')}
                </span>
              )}
            </button>
          )
        })}
      </div>

    </div>
  )
}
