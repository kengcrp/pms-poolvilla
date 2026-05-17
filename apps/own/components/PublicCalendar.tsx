'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { buildMonthGrid, formatBaht, formatMonthLabel, THAI_DOW_SHORT, ymd } from '@/lib/date'
import { Icon, cn } from '@pms/ui'

interface Props {
  slug: string
  variantId: string
  selectedRange?: { from: string; to: string }
  onCellClick?: (date: Date) => void
}

/**
 * Read-only calendar for /sale pages — fetches via public router.
 * Range select visual: start + end = filled brand-600, middle = brand-100,
 * today = small dot indicator (no ring), past = faded.
 */
export function PublicCalendar({ slug, variantId, selectedRange, onCellClick }: Props) {
  const today = useMemo(() => {
    const d = new Date()
    return { year: d.getUTCFullYear(), month0: d.getUTCMonth() }
  }, [])
  const [view, setView] = useState(today)

  const grid = useMemo(() => buildMonthGrid(view.year, view.month0), [view])
  const from = grid[0]!.date
  const to = grid[grid.length - 1]!.date

  const { data, isPending } = trpc.public.calendarRange.useQuery({
    slug,
    variantId,
    from: ymd(from),
    to: ymd(to),
  })

  const dayMap = useMemo(() => {
    const m = new Map<string, NonNullable<typeof data>[number]>()
    if (data) for (const d of data) m.set(ymd(new Date(d.date)), d)
    return m
  }, [data])

  function nav(deltaMonth: number) {
    setView((v) => {
      const next = v.month0 + deltaMonth
      const year = v.year + Math.floor(next / 12)
      const month0 = ((next % 12) + 12) % 12
      return { year, month0 }
    })
  }

  const todayKey = ymd(new Date())
  const fromSel = selectedRange?.from
  const toSel = selectedRange?.to

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="เดือนก่อน"
        >
          <Icon name="chevronLeft" className="size-4" />
        </button>
        <div className="text-base font-semibold text-gray-900">{formatMonthLabel(view.year, view.month0)}</div>
        <button
          type="button"
          onClick={() => nav(1)}
          className="flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="เดือนถัดไป"
        >
          <Icon name="chevronRight" className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {THAI_DOW_SHORT.map((d) => (
          <div key={d} className="py-1 text-xs font-medium text-gray-400">
            {d}
          </div>
        ))}
        {grid.map((cell, i) => {
          const key = ymd(cell.date)
          const dayData = dayMap.get(key)
          const status = dayData?.status ?? 'OPEN'
          const price = dayData?.price ?? 0
          const isPast = key < todayKey
          const isToday = key === todayKey && cell.inMonth
          const occupied = status === 'BOOKED' || status === 'PENDING_PAYMENT' || status === 'UNDER_MAINTENANCE'
          const isSelStart = !!fromSel && key === fromSel
          const isSelEnd = !!toSel && key === toSel
          const inSelected = !!fromSel && !!toSel && key > fromSel && key < toSel
          const isSelected = isSelStart || isSelEnd || inSelected
          const clickable = !!onCellClick && cell.inMonth && !isPast && !occupied

          // Visual state — selected wins over everything else
          // UX: check-in = filled (most prominent), nights = mid, check-out = lightest
          let cellClass: string
          let textClass: string
          if (isSelected) {
            if (isSelStart) {
              cellClass = 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
              textClass = 'text-white'
            } else if (isSelEnd) {
              cellClass = 'bg-brand-100 text-brand-800 ring-2 ring-inset ring-brand-300'
              textClass = 'text-brand-700'
            } else {
              cellClass = 'bg-brand-200/70 text-brand-800'
              textClass = 'text-brand-700'
            }
          } else if (occupied) {
            cellClass = 'bg-gray-100 text-gray-400'
            textClass = 'text-gray-400 line-through'
          } else if (isPast) {
            cellClass = 'text-gray-300'
            textClass = 'text-gray-300'
          } else if (clickable) {
            cellClass = 'border border-gray-200 bg-white text-gray-800 hover:border-brand-400 hover:bg-brand-50'
            textClass = 'text-gray-700'
          } else {
            cellClass = 'bg-white text-gray-400'
            textClass = 'text-gray-400'
          }

          const content = (
            <div
              className={cn(
                'relative flex h-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 transition-all',
                cellClass,
                !cell.inMonth && 'opacity-20',
              )}
            >
              <div className={cn('text-xs font-semibold leading-none', isSelStart && 'text-white')}>
                {cell.dayNum}
              </div>
              {cell.inMonth && !occupied && (
                <div className={cn('text-[10px] leading-none', textClass)}>
                  {formatBaht(price)}
                </div>
              )}
              {/* Today dot indicator */}
              {isToday && !isSelected && (
                <span
                  className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand-600"
                  aria-hidden
                />
              )}
              {isToday && isSelected && (
                <span
                  className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-white"
                  aria-hidden
                />
              )}
            </div>
          )

          if (!clickable) {
            return (
              <div key={i} className="aspect-square">
                {content}
              </div>
            )
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => onCellClick(cell.date)}
              className="aspect-square cursor-pointer rounded-lg transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label={key}
            >
              {content}
            </button>
          )
        })}
      </div>

      {selectedRange?.from && selectedRange?.to && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10.5px] text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-brand-600" /> เช็คอิน
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-brand-200/70" /> คืนพัก
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-brand-100 ring-1 ring-inset ring-brand-300" /> เช็คเอาท์
          </span>
        </div>
      )}

      {isPending && <div className="mt-2 text-center text-xs text-gray-400">กำลังโหลด...</div>}
    </div>
  )
}
