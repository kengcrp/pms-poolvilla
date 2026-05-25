'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { buildMonthGrid, THAI_DOW_SHORT, THAI_MONTHS, ymd } from '@/lib/date'
import { Icon, cn } from '@pms/ui'

interface Props {
  variantId: string
  onCellClick?: (date: Date) => void
  /** Show the selling_price / send_agent toggle above the calendar (default true) */
  showPriceModeToggle?: boolean
  /** Property-level booking window — dates beyond `today + N months` get a
   *  "ยังไม่เปิดจอง" treatment (grayed out, no price, click disabled). null = no cap. */
  bookingWindowMonths?: number | null
  /** When true (default false = the "เหมาหลัง" variant), per-day Lock toggles
   *  in the weekly modal hide the price on that day for this variant. */
  isSplitVariant?: boolean
  /** Hide customer name in booking strips — show only generic status labels.
   *  Used by the share-friendly /listings-calendar view (no PII). */
  hideCustomerName?: boolean
  /** Property-level "ราคาส่ง Agent" toggle (from Property.partnerListing).
   *  When false, the ราคาขาย / ราคาส่ง switch above the calendar is hidden entirely
   *  (the property simply doesn't sell wholesale). Default false → opt-in. */
  partnerListing?: boolean
  /** Hide ALL price information from cells — calendar still shows dates + booking status,
   *  but no ฿X.XX text appears anywhere. Used by /listings-calendar/hide share view. */
  hidePrices?: boolean
  /** Initial price-mode selection. Defaults to 'sell'. Pass 'agent' for the wholesale share view. */
  initialPriceMode?: 'sell' | 'agent'
  /** Controlled price mode — when set, the internal toggle is hidden (the caller owns the
   *  state and renders its own toggle, e.g. on a property card's meta row). */
  priceMode?: 'sell' | 'agent'
  /** Compact mode — reduces cell height for grids where space is at a premium (Layout 1
   *  property cards). Cells still show dates, prices, and booking strips clearly. */
  dense?: boolean
}

/**
 * Calendar grid — Runblook-style cells.
 * Multi-night BOOKED strips overlay across consecutive cells using absolute
 * positioning, so every day still shows its own date number underneath.
 */
export function MiniCalendar({
  variantId,
  onCellClick,
  showPriceModeToggle = true,
  bookingWindowMonths = null,
  isSplitVariant = false,
  hideCustomerName = false,
  partnerListing = false,
  hidePrices = false,
  initialPriceMode = 'sell',
  priceMode: controlledPriceMode,
  dense = false,
}: Props) {
  const today = useMemo(() => {
    const d = new Date()
    return { year: d.getUTCFullYear(), month0: d.getUTCMonth() }
  }, [])
  const [view, setView] = useState(today)
  const [internalPriceMode, setInternalPriceMode] = useState<'sell' | 'agent'>(initialPriceMode)
  // If caller passes a controlled `priceMode`, use it; otherwise own state internally.
  const priceMode = controlledPriceMode ?? internalPriceMode
  const isPriceModeControlled = controlledPriceMode !== undefined
  const setPriceMode = setInternalPriceMode

  const grid = useMemo(() => buildMonthGrid(view.year, view.month0), [view])
  const from = grid[0]!.date
  const to = grid[grid.length - 1]!.date

  const { data, isPending } = trpc.calendar.range.useQuery({
    variantId,
    from: ymd(from),
    to: ymd(to),
  })

  /**
   * Enrich each API day with "effective" status/bookingId/customerName so the strip
   * plan + render code treats sibling-locked days the same as the cell's own bookings.
   * - Own status takes priority (a cell's own BOOKED beats a sibling lock)
   * - Otherwise, if locked by sibling, surface the sibling's booking info
   */
  const dayMap = useMemo(() => {
    type ApiDay = NonNullable<typeof data>[number]
    type Enriched = ApiDay & {
      effectiveStatus: ApiDay['status']
      effectiveBookingId: string | null
      effectiveCustomerName: string | null
      effectiveNote: string | null
      fromSibling: boolean
    }
    const m = new Map<string, Enriched>()
    if (data) {
      for (const d of data) {
        const fromSibling = d.status === 'OPEN' && d.lockedBySibling
        m.set(ymd(new Date(d.date)), {
          ...d,
          effectiveStatus: fromSibling ? (d.siblingStatus ?? d.status) : d.status,
          effectiveBookingId: fromSibling ? d.siblingBookingId : d.bookingId,
          effectiveCustomerName: fromSibling ? d.siblingCustomerName : d.customerName,
          effectiveNote: fromSibling ? d.siblingNote : d.note,
          fromSibling,
        })
      }
    }
    return m
  }, [data])

  // ── Build cell plan ──
  // 'single' = render cell normally (with pill if BOOKED single-day)
  // 'first'  = first cell of a multi-day BOOKED strip — render absolute strip overlay
  // 'continuation' = middle/last cell of a strip — date only, pill hidden (overlay covers it)
  const plan = useMemo(() => {
    type StripStatus = 'BOOKED' | 'PENDING_PAYMENT' | 'UNDER_MAINTENANCE'
    type Entry =
      | { kind: 'single' }
      | {
          kind: 'first'
          stripLen: number
          extend: boolean
          status: StripStatus
          /** Strip wraps in from previous row's Saturday → square left edge, bleed past left */
          continuesFromPrevRow: boolean
          /** Strip continues into next row from Saturday → square right edge, bleed past right */
          continuesToNextRow: boolean
        }
      | { kind: 'continuation' }
    const result: Entry[] = new Array(grid.length).fill({ kind: 'single' as const })

    const isStripStatus = (s?: string): s is StripStatus =>
      s === 'BOOKED' || s === 'PENDING_PAYMENT' || s === 'UNDER_MAINTENANCE'

    // Match if same effective status AND (for BOOKED/PENDING) same effective bookingId.
    // MAINTENANCE matches by status alone (no bookingId). Also requires both cells be
    // either both "own" or both "sibling-locked" so we don't merge them visually.
    const matches = (
      a: { effectiveStatus: string; effectiveBookingId: string | null; fromSibling: boolean },
      b: { effectiveStatus: string; effectiveBookingId: string | null; fromSibling: boolean },
    ) => {
      if (a.effectiveStatus !== b.effectiveStatus) return false
      if (a.fromSibling !== b.fromSibling) return false
      if (a.effectiveStatus === 'UNDER_MAINTENANCE') return true
      return !!a.effectiveBookingId && a.effectiveBookingId === b.effectiveBookingId
    }

    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i]!
      const day = dayMap.get(ymd(cell.date))
      if (!day || !isStripStatus(day.effectiveStatus) || !cell.inMonth) continue
      // BOOKED/PENDING need a bookingId to group; MAINTENANCE doesn't
      if (day.effectiveStatus !== 'UNDER_MAINTENANCE' && !day.effectiveBookingId) continue

      const col = i % 7
      const prevSameRowCell = col > 0 ? grid[i - 1] : null
      const prevSameRowDay = prevSameRowCell ? dayMap.get(ymd(prevSameRowCell.date)) : null
      const isSameAsPrevSameRow =
        !!prevSameRowCell && prevSameRowCell.inMonth && !!prevSameRowDay && matches(day, prevSameRowDay)
      if (isSameAsPrevSameRow) continue

      let continuesFromPrevRow = false
      if (col === 0 && i >= 7) {
        const prevRowSatCell = grid[i - 1]!
        const prevRowSatDay = dayMap.get(ymd(prevRowSatCell.date))
        if (prevRowSatCell.inMonth && prevRowSatDay && matches(day, prevRowSatDay)) {
          continuesFromPrevRow = true
        }
      }

      let len = 1
      while (col + len < 7 && i + len < grid.length) {
        const nextCell = grid[i + len]!
        if (!nextCell.inMonth) break
        const nextDay = dayMap.get(ymd(nextCell.date))
        if (!nextDay || !matches(day, nextDay)) break
        len++
      }

      const lastCol = col + len - 1
      const isLastColSat = lastCol === 6
      const nextRowSunIdx = i + len
      const nextRowSunCell = isLastColSat && nextRowSunIdx < grid.length ? grid[nextRowSunIdx] : null
      const nextRowSunDay = nextRowSunCell ? dayMap.get(ymd(nextRowSunCell.date)) : null
      const continuesToNextRow =
        isLastColSat && !!nextRowSunCell && nextRowSunCell.inMonth && !!nextRowSunDay && matches(day, nextRowSunDay)

      const cellAfterIdx = i + len
      const cellAfter = col + len < 7 && cellAfterIdx < grid.length ? grid[cellAfterIdx] : null
      const dayAfter = cellAfter ? dayMap.get(ymd(cellAfter.date)) : null
      const nextIsAnotherStrip =
        !!cellAfter && cellAfter.inMonth && !!dayAfter && isStripStatus(dayAfter.effectiveStatus)
      const extend = !nextIsAnotherStrip

      result[i] = {
        kind: 'first',
        stripLen: len,
        extend,
        status: day.effectiveStatus as StripStatus,
        continuesFromPrevRow,
        continuesToNextRow,
      }
      for (let j = 1; j < len; j++) result[i + j] = { kind: 'continuation' }
    }
    return result
  }, [grid, dayMap])

  /**
   * Wrap-checkout indicators: when a booking ends on Saturday (last cell of a row)
   * and its checkout day falls on next row's Sunday, show a small leftward tab on
   * that Sunday cell. Same color as the booking — visual cue that the strip "wraps".
   */
  const wrapCheckoutMap = useMemo(() => {
    type StripStatus = 'BOOKED' | 'PENDING_PAYMENT' | 'UNDER_MAINTENANCE'
    const isStripStatus = (s?: string): s is StripStatus =>
      s === 'BOOKED' || s === 'PENDING_PAYMENT' || s === 'UNDER_MAINTENANCE'
    const map = new Map<number, StripStatus>()
    for (let i = 0; i < grid.length; i++) {
      const col = i % 7
      if (col !== 0 || i === 0) continue
      const prevCell = grid[i - 1]!
      const prevDay = dayMap.get(ymd(prevCell.date))
      if (!prevCell.inMonth || !prevDay || !isStripStatus(prevDay.effectiveStatus)) continue
      const cell = grid[i]!
      const day = dayMap.get(ymd(cell.date))
      const isSameBooking =
        !!day &&
        day.effectiveStatus === prevDay.effectiveStatus &&
        day.fromSibling === prevDay.fromSibling &&
        (prevDay.effectiveStatus === 'UNDER_MAINTENANCE' ||
          (!!prevDay.effectiveBookingId && day.effectiveBookingId === prevDay.effectiveBookingId))
      if (isSameBooking) continue
      if (day && isStripStatus(day.effectiveStatus)) {
        continue
      }
      map.set(i, prevDay.effectiveStatus as StripStatus)
    }
    return map
  }, [grid, dayMap])

  function nav(deltaMonth: number) {
    setView((v) => {
      const next = v.month0 + deltaMonth
      const year = v.year + Math.floor(next / 12)
      const month0 = ((next % 12) + 12) % 12
      return { year, month0 }
    })
  }

  const todayKey = ymd(new Date())
  // Maximum bookable date (UTC midnight). null = no cap (system default).
  const maxBookableDate = useMemo(() => {
    if (bookingWindowMonths == null) return null
    const d = new Date()
    d.setUTCMonth(d.getUTCMonth() + bookingWindowMonths)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  }, [bookingWindowMonths])

  return (
    <div className="w-full">
      {/* selling_price / send_agent toggle — only ACTUALLY rendered when this property
          opted into ราคาส่ง Agent (partnerListing). When the caller wants the toggle area
          (showPriceModeToggle) but the property hasn't opted in, an invisible placeholder
          keeps the calendar's total height consistent across cards in the same grid.
          Hidden entirely when the parent controls priceMode (renders its own toggle). */}
      {showPriceModeToggle && !isPriceModeControlled && (
        <div
          className={cn(
            'mb-3 inline-flex w-full rounded-full bg-gray-100 p-1 shadow-inner',
            !partnerListing && 'invisible',
          )}
          aria-hidden={!partnerListing}
        >
          <button
            type="button"
            onClick={() => partnerListing && setPriceMode('sell')}
            className={cn(
              'flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
              priceMode === 'sell'
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                : 'text-gray-500 hover:text-gray-700',
            )}
            tabIndex={partnerListing ? 0 : -1}
          >
            ราคาขาย
          </button>
          <button
            type="button"
            onClick={() => partnerListing && setPriceMode('agent')}
            className={cn(
              'flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
              priceMode === 'agent'
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                : 'text-gray-500 hover:text-gray-700',
            )}
            title="ราคาสำหรับ Agent (ฟีเจอร์เต็มอยู่ใน roadmap)"
            tabIndex={partnerListing ? 0 : -1}
          >
            ราคาส่ง
          </button>
        </div>
      )}

      {/* Month nav — all controls (◀ month ▶ + วันนี้) live inside ONE framed pill,
          centered on the row so it reads as a single grouped control. */}
      <div className="mb-3 flex items-center justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-1 py-0.5 shadow-xs">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="flex size-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            aria-label="เดือนก่อน"
          >
            <Icon name="chevronLeft" className="size-3.5" />
          </button>
          <div className="px-2 text-sm font-bold tabular-nums text-gray-900">
            {THAI_MONTHS[view.month0]} {view.year + 543}
          </div>
          <button
            type="button"
            onClick={() => nav(1)}
            className="flex size-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            aria-label="เดือนถัดไป"
          >
            <Icon name="chevronRight" className="size-3.5" />
          </button>
          {/* "วันนี้" — also inside the same pill, separated by a thin vertical divider */}
          <span aria-hidden className="mx-0.5 h-4 w-px bg-gray-200" />
          <button
            type="button"
            onClick={() => setView(today)}
            className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            title="กลับไปเดือนปัจจุบัน"
          >
            วันนี้
          </button>
        </div>
      </div>

      {/* Calendar table — table-like layout with bordered cells */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        {/* DOW headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {THAI_DOW_SHORT.map((d) => (
            <div
              key={d}
              className="border-r border-gray-200 py-2 text-center text-[11px] font-semibold text-gray-600 last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7">
          {grid.map((cell, i) => {
            const planEntry = plan[i]!

            const key = ymd(cell.date)
            const dayData = dayMap.get(key)
            const status = dayData?.status ?? 'OPEN'
            const effectiveStatus = dayData?.effectiveStatus ?? 'OPEN'
            const priceType = dayData?.priceType
            const rawPrice = priceMode === 'agent' ? dayData?.agentPrice : dayData?.price
            // Coerce NaN/undefined → null so we never render "฿NaN"
            const safePrice =
              typeof rawPrice === 'number' && Number.isFinite(rawPrice) ? rawPrice : null
            // Split variant + weekly Lock for this DOW → hide price (any mode)
            const splitLocked = isSplitVariant && dayData?.splitOpen === false
            const price = safePrice ?? 0
            // Show lock icon when: split-locked OR agent mode w/o agent price
            const showLockIcon =
              splitLocked || (priceMode === 'agent' && safePrice === null)
            const fromSibling = dayData?.fromSibling ?? false
            // Beyond booking window — date is past the property's "open booking" range
            const beyondWindow =
              !!maxBookableDate && cell.inMonth && cell.date.getTime() > maxBookableDate.getTime()
            const clickable = !!onCellClick && cell.inMonth && !beyondWindow
            const isToday = key === todayKey && cell.inMonth

            const isLastCol = (i % 7) === 6
            const isLastRow = i >= grid.length - 7

            const cellBg =
              beyondWindow
                ? 'bg-gray-50'
                : effectiveStatus === 'UNDER_MAINTENANCE' && !fromSibling
                  ? 'bg-gray-200'
                  : 'bg-white'

            const numberColor = !cell.inMonth
              ? 'text-gray-300'
              : beyondWindow
                ? 'text-gray-300'
                : effectiveStatus === 'UNDER_MAINTENANCE' && !fromSibling
                  ? 'text-gray-500'
                  : 'text-gray-900'

            const isDiscount = priceType === 'DISCOUNT'
            const isSpecial = priceType === 'SPECIAL'

            // For 'continuation' cells: render date number but NO pill (overlay covers it).
            // For 'first' cells: render date number + price/pill area is replaced by the overlay strip.
            // For 'single' cells: render normally.
            const isContinuation = planEntry.kind === 'continuation'
            const isStripFirst = planEntry.kind === 'first'

            // Wrap-checkout indicator: small leftward tab on Sunday cells whose previous
            // row's Saturday was the end of a booking strip (visual "wrap" cue).
            const wrapStatus = wrapCheckoutMap.get(i)

            const cellInner = (
              <div className="flex h-full flex-col items-start justify-between px-2 pb-2 pt-1">
                <div
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center self-center rounded-full text-[13px] font-semibold leading-none',
                    numberColor,
                    // Use bg-only highlight (no ring) so the circle's visual size
                    // stays identical to every other cell.
                    isToday && 'bg-brand-100 text-brand-700',
                  )}
                >
                  {cell.dayNum}
                </div>

                <div className="w-full text-center">
                  {isContinuation || isStripFirst ? null /* strip overlay drawn separately */
                    : beyondWindow ? (
                      <div className="text-center text-[9px] font-medium text-gray-300">
                        ยังไม่เปิดจอง
                      </div>
                    )
                    : hidePrices ? null /* /listings-calendar/hide — calendar shows no prices at all */
                    : showLockIcon && cell.inMonth ? (
                      <div className="flex w-full items-center justify-center text-gray-400" title={splitLocked ? 'ปิดการขายในวันนี้' : 'ยังไม่ได้ตั้งราคา Agent'}>
                        <Icon name="lock" className="size-3.5" />
                      </div>
                    )
                    : cell.inMonth && price > 0 ? (
                    isDiscount ? (
                      // Tight stack: strikethrough original + actual price standard, leading-none
                      // so the 2-line price never overflows the cell's vertical bounds.
                      // Use the real originalPrice when stored; fall back to a 25% bump for legacy
                      // discounts that don't have one captured yet.
                      (() => {
                        const original =
                          dayData?.originalPrice != null && dayData.originalPrice > price
                            ? dayData.originalPrice
                            : Math.round(price * 1.25)
                        return (
                          <div className="flex flex-col items-center gap-0 leading-none">
                            <span className="text-[9px] text-gray-400 line-through">
                              ฿{original.toLocaleString('en-US')}
                            </span>
                            <span className="mt-0.5 text-[11.5px] font-semibold text-red-500">
                              ฿{price.toLocaleString('en-US')}
                            </span>
                          </div>
                        )
                      })()
                    ) : (
                      <div
                        className={cn(
                          'text-[13px] font-medium tabular-nums',
                          isSpecial ? 'font-semibold text-blue-600' : 'text-gray-700',
                        )}
                      >
                        ฿{price.toLocaleString('en-US')}
                      </div>
                    )
                  ) : null}
                </div>

                {/* Strip overlay — drawn on the FIRST cell of any BOOKED / PENDING / MAINTENANCE
                    strip segment within a row. Uses position:absolute to extend across N cell
                    widths + a small extension into the checkout day. Strips that wrap across
                    weekly rows render as TWO segments with squared edges at the row boundary. */}
                {/* Wrap-checkout indicator: small leftward tab when prev row's Saturday
                    booking ended and its checkout day falls here. Same color as the strip. */}
                {wrapStatus && (
                  <div
                    aria-hidden
                    className={cn(
                      'pointer-events-none absolute bottom-2 left-0 z-10 h-[22px] w-2.5 rounded-r-full',
                      wrapStatus === 'BOOKED'
                        ? 'bg-red-500'
                        : wrapStatus === 'PENDING_PAYMENT'
                          ? 'bg-amber-400'
                          : 'bg-gray-500',
                    )}
                  />
                )}

                {isStripFirst && (() => {
                  // Side bleeds extend the pill past cell boundaries when the strip
                  // continues onto/from another row — visually overflows the calendar's
                  // rounded container (which clips overflow), creating a clean wrap effect.
                  const ROW_BLEED = 16
                  const leftBleed = planEntry.continuesFromPrevRow ? ROW_BLEED : 0
                  const rightExt = planEntry.continuesToNextRow
                    ? ROW_BLEED
                    : planEntry.extend
                      ? 16
                      : 12

                  const stripStatus = planEntry.status
                  const stripBg =
                    stripStatus === 'BOOKED'
                      ? 'bg-red-500'
                      : stripStatus === 'PENDING_PAYMENT'
                        ? 'bg-amber-400'
                        : 'bg-gray-500'
                  // Use effective fields so sibling-locked cells display the sibling customer name.
                  // hideCustomerName → generic labels only (no PII in share-friendly views).
                  const stripLabel = hideCustomerName
                    ? stripStatus === 'BOOKED'
                      ? 'จอง'
                      : stripStatus === 'PENDING_PAYMENT'
                        ? 'รอชำระ'
                        : 'ปิดซ่อม'
                    : stripStatus === 'UNDER_MAINTENANCE'
                      ? (dayData?.effectiveNote ?? 'ปิดซ่อม')
                      : (dayData?.effectiveCustomerName ?? dayData?.effectiveNote ?? '—')
                  const stripFromSibling = !!dayData?.fromSibling

                  return (
                    <div
                      className="pointer-events-none absolute bottom-2 z-10 flex items-center"
                      style={{
                        left: `${8 - leftBleed}px`,
                        width: `calc(${planEntry.stripLen} * 100% - 16px + ${rightExt}px + ${leftBleed}px)`,
                      }}
                    >
                      <div
                        title={
                          (stripFromSibling ? '🔒 (รูปแบบห้องอื่น) ' : '') +
                          stripLabel +
                          (planEntry.stripLen > 1 ? ` (${planEntry.stripLen} คืน)` : '')
                        }
                        className={cn(
                          'flex w-full items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold leading-tight text-white',
                          stripBg,
                          // Sibling-locked strips render slightly lighter so the user can tell at a glance
                          // that this hold comes from another variant.
                          stripFromSibling && 'opacity-70',
                          planEntry.continuesFromPrevRow ? 'rounded-l-none' : 'rounded-l-full',
                          planEntry.continuesToNextRow ? 'rounded-r-none' : 'rounded-r-full',
                        )}
                      >
                        {stripFromSibling && !planEntry.continuesFromPrevRow && (
                          <Icon name="lock" className="size-3 shrink-0" />
                        )}
                        <span className="min-w-0 truncate">{stripLabel}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )

            const cellClass = cn(
              'relative border-gray-100 transition-colors',
              dense ? 'h-[62px]' : 'h-[78px]',
              !isLastCol && 'border-r',
              !isLastRow && 'border-b',
              cellBg,
              !cell.inMonth && 'bg-gray-50/60',
              clickable && 'cursor-pointer hover:bg-brand-50/40',
            )

            if (!clickable) {
              return (
                <div key={i} className={cellClass}>
                  {cellInner}
                </div>
              )
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => onCellClick(cell.date)}
                title={(() => {
                  const prefix = fromSibling ? '🔒 (รูปแบบห้องอื่น) ' : ''
                  if (effectiveStatus === 'BOOKED') {
                    return hideCustomerName
                      ? `${prefix}จอง`
                      : `${prefix}จองโดย ${dayData?.effectiveCustomerName ?? '—'}`
                  }
                  if (effectiveStatus === 'PENDING_PAYMENT') {
                    return hideCustomerName
                      ? `${prefix}รอชำระ`
                      : `${prefix}รอชำระ — ${dayData?.effectiveCustomerName ?? '—'}`
                  }
                  if (effectiveStatus === 'UNDER_MAINTENANCE') {
                    return hideCustomerName
                      ? `${prefix}ปิดซ่อม`
                      : `${prefix}ปิดซ่อม${dayData?.effectiveNote ? ` — ${dayData.effectiveNote}` : ''}`
                  }
                  return undefined
                })()}
                className={cn(cellClass, 'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500')}
                aria-label={key}
              >
                {cellInner}
              </button>
            )
          })}
        </div>
      </div>

      {isPending && <div className="mt-2 text-center text-[11px] text-gray-400">กำลังโหลด...</div>}
    </div>
  )
}
