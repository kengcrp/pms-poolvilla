'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Icon, cn } from '@pms/ui'
import { formatBaht, formatMonthLabel, THAI_DOW_SHORT, ymd } from '@/lib/date'

interface Props {
  propertyId: string
  onCellClick?: (variantId: string, date: Date) => void
}

/**
 * Layout 2 — Days as rows, variants as columns.
 * Used in /manage/calendar when user picks "รูปแบบ 2".
 */
export function PriceTableVertical({ propertyId, onCellClick }: Props) {
  const today = useMemo(() => {
    const d = new Date()
    return { year: d.getUTCFullYear(), month0: d.getUTCMonth() }
  }, [])
  const [view, setView] = useState(today)

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
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="flex size-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="เดือนก่อน"
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
          aria-label="เดือนถัดไป"
        >
          <Icon name="chevronRight" className="size-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-12 px-2 py-2 text-center text-xs font-semibold text-gray-500">#</th>
              <th className="w-24 px-2 py-2 text-left text-xs font-semibold text-gray-500">วัน</th>
              {variants.map((v) => {
                const name = (v.variant.name as { th?: string })?.th ?? `${v.variant.bedrooms} นอน`
                const isDefault = v.variant.isDefault
                return (
                  <th
                    key={v.variant.id}
                    className="px-2 py-2 text-center text-xs font-semibold text-red-600"
                  >
                    <div>{isDefault ? 'เหมาหลัง' : 'แบ่งห้องนอน'}</div>
                    <div className="mt-0.5 text-[10.5px] font-normal text-gray-500">
                      {!isDefault && `${v.variant.bedrooms} ห้องนอน, `}
                      {v.variant.maxGuests} ท่าน
                      {isDefault && `, ${v.variant.bedrooms} ห้องนอน`}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] font-normal text-gray-400">{name}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {days.map((d, i) => {
              const key = ymd(d)
              const isToday = key === todayKey
              const dayNum = d.getUTCDate()
              const dow = d.getUTCDay()
              return (
                <tr
                  key={key}
                  className={cn(
                    'border-b border-gray-100 last:border-b-0',
                    isToday && 'bg-brand-50/40',
                  )}
                >
                  <td className="px-2 py-2 text-center text-xs text-gray-700">{i + 1}</td>
                  <td className="px-2 py-2 text-xs text-gray-700">
                    {THAI_DOW_FULL_SHORT[dow]} ({dayNum})
                  </td>
                  {variants.map((v) => {
                    const day = v.days.find((x) => ymd(new Date(x.date)) === key)
                    if (!day) {
                      return <td key={v.variant.id} className="px-2 py-2 text-center text-xs text-gray-400">—</td>
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
                        <td key={v.variant.id} className="p-1">
                          <button
                            type="button"
                            onClick={() => onCellClick?.(v.variant.id, new Date(day.date))}
                            className={cn(
                              'flex h-7 w-full items-center justify-center rounded text-xs font-medium text-white transition-opacity hover:opacity-90',
                              bg,
                            )}
                          >
                            {status === 'UNDER_MAINTENANCE' ? 'ปิด' : ''}
                          </button>
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
                      <td key={v.variant.id} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => onCellClick?.(v.variant.id, new Date(day.date))}
                          className={cn(
                            'rounded px-2 py-0.5 text-xs transition-colors hover:bg-gray-100',
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
  )
}

// Full day-of-week labels for layout 2 row
const THAI_DOW_FULL_SHORT = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
// Avoid unused import warning
void THAI_DOW_SHORT
void formatBaht
