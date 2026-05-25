'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Icon, cn } from '@pms/ui'
import { THAI_MONTHS, ymd } from '@/lib/date'
import { useT } from '@/lib/i18n'

interface Props {
  propertyId: string
  onCellClick?: (variantId: string, date: Date) => void
  /** Controlled "ราคาขาย / ส่ง Agent" mode. When provided, the internal toggle UI is hidden. */
  priceMode?: 'sell' | 'agent'
}

/** Day-of-week i18n keys indexed 0..6 (Sun..Sat) */
const DOW_KEYS = [
  'dow.sunday',
  'dow.monday',
  'dow.tuesday',
  'dow.wednesday',
  'dow.thursday',
  'dow.friday',
  'dow.saturday',
] as const

const MONTH_SHORT_TH = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const

/**
 * Layout 3 — Variants as rows, days as horizontal columns (scrollable).
 * Runblook-style: English DOW + Thai short date, Sunday column highlighted,
 * full price values, BOOKED cells as red pills with text.
 */
export function PriceTableHorizontal({ propertyId, onCellClick, priceMode: controlledMode }: Props) {
  const t = useT()
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
      {/* Top bar — price-mode toggle only, right-aligned. Month nav has been moved INTO
          the table's top-left corner cell so the calendar controls all live together. */}
      {!isControlled && data.property.partnerListing && (
        <div className="mb-3 flex justify-end">
          <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
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
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {/* Top-left corner: month navigator + jump-to-today (replaces ห้อง/ขนาด label) */}
                <th
                  colSpan={2}
                  className="sticky left-0 z-20 border-b border-r border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white p-1 shadow-inner ring-1 ring-gray-200">
                    <button
                      type="button"
                      onClick={() => nav(-1)}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                      aria-label="เดือนก่อน"
                      title="เดือนก่อนหน้า"
                    >
                      <Icon name="chevronLeft" className="size-3.5" />
                    </button>
                    <div className="px-1 text-center text-[12px] font-semibold normal-case tracking-normal text-gray-800 tabular-nums">
                      {THAI_MONTHS[view.month0]} {view.year + 543}
                    </div>
                    <button
                      type="button"
                      onClick={() => nav(1)}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                      aria-label="เดือนถัดไป"
                      title="เดือนถัดไป"
                    >
                      <Icon name="chevronRight" className="size-3.5" />
                    </button>
                    {/* วันนี้ — proper button styling (bg + ring), nowrap, lives in the same pill */}
                    <button
                      type="button"
                      onClick={() => setView(today)}
                      className="ml-0.5 shrink-0 whitespace-nowrap rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold normal-case tracking-normal text-brand-700 ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-100 hover:ring-brand-300"
                      title="กลับไปเดือนปัจจุบัน"
                    >
                      วันนี้
                    </button>
                  </div>
                </th>
                {days.map((d) => {
                  const key = ymd(d)
                  const dow = d.getUTCDay()
                  const isSunday = dow === 0
                  const isToday = key === todayKey
                  return (
                    <th
                      key={key}
                      className={cn(
                        'min-w-[120px] border-b border-l border-gray-200 px-2 py-3 text-center align-middle',
                        isSunday ? 'bg-sky-200/70' : 'bg-white',
                        isToday && !isSunday && 'bg-brand-50',
                      )}
                    >
                      <div
                        className={cn(
                          'text-[11px] font-medium',
                          isSunday ? 'text-sky-900' : 'text-gray-500',
                        )}
                      >
                        {t(DOW_KEYS[dow]!)}
                      </div>
                      <div
                        className={cn(
                          'mt-1 text-[11px] font-semibold',
                          isSunday ? 'text-sky-900' : 'text-gray-700',
                        )}
                      >
                        {d.getUTCDate()} {MONTH_SHORT_TH[d.getUTCMonth()]}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const label = v.variant.isDefault ? 'เหมาหลัง' : 'แบ่งห้องนอน'
                const dayByKey = new Map(v.days.map((x) => [ymd(new Date(x.date)), x]))

                // ── Build render plan ──
                // Walk days once and group consecutive BOOKED / PENDING / MAINTENANCE
                // cells that share the same booking (or same status for maintenance).
                // Each plan entry is either:
                //   - { kind: 'skip' }       — absorbed by a previous colSpan
                //   - { kind: 'cell', span } — render a normal <td colSpan=span>
                type Plan =
                  | { kind: 'skip' }
                  | { kind: 'cell'; span: number }
                const plan: Plan[] = new Array(days.length)

                const isStripStatus = (s: string) =>
                  s === 'BOOKED' || s === 'PENDING_PAYMENT' || s === 'UNDER_MAINTENANCE'

                let walk = 0
                while (walk < days.length) {
                  const startDate = days[walk]!
                  const startDay = dayByKey.get(ymd(startDate))
                  if (startDay && isStripStatus(startDay.status)) {
                    let len = 1
                    while (walk + len < days.length) {
                      const nextDate = days[walk + len]!
                      const nextDay = dayByKey.get(ymd(nextDate))
                      if (!nextDay) break
                      if (nextDay.status !== startDay.status) break
                      // Match by bookingId for BOOKED/PENDING; same status is enough for MAINTENANCE
                      if (startDay.status !== 'UNDER_MAINTENANCE') {
                        if (!startDay.bookingId || nextDay.bookingId !== startDay.bookingId) break
                      }
                      len++
                    }
                    plan[walk] = { kind: 'cell', span: len }
                    for (let j = 1; j < len; j++) plan[walk + j] = { kind: 'skip' }
                    walk += len
                  } else {
                    plan[walk] = { kind: 'cell', span: 1 }
                    walk += 1
                  }
                }

                return (
                  <tr key={v.variant.id} className="border-b border-gray-100 last:border-b-0">
                    {/* Label column — plain text only (weekly-rate config is on the header button) */}
                    <td className="sticky left-0 z-10 whitespace-nowrap border-r border-gray-200 bg-white px-4 py-3 align-middle">
                      <div className="text-sm font-medium text-gray-800">{label}</div>
                    </td>
                    {/* Capacity column */}
                    <td className="whitespace-nowrap border-r border-gray-200 bg-white px-3 py-3 text-center align-middle">
                      <div className="text-xs font-medium text-gray-800">
                        <span className="font-semibold text-gray-900">{v.variant.maxGuests}</span> ท่าน
                      </div>
                    </td>
                    {days.map((d, dayIdx) => {
                      const p = plan[dayIdx]!
                      if (p.kind === 'skip') return null
                      const colSpan = p.span

                      const key = ymd(d)
                      const day = dayByKey.get(key)
                      const isToday = key === todayKey

                      const cellBg = cn('border-l border-gray-100 bg-white')

                      if (!day) {
                        return (
                          <td key={key} colSpan={colSpan} className={cn('px-1 py-2 text-center text-[10px] text-gray-300', cellBg)}>
                            —
                          </td>
                        )
                      }
                      const status = day.status
                      const priceType = day.priceType

                      // BOOKED / PENDING / MAINTENANCE — single <td colSpan={N}> with one continuous pill
                      if (status === 'BOOKED' || status === 'PENDING_PAYMENT' || status === 'UNDER_MAINTENANCE') {
                        const pillBg =
                          status === 'BOOKED'
                            ? 'bg-red-500 hover:bg-red-600'
                            : status === 'PENDING_PAYMENT'
                              ? 'bg-amber-400 hover:bg-amber-500'
                              : 'bg-gray-400 hover:bg-gray-500'

                        const labelName =
                          status === 'UNDER_MAINTENANCE'
                            ? (day.note ?? 'ปิด')
                            : (day.customerName ?? '—')
                        // cellLabel is split into name + suffix so the suffix never gets truncated

                        const tooltip =
                          status === 'BOOKED'
                            ? `จองโดย ${day.customerName ?? '—'}${colSpan > 1 ? ` (${colSpan} คืน)` : ''}${day.note ? ` · ${day.note}` : ''}`
                            : status === 'PENDING_PAYMENT'
                              ? `รอชำระ — ${day.customerName ?? '—'}${colSpan > 1 ? ` (${colSpan} คืน)` : ''}`
                              : `ปิดซ่อม${day.note ? ` — ${day.note}` : ''}`

                        // Strip extends past the right edge — applies to BOOKED, PENDING,
                        // and MAINTENANCE for consistent visual behavior.
                        // 22px normal; reduced to 12px when next cell is another strip
                        // (keeps a small visible gap between back-to-back strips).
                        const nextDayIdx = dayIdx + colSpan
                        const nextDay =
                          nextDayIdx < days.length ? dayByKey.get(ymd(days[nextDayIdx]!)) : undefined
                        const nextIsAnotherStrip =
                          !!nextDay &&
                          (nextDay.status === 'BOOKED' ||
                            nextDay.status === 'PENDING_PAYMENT' ||
                            nextDay.status === 'UNDER_MAINTENANCE')
                        const canExtend =
                          status === 'BOOKED' ||
                          status === 'PENDING_PAYMENT' ||
                          status === 'UNDER_MAINTENANCE'
                        const extensionPx = canExtend ? (nextIsAnotherStrip ? 12 : 16) : null
                        return (
                          <td
                            key={key}
                            colSpan={colSpan}
                            className={cn('relative p-1.5 align-middle', cellBg)}
                          >
                            <button
                              type="button"
                              onClick={() => onCellClick?.(v.variant.id, new Date(day.date))}
                              title={tooltip}
                              style={
                                extensionPx !== null
                                  ? { width: `calc(100% + ${extensionPx}px)` }
                                  : undefined
                              }
                              className={cn(
                                'flex h-9 items-center rounded-full px-3 text-[11px] font-semibold text-white transition-colors',
                                pillBg,
                                extensionPx !== null
                                  ? 'relative z-10 w-auto justify-start'
                                  : 'w-full justify-start',
                              )}
                              aria-label={`${key} · ${tooltip}`}
                            >
                              <span className="min-w-0 truncate text-left">
                                {labelName}
                              </span>
                            </button>
                          </td>
                        )
                      }

                      // Locked-by-sibling: render lock icon instead of price
                      if (day.lockedBySibling) {
                        return (
                          <td
                            key={key}
                            className={cn('px-1 py-2 text-center align-middle bg-gray-50', cellBg)}
                          >
                            <div className="flex items-center justify-center text-gray-400" title="ถูกล็อก — มีการจองในรูปแบบห้องอื่น">
                              <Icon name="lock" className="size-3.5" />
                            </div>
                          </td>
                        )
                      }

                      // Price text color based on priceType
                      const textColor =
                        priceType === 'SPECIAL'
                          ? 'text-blue-600 font-semibold underline decoration-blue-300 underline-offset-2'
                          : priceType === 'DISCOUNT'
                            ? 'text-red-500 font-semibold'
                            : 'text-gray-700'
                      const arrow = priceType === 'DISCOUNT' ? ' ↓' : ''

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
                      // Split variant + weekly Lock for this DOW → no sale → lock icon for BOTH modes
                      const splitLocked = !v.variant.isDefault && day.splitOpen === false
                      const displayed = splitLocked ? null : numericPrice
                      return (
                        <td
                          key={key}
                          className={cn('px-1 py-2 text-center align-middle', cellBg)}
                        >
                          <button
                            type="button"
                            onClick={() => onCellClick?.(v.variant.id, new Date(day.date))}
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[11px] tabular-nums transition-colors hover:bg-gray-100',
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
                              <span className="inline-flex items-baseline gap-1">
                                <span className="text-[9px] text-gray-400 line-through">
                                  ฿{day.originalPrice.toLocaleString('en-US')}
                                </span>
                                <span className="font-bold text-red-600">
                                  ฿{displayed.toLocaleString('en-US')}
                                </span>
                              </span>
                            ) : (
                              <>
                                ฿{displayed.toLocaleString('en-US')}
                                {arrow}
                              </>
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
    </div>
  )
}
