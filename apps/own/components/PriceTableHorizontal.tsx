'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Icon, cn } from '@pms/ui'
import { formatMonthLabel, ymd } from '@/lib/date'

interface Props {
  propertyId: string
  onCellClick?: (variantId: string, date: Date) => void
}

const DOW_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] as const

/**
 * Layout 3 — Variants as rows, days as horizontal columns (scrollable).
 * Compact view for comparing all variants across the month.
 */
export function PriceTableHorizontal({ propertyId, onCellClick }: Props) {
  const today = useMemo(() => {
    const d = new Date()
    return { year: d.getUTCFullYear(), month0: d.getUTCMonth() }
  }, [])
  const [view, setView] = useState(today)
  const [priceMode, setPriceMode] = useState<'sell' | 'agent'>('sell')

  const from = new Date(Date.UTC(view.year, view.month0, 1))
  const to = new Date(Date.UTC(view.year, view.month0 + 1, 0))

  const { data, isPending } = trpc.calendar.byProperty.useQuery({
    propertyId,
    from: ymd(from),
    to: ymd(to),
  })

  const days = useMemo(() => {
    const arr: Date[] = []
    const cur = new Date(from)
    while (cur.getTime() <= to.getTime()) {
      arr.push(new Date(cur))
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
    return arr
  }, [from, to])

  function nav(deltaMonth: number) {
    setView((v) => {
      const next = v.month0 + deltaMonth
      const year = v.year + Math.floor(next / 12)
      const month0 = ((next % 12) + 12) % 12
      return { year, month0 }
    })
  }

  if (isPending || !data) {
    return <div className="py-6 text-center text-sm text-gray-500">กำลังโหลด...</div>
  }

  const todayKey = ymd(new Date())
  const variants = data.variants

  return (
    <div>
      <div className="mb-3 inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setPriceMode('sell')}
          className={cn(
            'rounded-lg px-4 py-1.5 text-sm font-semibold transition-all',
            priceMode === 'sell'
              ? 'bg-brand-50 text-brand-700'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          ราคาขาย
        </button>
        <button
          type="button"
          onClick={() => setPriceMode('agent')}
          className={cn(
            'rounded-lg px-4 py-1.5 text-sm font-semibold transition-all',
            priceMode === 'agent'
              ? 'bg-brand-50 text-brand-700'
              : 'text-gray-500 hover:text-gray-700',
          )}
          title="ราคาสำหรับ Agent (ฟีเจอร์เต็มอยู่ใน roadmap)"
        >
          ส่ง Agent
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="flex size-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <Icon name="chevronLeft" className="size-3.5" />
        </button>
        <div className="rounded-lg bg-gray-50 px-4 py-1 text-sm font-semibold text-gray-700">
          {formatMonthLabel(view.year, view.month0)}
        </div>
        <button
          type="button"
          onClick={() => nav(1)}
          className="flex size-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <Icon name="chevronRight" className="size-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="sticky left-0 z-10 w-32 border-r border-gray-200 bg-gray-50 px-2 py-1.5 text-left text-[10.5px] font-semibold text-gray-500">
                ประเภท
              </th>
              <th className="w-16 border-r border-gray-200 px-1 py-1.5 text-center text-[10.5px] font-semibold text-gray-500">
                จำนวน
              </th>
              {days.map((d) => {
                const key = ymd(d)
                const isToday = key === todayKey
                const dow = d.getUTCDay()
                return (
                  <th
                    key={key}
                    className={cn(
                      'min-w-[52px] px-1 py-1.5 text-center text-[10px] font-medium',
                      isToday ? 'bg-brand-100 text-brand-800' : 'text-gray-500',
                    )}
                  >
                    <div>{DOW_SHORT[dow]}</div>
                    <div className="text-[11px] font-semibold">{d.getUTCDate()}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => {
              const name = (v.variant.name as { th?: string })?.th ?? `${v.variant.bedrooms} นอน`
              const label = v.variant.isDefault ? 'เหมาหลัง' : 'แบ่งห้องนอน'
              return (
                <tr key={v.variant.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="sticky left-0 z-10 border-r border-gray-200 bg-white px-2 py-1.5 text-left text-xs">
                    <div className="font-medium text-gray-800">{label}</div>
                    <div className="text-[10px] text-gray-400" title={name}>
                      {v.variant.bedrooms} ห้องนอน
                    </div>
                  </td>
                  <td className="border-r border-gray-200 px-1 py-1.5 text-center text-[10.5px] text-gray-600">
                    {v.variant.maxGuests} ท่าน
                  </td>
                  {days.map((d) => {
                    const key = ymd(d)
                    const day = v.days.find((x) => ymd(new Date(x.date)) === key)
                    const isToday = key === todayKey
                    if (!day) {
                      return (
                        <td
                          key={key}
                          className={cn('px-0.5 py-1 text-center text-[10px]', isToday && 'bg-brand-50/30')}
                        >
                          —
                        </td>
                      )
                    }
                    const status = day.status
                    const priceType = day.priceType
                    if (status === 'BOOKED' || status === 'PENDING_PAYMENT' || status === 'UNDER_MAINTENANCE') {
                      const bg =
                        status === 'BOOKED'
                          ? 'bg-red-500'
                          : status === 'PENDING_PAYMENT'
                            ? 'bg-amber-400'
                            : 'bg-gray-400'
                      return (
                        <td key={key} className={cn('p-0.5', isToday && 'bg-brand-50/30')}>
                          <button
                            type="button"
                            onClick={() => onCellClick?.(v.variant.id, new Date(day.date))}
                            className={cn('h-5 w-full rounded', bg)}
                            aria-label={key}
                          />
                        </td>
                      )
                    }
                    const textColor =
                      priceType === 'SPECIAL'
                        ? 'text-blue-700 font-medium'
                        : priceType === 'DISCOUNT'
                          ? 'text-emerald-700 font-medium'
                          : 'text-gray-700'
                    return (
                      <td
                        key={key}
                        className={cn(
                          'px-0.5 py-1 text-center text-[10px]',
                          isToday && 'bg-brand-50/30',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onCellClick?.(v.variant.id, new Date(day.date))}
                          className={cn('rounded px-1 transition-colors hover:bg-gray-100', textColor)}
                        >
                          {formatShortBaht(day.price)}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  )
}

function formatShortBaht(n: number) {
  if (n === 0) return '—'
  if (n >= 1000) {
    const k = n / 1000
    return `฿${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`
  }
  return `฿${n}`
}
