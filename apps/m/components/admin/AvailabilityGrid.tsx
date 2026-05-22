'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Icon } from '@pms/ui'

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setUTCDate(x.getUTCDate() + n)
  return x
}

function ymdLocal(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfWeekUTC(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

const DAYS = 14 // 2-week window

export function AvailabilityGrid({ hotelId }: { hotelId: string }) {
  const [anchor, setAnchor] = useState<Date>(() => {
    const t = new Date()
    t.setUTCHours(0, 0, 0, 0)
    return t
  })

  const from = useMemo(() => startOfWeekUTC(anchor), [anchor])
  const to = useMemo(() => addDays(from, DAYS), [from])

  const { data, isPending } = trpc.admin.hotelBooking.availabilityByHotel.useQuery({
    hotelId,
    from,
    to,
  })

  const dateList = useMemo(() => {
    const arr: Date[] = []
    for (let i = 0; i < DAYS; i++) arr.push(addDays(from, i))
    return arr
  }, [from])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">ห้องว่างต่อวัน — 14 วัน</h3>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {from.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} →{' '}
            {addDays(to, -1).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" size="icon" variant="outline" onClick={() => setAnchor(addDays(anchor, -DAYS))}>
            <Icon name="chevronLeft" className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const t = new Date()
              t.setUTCHours(0, 0, 0, 0)
              setAnchor(t)
            }}
          >
            วันนี้
          </Button>
          <Button type="button" size="icon" variant="outline" onClick={() => setAnchor(addDays(anchor, DAYS))}>
            <Icon name="chevronRight" className="size-3.5" />
          </Button>
        </div>
      </div>

      {isPending && (
        <div className="py-10 text-center text-sm text-gray-500">
          <Icon name="spinner" spin className="mr-2 size-4" /> กำลังโหลด...
        </div>
      )}

      {!isPending && (!data || data.length === 0) && (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
          ยังไม่มีประเภทห้อง — เพิ่มที่หน้า &quot;แก้ไขโรงแรม&quot; ก่อน
        </div>
      )}

      {!isPending && data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
                  ประเภทห้อง
                </th>
                {dateList.map((d) => {
                  const isToday = ymdLocal(d) === ymdLocal(new Date())
                  const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6
                  return (
                    <th
                      key={d.toISOString()}
                      className={`px-1 py-2 text-center text-[10px] font-medium ${
                        isToday ? 'text-brand-700' : isWeekend ? 'text-rose-600' : 'text-gray-500'
                      }`}
                    >
                      <div>{d.toLocaleDateString('th-TH', { weekday: 'narrow' })}</div>
                      <div className={isToday ? 'font-bold' : ''}>{d.getUTCDate()}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((rt) => {
                const name = (rt.roomType.name as { th?: string })?.th ?? rt.roomType.id
                return (
                  <tr key={rt.roomType.id} className="hover:bg-gray-50/50">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 align-middle">
                      <div className="font-medium text-gray-900">{name}</div>
                      <div className="text-[10px] text-gray-500">รวม {rt.roomType.totalInventory} ห้อง</div>
                    </td>
                    {rt.days.map((day) => {
                      const ratio = day.available / Math.max(1, day.total)
                      let cellClass = ''
                      if (day.available === 0) cellClass = 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
                      else if (ratio < 0.3) cellClass = 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                      else cellClass = 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      return (
                        <td key={day.date} className="px-1 py-1 text-center align-middle">
                          <div
                            className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums ${cellClass}`}
                            title={`${day.date}: เหลือ ${day.available}/${day.total} (จอง ${day.reserved})`}
                          >
                            {day.available}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[10.5px] text-gray-500">
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-emerald-100 ring-1 ring-emerald-200" /> ว่างเยอะ (≥ 30%)</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-amber-50 ring-1 ring-amber-200" /> ใกล้เต็ม (&lt; 30%)</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-rose-100 ring-1 ring-rose-200" /> เต็ม (0)</span>
      </div>
    </div>
  )
}
