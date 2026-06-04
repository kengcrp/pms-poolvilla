'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Icon, cn } from '@pms/ui'
import { formatMonthLabel, ymd } from '@/lib/date'

interface Props {
  propertyId: string
  onCellClick?: (variantId: string, date: Date) => void
  /** Controlled "ราคาขาย / ส่ง Agent" mode. When provided, the internal toggle UI is hidden
   *  so the caller (e.g. pricing page) can render the toggle in its own header slot. */
  priceMode?: 'sell' | 'agent'
}

const DOW_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'] as const
const DOW_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] as const

/**
 * Layout 2 — Days as rows, variants (เหมาหลัง + แบ่งห้องนอน) as columns.
 * Mirrors Runblook's "รูปแบบ 2".
 */
export function PriceTableVertical({ propertyId, onCellClick, priceMode: controlledMode }: Props) {
  const today = useMemo(() => {
    const d = new Date()
    return { year: d.getUTCFullYear(), month0: d.getUTCMonth() }
  }, [])
  const [view, setView] = useState(today)
  const [internalMode, setInternalMode] = useState<'sell' | 'agent'>('sell')
  const isControlled = controlledMode !== undefined
  const priceMode = controlledMode ?? internalMode
  const setPriceMode = setInternalMode

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
      {/* ราคาขาย / ราคาส่ง toggle — same pill design as MiniCalendar (Layout 1) so all
          layouts share a consistent control. Only shown when:
          - caller doesn't own the state (isControlled = false), AND
          - this property opted into ราคาส่ง Agent (partnerListing) */}
      {!isControlled && data.property.partnerListing && (
        <div className="mb-3 inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setPriceMode('sell')}
            className={cn(
              'rounded-full px-5 py-1.5 text-xs font-semibold transition-all',
              priceMode === 'sell'
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            ราคาขาย
          </button>
          <button
            type="button"
            onClick={() => setPriceMode('agent')}
            className={cn(
              'rounded-full px-5 py-1.5 text-xs font-semibold transition-all',
              priceMode === 'agent'
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                : 'text-gray-500 hover:text-gray-700',
            )}
            title="ราคาสำหรับ Agent (ฟีเจอร์เต็มอยู่ใน roadmap)"
          >
            ราคาส่ง
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {/* Month navigator — chevrons + label as a pill only. "วันนี้"
                    moved OUTSIDE this card (rendered below the table) per design. */}
                <th colSpan={2} className="border-r border-gray-200 px-1 py-2 sm:px-2 sm:py-3">
                  <div className="flex justify-center">
                    <div className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-1 py-0.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => nav(-1)}
                        className="flex size-6 items-center justify-center rounded-full text-gray-500 transition-colors hover:text-gray-700 sm:size-7"
                        aria-label="เดือนก่อน"
                      >
                        <Icon name="chevronLeft" className="size-3" />
                      </button>
                      <span className="whitespace-nowrap px-1 text-xs font-bold tabular-nums text-gray-900 sm:px-2 sm:text-sm">
                        {formatMonthLabel(view.year, view.month0)}
                      </span>
                      <button
                        type="button"
                        onClick={() => nav(1)}
                        className="flex size-6 items-center justify-center rounded-full text-gray-500 transition-colors hover:text-gray-700 sm:size-7"
                        aria-label="เดือนถัดไป"
                      >
                        <Icon name="chevronRight" className="size-3" />
                      </button>
                    </div>
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
                      {/* Stats moved here from the property header — bedrooms +
                          bathrooms (property-level, only on เหมาหลัง) + max guests.
                          Compact labels (นอน / น้ำ) instead of full words. */}
                      <div className="mt-1 text-[11px] font-medium text-gray-800">
                        <span className="font-semibold text-gray-900">{v.variant.bedrooms}</span> นอน,{' '}
                        {isDefault && (
                          <>
                            <span className="font-semibold text-gray-900">{data.property.totalBathrooms}</span> น้ำ,{' '}
                          </>
                        )}
                        <span className="font-semibold text-gray-900">{v.variant.maxGuests}</span> ท่าน
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
                        'w-8 border-r border-gray-200 px-1 py-2 text-center text-xs sm:w-12 sm:px-2 sm:text-sm',
                        isToday ? 'font-semibold text-brand-700' : 'text-gray-600',
                      )}
                    >
                      {i + 1}
                    </td>
                    <td
                      className={cn(
                        'w-12 border-r border-gray-200 px-1.5 py-2 text-xs sm:w-28 sm:px-3 sm:text-sm',
                        isWeekend && 'font-medium',
                        isToday ? 'text-brand-700' : 'text-gray-700',
                      )}
                    >
                      {/* Phone: 2-letter Thai abbreviation; Tablet+: full word. */}
                      <span className="sm:hidden">{DOW_SHORT[dow]}</span>
                      <span className="hidden sm:inline">{DOW_FULL[dow]}</span>
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

                      // Resolve "effective" hold info — sibling-locked cells get treated like own holds
                      // but rendered with opacity + lock icon so the source is visually distinct.
                      const fromSibling = status === 'OPEN' && day.lockedBySibling
                      const effectiveStatus = fromSibling ? day.siblingStatus : status
                      const effectiveCustomerName = fromSibling ? day.siblingCustomerName : day.customerName
                      const effectiveNote = fromSibling ? day.siblingNote : day.note

                      if (
                        effectiveStatus === 'BOOKED' ||
                        effectiveStatus === 'PENDING_PAYMENT' ||
                        effectiveStatus === 'UNDER_MAINTENANCE'
                      ) {
                        const bg =
                          effectiveStatus === 'BOOKED'
                            ? 'bg-red-500 hover:bg-red-600'
                            : effectiveStatus === 'PENDING_PAYMENT'
                              ? 'bg-amber-400 hover:bg-amber-500'
                              : 'bg-gray-400 hover:bg-gray-500'
                        const label =
                          effectiveStatus === 'UNDER_MAINTENANCE'
                            ? (effectiveNote ?? 'ปิดซ่อม')
                            : (effectiveCustomerName ?? '—')
                        const tooltip =
                          (fromSibling ? '🔒 (รูปแบบห้องอื่น) ' : '') +
                          (effectiveStatus === 'BOOKED'
                            ? `จองโดย ${label}`
                            : effectiveStatus === 'PENDING_PAYMENT'
                              ? `รอชำระ — ${label}`
                              : `ปิดซ่อม${effectiveNote ? ` — ${effectiveNote}` : ''}`)
                        return (
                          <td key={v.variant.id} className="border-l border-gray-200 p-1.5">
                            <button
                              type="button"
                              onClick={() => onCellClick?.(v.variant.id, new Date(day.date))}
                              title={tooltip}
                              className={cn(
                                'flex h-8 w-full items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-white transition-colors',
                                bg,
                                fromSibling && 'opacity-70',
                              )}
                            >
                              {fromSibling && <Icon name="lock" className="size-3 shrink-0" />}
                              <span className="min-w-0 truncate">{label}</span>
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

                      // Pick price based on toggle — agentPrice null shows lock icon instead of "฿0".
                      // Also coerce NaN/undefined to null so we never render "฿NaN".
                      const rawDisplayed =
                        priceMode === 'agent'
                          ? day.agentPrice
                          : day.price
                      const numericPrice =
                        typeof rawDisplayed === 'number' && Number.isFinite(rawDisplayed)
                          ? rawDisplayed
                          : null
                      // Split variant + weekly Lock for this DOW → no sale on this day → lock icon
                      const splitLocked = !v.variant.isDefault && day.splitOpen === false
                      const displayed = splitLocked ? null : numericPrice
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
                            {displayed === null ? (
                              <span className="inline-flex items-center justify-center text-gray-400" title="ยังไม่ได้ตั้งราคา / ปิดการขาย">
                                <Icon name="lock" className="size-3.5" />
                              </span>
                            ) : priceType === 'DISCOUNT' &&
                              day.originalPrice != null &&
                              day.originalPrice > displayed ? (
                              // Promo: original strikethrough + new price red
                              <span className="inline-flex items-baseline gap-1.5">
                                <span className="text-[11px] text-gray-400 line-through">
                                  ฿{day.originalPrice.toLocaleString()}
                                </span>
                                <span className="font-bold text-red-600">
                                  ฿{displayed.toLocaleString()}
                                </span>
                              </span>
                            ) : (
                              <>฿{displayed.toLocaleString()}</>
                            )}
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

      {/* "เลื่อนบนสุด" — outside the table card; tapping resets to the current
          month so the user can jump back to "today" from anywhere in the year. */}
      <div className="mt-2 flex justify-center">
        <button
          type="button"
          onClick={() => setView(today)}
          className="whitespace-nowrap px-3 py-1 text-xs font-semibold text-brand-700 transition-colors hover:text-brand-800"
          title="กลับไปเดือนปัจจุบัน"
        >
          เลื่อนบนสุด
        </button>
      </div>
    </div>
  )
}
