'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { buildMonthGrid, formatBaht, formatMonthLabel, THAI_DOW_SHORT, ymd } from '@/lib/date'
import { cn } from '@pms/ui'

interface Props {
  variantId: string
  onCellClick?: (date: Date) => void
  /** Show price label inside cells (default true). */
  showPrice?: boolean
}

/**
 * Per-villa-variant mini month calendar.
 * Self-fetches the range from tRPC.
 */
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

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
          aria-label="เดือนก่อน"
        >
          ‹
        </button>
        <div className="text-sm font-semibold text-gray-900">{formatMonthLabel(view.year, view.month0)}</div>
        <button
          type="button"
          onClick={() => nav(1)}
          className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
          aria-label="เดือนถัดไป"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-gray-200 bg-gray-200 text-center text-xs">
        {THAI_DOW_SHORT.map((d) => (
          <div key={d} className="bg-gray-50 py-1.5 font-medium text-gray-500">
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

          const colorClass = cn(
            'bg-white',
            !cell.inMonth && 'opacity-30',
            status === 'BOOKED' && 'bg-red-50',
            status === 'PENDING_PAYMENT' && 'bg-amber-50',
            status === 'UNDER_MAINTENANCE' && 'bg-gray-200',
            priceType === 'SPECIAL' && status === 'OPEN' && 'bg-blue-50',
            priceType === 'DISCOUNT' && status === 'OPEN' && 'bg-emerald-50',
          )

          const priceColor = cn(
            'text-gray-700',
            status === 'BOOKED' && 'text-red-700 font-semibold',
            status === 'PENDING_PAYMENT' && 'text-amber-700',
            status === 'UNDER_MAINTENANCE' && 'text-gray-500',
            priceType === 'SPECIAL' && status === 'OPEN' && 'text-blue-700',
            priceType === 'DISCOUNT' && status === 'OPEN' && 'text-emerald-700',
          )

          const content = (
            <div className={cn('flex h-full flex-col items-center justify-center gap-0.5 px-1 py-1.5', colorClass)}>
              <div className={cn('text-[11px] font-medium', cell.inMonth ? 'text-gray-900' : 'text-gray-400')}>
                {cell.dayNum}
              </div>
              {showPrice && cell.inMonth && (
                <div className={cn('text-[10px]', priceColor)}>
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
              onClick={() => onCellClick(cell.date)}
              className="aspect-square cursor-pointer transition-opacity hover:opacity-80"
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
