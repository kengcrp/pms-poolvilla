import { prisma, type CalendarStatus, type PriceOverrideType } from '@pms/db'

/**
 * Date utility: format a Date to YYYY-MM-DD (UTC).
 * We compare/store dates as midnight UTC.
 */
export function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/**
 * Iterate days [from, to] inclusive.
 */
export function eachDay(from: Date, to: Date): Date[] {
  const days: Date[] = []
  const cur = toDateOnly(from)
  const end = toDateOnly(to)
  while (cur.getTime() <= end.getTime()) {
    days.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}

export type CalendarDay = {
  date: Date
  /** Derived display price (override → weekly → 0). */
  price: number
  /** Status — defaults to OPEN if no override row exists. */
  status: CalendarStatus
  /** Discount / Special tag if override has priceType set. */
  priceType: PriceOverrideType | null
  note: string | null
  bookingId: string | null
  /** True when this row is a stored override (not derived from weekly default). */
  isOverride: boolean
}

/**
 * Get calendar entries for a variant within [from, to] inclusive.
 * Single source of truth — combines override rows + weekly pricing fallback.
 */
export async function getCalendarRange(
  variantId: string,
  from: Date,
  to: Date,
): Promise<CalendarDay[]> {
  const fromD = toDateOnly(from)
  const toD = toDateOnly(to)

  const [weekly, overrides] = await Promise.all([
    prisma.variantWeeklyPricing.findMany({ where: { variantId } }),
    prisma.variantCalendar.findMany({
      where: { variantId, date: { gte: fromD, lte: toD } },
    }),
  ])

  const weeklyByDow = new Map(weekly.map((w) => [w.dayOfWeek, Number(w.price)]))
  const overrideByDate = new Map(overrides.map((o) => [o.date.toISOString().slice(0, 10), o]))

  return eachDay(fromD, toD).map((date) => {
    const key = date.toISOString().slice(0, 10)
    const ov = overrideByDate.get(key)
    const dow = date.getUTCDay()
    const defaultPrice = weeklyByDow.get(dow) ?? 0
    if (ov) {
      return {
        date,
        price: ov.priceOverride !== null ? Number(ov.priceOverride) : defaultPrice,
        status: ov.status,
        priceType: ov.priceType,
        note: ov.note,
        bookingId: ov.bookingId,
        isOverride: true,
      }
    }
    return {
      date,
      price: defaultPrice,
      status: 'OPEN' as CalendarStatus,
      priceType: null,
      note: null,
      bookingId: null,
      isOverride: false,
    }
  })
}
