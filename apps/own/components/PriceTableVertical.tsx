'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Icon, cn } from '@pms/ui'
import { formatMonthLabel, ymd } from '@/lib/date'

interface Props {
  propertyId: string
  onCellClick?: (variantId: string, date: Date) => void
}

const DOW_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'] as const

/**
 * Layout 2 — Days as rows, variants (เหมาหลัง + แบ่งห้องนอน) as columns.
 * Mirrors Runblook's "รูปแบบ 2".
 */
export function PriceTableVertical({ propertyId, onCellClick }: Props) {
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
      {/* ราคาขาย / ส่ง Agent toggle */}
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {/* Month navigator */}
                <th colSpan={2} className="w-44 border-r border-gray-200 px-2 py-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => nav(-1)}
                      className="flex size-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                      aria-label="เดือนก่อน"
                    >
                      <Icon name="chevronLeft" className="size-3.5" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700">
                      {formatMonthLabel(view.year, view.month0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => nav(1)}
                      className="flex size-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                      aria-label="เดือนถัดไป"
                    >
                      <Icon name="chevronRight" className="size-3.5" />
                    </button>
                  </div>
                </th>
                {variants.map((v) => {
                  const isDefault = v.variant.isDefault
                  return (
                    <th
                      key={v.variant.id}
                      className="border-l border-gray-200 px-3 py-3 text-center"
                    >
                      <div className="text-sm font-semibold text-red-600">
                        {isDefault ? 'เหมาหลัง' : 'แบ่งห้องนอน'}
                      </div>
                      <div className="mt-1 text-[11px] font-normal text-gray-500">
                        {v.variant.bedrooms} ห้องนอน, {v.variant.maxGuests} ท่าน
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => {
                const key = ymd(d)
                const isToday = key === todayKey
                const dow = d.getUTCDay()
                const isWeekend = dow === 0 || dow === 6
                return (
                  <tr
                    key={key}
                    className={cn(
                      'border-b border-gray-100 last:border-b-0',
                      isToday && 'bg-brand-50/40',
                    )}
                  >
                    <td
                      className={cn(
                        'w-12 border-r border-gray-200 px-2 py-2 text-center text-sm',
                        isToday ? 'font-semibold text-brand-700' : 'text-gray-600',
                      )}
                    >
                      {i + 1}
                    </td>
                    <td
                      className={cn(
                        'w-28 border-r border-gray-200 px-3 py-2 text-sm',
                        isWeekend && 'font-medium',
                        isToday ? 'text-brand-700' : 'text-gray-700',
                      )}
                    >
                      {DOW_FULL[dow]}
                    </td>
                    {variants.map((v) => {
                      const day = v.days.find((x) => ymd(new Date(x.date)) === key)
                      if (!day) {
                        return (
                          <td
                            key={v.variant.id}
                            className="border-l border-gray-200 px-2 py-2 text-center text-xs text-gray-400"
                          >
                            —
                          </td>
                        )
                      }
                      const status = day.status
                      const priceType = day.priceType

                      if (
                        status === 'BOOKED' ||
                        status === 'PENDING_PAYMENT' ||
                        status === 'UNDER_MAINTENANCE'
                      ) {
                        const bg =
                          status === 'BOOKED'
                            ? 'bg-red-500 hover:bg-red-600'
                            : status === 'PENDING_PAYMENT'
                              ? 'bg-amber-400 hover:bg-amber-500'
                              : 'bg-gray-400 hover:bg-gray-500'
                        const label = status === 'UNDER_MAINTENANCE' ? 'ปิดซ่อม' : ''
                        return (
                          <td key={v.variant.id} className="border-l border-gray-200 p-1.5">
                            <button
                              type="button"
                              onClick={() => onCellClick?.(v.variant.id, new Date(day.date))}
                              className={cn(
                                'flex h-8 w-full items-center justify-center rounded-md text-xs font-medium text-white transition-colors',
                                bg,
                              )}
                            >
                              {label}
                            </button>
                          </td>
                        )
                      }

                      const textColor =
                        priceType === 'SPECIAL'
                          ? 'text-blue-700 font-semibold'
                          : priceType === 'DISCOUNT'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-gray-700'

                      return (
                        <td
                          key={v.variant.id}
                          className="border-l border-gray-200 px-2 py-2 text-center"
                        >
                          <button
                            type="button"
                            onClick={() => onCellClick?.(v.variant.id, new Date(day.date))}
                            className={cn(
                              'w-full rounded px-2 py-1 text-sm transition-colors hover:bg-gray-50',
                              textColor,
                            )}
                          >
                            ฿{day.price.toLocaleString()}
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
