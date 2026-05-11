'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { buildMonthGrid, formatBaht, formatMonthLabel, THAI_DOW_SHORT, ymd } from '@/lib/date'
import { cn } from '@pms/ui'

interface Props {
  variantId: string
  onCellClick?: (date: Date) => void
  showPrice?: boolean
}

export function MiniCalendar({ variantId, onCellClick, showPrice = true }: Props) {
  const today = useMemo(() => {
    const d = new Date()
    return { year: d.getUTCFullYear(), month0: d.getUTCMonth() }
  }, [])
  const [view, setView] = useState(today)

  const grid = useMemo(() => buildMonthGrid(view.year, view.month0), [view])
  const from = grid[0]!.date
  const to = grid[grid.length - 1]!.date

  const { data, isPending } = trpc.calendar.range.useQuery({
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

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="flex size-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="เดือนก่อน"
        >
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
        </button>
        <div className="text-sm font-semibold text-gray-900">{formatMonthLabel(view.year, view.month0)}</div>
        <button
          type="button"
          onClick={() => nav(1)}
          className="flex size-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="เดือนถัดไป"
        >
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {THAI_DOW_SHORT.map((d) => (
          <div key={d} className="py-1 font-medium text-gray-400">
            {d}
          </div>
        ))}
        {grid.map((cell, i) => {
          const key = ymd(cell.date)
          const dayData = dayMap.get(key)
          const status = dayData?.status ?? 'OPEN'
          const priceType = dayData?.priceType
          const price = dayData?.price ?? 0
          const clickable = !!onCellClick && cell.inMonth
          const isToday = key === todayKey && cell.inMonth

          const variantClasses =
            status === 'BOOKED'
              ? 'bg-red-50 border-red-200 text-red-700'
              : status === 'PENDING_PAYMENT'
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : status === 'UNDER_MAINTENANCE'
                  ? 'bg-gray-100 border-gray-300 text-gray-500'
                  : priceType === 'SPECIAL'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : priceType === 'DISCOUNT'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-gray-100 text-gray-700'

          const content = (
            <div
              className={cn(
                'flex h-full flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1.5 transition-all',
                variantClasses,
                !cell.inMonth && 'opacity-30 grayscale',
                isToday && 'ring-2 ring-brand-500 ring-offset-1',
              )}
            >
              <div className={cn('text-[11px] font-semibold leading-none', !cell.inMonth && 'text-gray-300')}>
                {cell.dayNum}
              </div>
              {showPrice && cell.inMonth && (
                <div className="text-[9.5px] font-medium leading-none">
                  {status === 'UNDER_MAINTENANCE' ? 'ปิด' : formatBaht(price)}
                </div>
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
              onClick={() => {
                console.log('[MiniCalendar] cell clicked:', key)
                onCellClick(cell.date)
              }}
              className="aspect-square cursor-pointer rounded-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
              aria-label={key}
            >
              {content}
            </button>
          )
        })}
      </div>

      {isPending && <div className="mt-2 text-center text-[11px] text-gray-400">กำลังโหลด...</div>}
    </div>
  )
}
