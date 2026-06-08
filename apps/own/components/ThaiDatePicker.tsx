'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildMonthGrid, THAI_DOW_SHORT, THAI_MONTHS, ymd } from '@/lib/date'
import { cn } from '@pms/ui'

interface Props {
  /** YYYY-MM-DD (CE year). Empty string = no selection. */
  value: string
  onChange: (v: string) => void
  /** YYYY-MM-DD lower bound (inclusive) — earlier dates render disabled. */
  min?: string
  /** YYYY-MM-DD upper bound (inclusive) — later dates render disabled. */
  max?: string
  placeholder?: string
  className?: string
}

/**
 * Lightweight Thai-localized date picker.
 *
 * Replaces the native `<input type="date">` which shows browser-default English
 * UI ("June 2026", "S M T W T F S", "Clear", "Today") that we can't control.
 * This component renders:
 *   - The selected date in Thai ("8 มิถุนายน 2569") in the input button.
 *   - A popover calendar with Thai DOW headers + Thai month + Buddhist year.
 *   - "เคลียร์" + "วันนี้" footer actions.
 *
 * Stores the value as an ISO YYYY-MM-DD (CE year) so it remains drop-in
 * compatible with existing form state / sessionStorage / API payloads.
 */
export function ThaiDatePicker({ value, onChange, min, max, placeholder, className }: Props) {
  const [open, setOpen] = useState(false)
  // Trigger ref — used both for outside-click detection AND for measuring the
  // anchor rect so the portalled popover knows where to position itself.
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  // Popover position in viewport coordinates. Computed when opening + on
  // resize/scroll so the popover stays glued to the trigger button.
  const [popPos, setPopPos] = useState<{ top: number; left: number } | null>(null)

  // Anchor the month view to the current selection (or today if empty).
  const [view, setView] = useState(() => {
    const d = value ? new Date(value + 'T00:00:00Z') : new Date()
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() }
  })

  // When the externally-controlled `value` jumps to another month (e.g. parent
  // pre-fills it), follow that month so the highlight is visible immediately.
  useEffect(() => {
    if (!value) return
    const d = new Date(value + 'T00:00:00Z')
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() })
  }, [value])

  // Reposition the popover under the trigger. Re-runs on open + on scroll/resize.
  useEffect(() => {
    if (!open) {
      setPopPos(null)
      return
    }
    function updatePos() {
      const r = triggerRef.current?.getBoundingClientRect()
      if (!r) return
      // Default: open below the trigger. Flip above if not enough room.
      const popoverHeight = 320
      const spaceBelow = window.innerHeight - r.bottom
      const top =
        spaceBelow >= popoverHeight + 8 || r.top < popoverHeight + 8
          ? r.bottom + 4
          : r.top - popoverHeight - 4
      // Default: align left edge to trigger. Nudge in from viewport edges.
      const popoverWidth = 280
      const maxLeft = window.innerWidth - popoverWidth - 8
      const left = Math.max(8, Math.min(r.left, maxLeft))
      setPopPos({ top, left })
    }
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open])

  // Close popover on outside click or ESC. Outside = neither the trigger nor
  // the portalled popover contains the click target.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (popoverRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view])

  /** UTC-midnight string for "today" — matches how `value` is encoded. */
  const todayStr = useMemo(() => {
    const t = new Date()
    return ymd(new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())))
  }, [])

  function shiftMonth(delta: number) {
    setView((prev) => {
      const m = prev.month + delta
      const y = prev.year + Math.floor(m / 12)
      const mm = ((m % 12) + 12) % 12
      return { year: y, month: mm }
    })
  }

  function pick(d: Date) {
    onChange(ymd(d))
    setOpen(false)
  }

  function pickToday() {
    onChange(todayStr)
    setOpen(false)
  }

  function clear() {
    onChange('')
    setOpen(false)
  }

  function formatDisplay(s: string): string {
    if (!s) return ''
    const d = new Date(s + 'T00:00:00Z')
    return `${d.getUTCDate()} ${THAI_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`
  }

  // Popover content — extracted so we can portal it to document.body and avoid
  // being clipped by any parent's `overflow-hidden`.
  const popover =
    open && popPos && typeof window !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: popPos.top,
              left: popPos.left,
              width: 280,
              zIndex: 10000,
            }}
            className="rounded-xl border border-gray-200 bg-white p-3 shadow-xl ring-1 ring-gray-900/5"
          ><PopoverInner
              view={view}
              shiftMonth={shiftMonth}
              cells={cells}
              value={value}
              todayStr={todayStr}
              pick={pick}
              clear={clear}
              pickToday={pickToday}
              min={min}
              max={max}
            />
          </div>,
          document.body,
        )
      : null

  return (
    <div className={cn('relative', className)}>
      {/* Trigger button — looks like an input field. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? formatDisplay(value) : (placeholder ?? 'เลือกวันที่')}
        </span>
        <svg className="size-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.75A2.25 2.25 0 0 1 18 6.25v9.5A2.25 2.25 0 0 1 15.75 18H4.25A2.25 2.25 0 0 1 2 15.75v-9.5A2.25 2.25 0 0 1 4.25 4H5V2.75A.75.75 0 0 1 5.75 2ZM3.5 8v7.75c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75V8h-13Z" />
        </svg>
      </button>
      {popover}
    </div>
  )
}

/** Inner content of the popover — split out so the parent can render it via
 *  portal without re-implementing the layout. */
function PopoverInner({
  view,
  shiftMonth,
  cells,
  value,
  todayStr,
  pick,
  clear,
  pickToday,
  min,
  max,
}: {
  view: { year: number; month: number }
  shiftMonth: (delta: number) => void
  cells: ReturnType<typeof buildMonthGrid>
  value: string
  todayStr: string
  pick: (d: Date) => void
  clear: () => void
  pickToday: () => void
  min?: string
  max?: string
}) {
  return (
        <div>
          {/* Month nav */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="flex size-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="เดือนก่อนหน้า"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M12.707 4.293a1 1 0 010 1.414L8.414 10l4.293 4.293a1 1 0 11-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div className="text-sm font-bold tabular-nums text-gray-900">
              {THAI_MONTHS[view.month]} {view.year + 543}
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="flex size-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="เดือนถัดไป"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M7.293 15.707a1 1 0 010-1.414L11.586 10 7.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* DOW headers */}
          <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-semibold text-gray-500">
            {THAI_DOW_SHORT.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              const key = ymd(cell.date)
              const isSelected = value === key
              const isToday = todayStr === key
              const isDimmed = !cell.inMonth
              const isDisabled = (!!min && key < min) || (!!max && key > max)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => pick(cell.date)}
                  className={cn(
                    'aspect-square rounded-lg text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                      : isToday
                        ? 'bg-brand-50 font-bold text-brand-700 hover:bg-brand-100'
                        : isDimmed
                          ? 'text-gray-300 hover:bg-gray-50'
                          : 'text-gray-700 hover:bg-gray-100',
                    isDisabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
                  )}
                >
                  {cell.dayNum}
                </button>
              )
            })}
          </div>

          {/* Footer actions */}
          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={clear}
              className="text-xs font-medium text-gray-500 transition-colors hover:text-red-600"
            >
              เคลียร์
            </button>
            <button
              type="button"
              onClick={pickToday}
              className="text-xs font-bold text-brand-700 transition-colors hover:text-brand-800"
            >
              วันนี้
            </button>
          </div>
        </div>
  )
}
