'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { buildMonthGrid, formatBaht, formatMonthLabel, THAI_DOW_SHORT, ymd } from '@/lib/date'
import { cn } from '@pms/ui'

interface Props {
  slug: string
  variantId: string
  selectedRange?: { from: string; to: string }
  onCellClick?: (date: Date) => void
}

/**
 * Read-only calendar for /sale pages — fetches via public router.
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
          <svg className="size-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
        </button>
        <div className="text-base font-semibold text-gray-900">{formatMonthLabel(view.year, view.month0)}</div>
        <button
          type="button"
          onClick={() => nav(1)}
          className="flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="เดือนถัดไป"
        >
          <svg className="size-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
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
          const occupied = status === 'BOOKED' || status === 'PENDING_PAYMENT' || status === 'UNDER_MAINTENANCE'
          const inSelected = fromSel && toSel && key >= fromSel && key < toSel
          const isSelStart = key === fromSel
          const isSelEnd = key === toSel
          const clickable = !!onCellClick && cell.inMonth && !isPast && !occupied

          const variantClasses = occupied
            ? 'bg-gray-100 text-gray-400 line-through'
            : isPast
              ? 'bg-white text-gray-300'
              : inSelected
                ? 'bg-brand-100 text-brand-800 font-medium'
                : 'bg-white text-gray-800 hover:bg-brand-50'

          const content = (
            <div
              className={cn(
                'flex h-full flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 transition-all',
                'border-transparent',
                variantClasses,
                !cell.inMonth && 'opacity-30',
                key === todayKey && cell.inMonth && 'ring-2 ring-brand-500',
                isSelStart && 'ring-2 ring-brand-600',
                isSelEnd && 'ring-2 ring-brand-600',
              )}
            >
              <div className="text-xs font-semibold leading-none">{cell.dayNum}</div>
              {cell.inMonth && !occupied && (
                <div className="text-[10px] leading-none">{formatBaht(price)}</div>
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
              className="aspect-square cursor-pointer rounded-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label={key}
            >
              {content}
            </button>
          )
        })}
      </div>

      {isPending && <div className="mt-2 text-center text-xs text-gray-400">กำลังโหลด...</div>}
    </div>
  )
}
