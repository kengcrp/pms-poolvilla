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
  /** Weekly default agent / OTA price for this DOW — null when not configured. */
  agentPrice: number | null
  /** Per-day "open to split sale" flag — taken from VariantWeeklyPricing.splitOpen for this DOW.
   *  When false, the variant is closed for sale on this DOW (Lock toggle in weekly modal).
   *  Default-variant (เหมาหลัง) always uses `true` semantically. */
  splitOpen: boolean
  /** Status — defaults to OPEN if no override row exists. */
  status: CalendarStatus
  /** Discount / Special tag if override has priceType set. */
  priceType: PriceOverrideType | null
  /** Pre-discount original price — only present when priceType=DISCOUNT and the
   *  owner has captured an "original" reference (e.g. 20,000 → 15,000 promo). */
  originalPrice: number | null
  /** Pre-discount original AGENT price — same role as `originalPrice` but for the
   *  agent / OTA price column. Powers strikethrough on the agent-mode calendar. */
  originalAgentPrice: number | null
  /** Effective minimum-stay (nights) for this day — per-day override > weekly
   *  default for this DOW. Surfaced in the day-edit drawer so the owner can
   *  set 2/3-night minimums on holidays. */
  minStay: number
  note: string | null
  bookingId: string | null
  /** Customer name if this day is linked to a booking. Useful for UI labels. */
  customerName: string | null
  /** True when this row is a stored override (not derived from weekly default). */
  isOverride: boolean
  /** True when another variant of the SAME property is booked/blocked on this date.
   *  Means this variant is effectively unavailable even though its own status is OPEN.
   *  Splits and "เหมาหลัง" share physical bedrooms — only one can be sold at a time. */
  lockedBySibling: boolean
  /** Booking ID from the sibling-variant hold (null for maintenance blocks or when not locked). */
  siblingBookingId: string | null
  /** Customer name from the sibling-variant booking (null when not locked or maintenance). */
  siblingCustomerName: string | null
  /** Status of the sibling-variant hold (BOOKED/PENDING_PAYMENT/UNDER_MAINTENANCE) — null when not locked. */
  siblingStatus: CalendarStatus | null
  /** Note from the sibling hold — useful for displaying maintenance reasons. */
  siblingNote: string | null
}

/**
 * Get calendar entries for a variant within [from, to] inclusive.
 * Single source of truth — combines override rows + weekly pricing fallback.
 *
 * When a day is linked to a booking, `customerName` is included so UIs
 * (calendar views) can show the customer label without an extra round-trip.
 */
export async function getCalendarRange(
  variantId: string,
  from: Date,
  to: Date,
): Promise<CalendarDay[]> {
  const fromD = toDateOnly(from)
  const toD = toDateOnly(to)

  // Look up the variant's property so we can also find sibling-variant bookings.
  const variant = await prisma.propertyVariant.findUniqueOrThrow({
    where: { id: variantId },
    select: { propertyId: true },
  })

  const [weekly, overrides, siblingHoldCells] = await Promise.all([
    prisma.variantWeeklyPricing.findMany({ where: { variantId } }),
    prisma.variantCalendar.findMany({
      where: { variantId, date: { gte: fromD, lte: toD } },
    }),
    // Sibling holds — other variants of the SAME property with active hold on the date.
    // Include booking info so the UI can show the sibling customer's name on the locked day.
    prisma.variantCalendar.findMany({
      where: {
        variantId: { not: variantId },
        variant: { propertyId: variant.propertyId },
        date: { gte: fromD, lte: toD },
        status: { in: ['BOOKED', 'PENDING_PAYMENT', 'UNDER_MAINTENANCE'] },
      },
      select: { date: true, status: true, bookingId: true, note: true },
    }),
  ])

  // For each locked date, pick ONE sibling hold (prefer BOOKED > PENDING > MAINTENANCE)
  // so the UI has a consistent name/status to render.
  const statusRank: Record<string, number> = {
    BOOKED: 3,
    PENDING_PAYMENT: 2,
    UNDER_MAINTENANCE: 1,
  }
  const siblingHoldByKey = new Map<
    string,
    { status: CalendarStatus; bookingId: string | null; note: string | null }
  >()
  for (const c of siblingHoldCells) {
    const key = c.date.toISOString().slice(0, 10)
    const cur = siblingHoldByKey.get(key)
    if (!cur || (statusRank[c.status] ?? 0) > (statusRank[cur.status] ?? 0)) {
      siblingHoldByKey.set(key, {
        status: c.status,
        bookingId: c.bookingId,
        note: c.note,
      })
    }
  }
  // Fetch customer names for sibling-locked booking IDs in a single round-trip.
  const siblingBookingIds = Array.from(
    new Set(
      Array.from(siblingHoldByKey.values())
        .map((h) => h.bookingId)
        .filter((id): id is string => !!id),
    ),
  )
  const siblingBookings = siblingBookingIds.length
    ? await prisma.booking.findMany({
        where: { id: { in: siblingBookingIds } },
        select: { id: true, customerName: true },
      })
    : []
  const siblingCustomerByBookingId = new Map(siblingBookings.map((b) => [b.id, b.customerName]))

  // Batch-fetch customer names for all bookings referenced in this range
  const bookingIds = Array.from(
    new Set(overrides.map((o) => o.bookingId).filter((id): id is string => !!id)),
  )
  const bookings = bookingIds.length
    ? await prisma.booking.findMany({
        where: { id: { in: bookingIds } },
        select: { id: true, customerName: true },
      })
    : []
  const customerByBookingId = new Map(bookings.map((b) => [b.id, b.customerName]))

  // Weekly minStay-per-DOW map — used as the fallback when a day has no
  // per-day minStay override of its own.
  const weeklyMinStayByDow = new Map(weekly.map((w) => [w.dayOfWeek, w.minStay]))
  const weeklyByDow = new Map(weekly.map((w) => [w.dayOfWeek, Number(w.price)]))
  const weeklyAgentByDow = new Map(
    weekly.map((w) => [w.dayOfWeek, w.agentPrice !== null ? Number(w.agentPrice) : null]),
  )
  const weeklySplitOpenByDow = new Map(weekly.map((w) => [w.dayOfWeek, w.splitOpen]))
  const overrideByDate = new Map(overrides.map((o) => [o.date.toISOString().slice(0, 10), o]))

  return eachDay(fromD, toD).map((date) => {
    const key = date.toISOString().slice(0, 10)
    const ov = overrideByDate.get(key)
    const dow = date.getUTCDay()
    const defaultPrice = weeklyByDow.get(dow) ?? 0
    const defaultAgentPrice = weeklyAgentByDow.get(dow) ?? null
    const splitOpen = weeklySplitOpenByDow.get(dow) ?? true
    // Sibling-lock only "shows" when this variant has no hold of its own — otherwise its
    // own status (BOOKED/PENDING/MAINTENANCE) already communicates unavailability.
    const ownStatus = ov?.status ?? 'OPEN'
    const siblingHold = siblingHoldByKey.get(key)
    const lockedBySibling = ownStatus === 'OPEN' && !!siblingHold
    const siblingBookingId = lockedBySibling ? siblingHold!.bookingId : null
    const siblingCustomerName = siblingBookingId
      ? (siblingCustomerByBookingId.get(siblingBookingId) ?? null)
      : null
    const siblingStatus = lockedBySibling ? siblingHold!.status : null
    const siblingNote = lockedBySibling ? siblingHold!.note : null
    const defaultMinStay = weeklyMinStayByDow.get(dow) ?? 1
    if (ov) {
      return {
        date,
        price: ov.priceOverride != null ? Number(ov.priceOverride) : defaultPrice,
        // Per-day agent override > weekly default (still null if neither configured).
        // Use `!= null` (not `!== null`) so an undefined value falls through to default
        // instead of becoming Number(undefined) === NaN.
        agentPrice: ov.agentPriceOverride != null ? Number(ov.agentPriceOverride) : defaultAgentPrice,
        splitOpen,
        status: ov.status,
        priceType: ov.priceType,
        originalPrice: ov.originalPrice != null ? Number(ov.originalPrice) : null,
        originalAgentPrice: ov.originalAgentPrice != null ? Number(ov.originalAgentPrice) : null,
        // Per-day minStay override > weekly default.
        minStay: ov.minStayOverride ?? defaultMinStay,
        note: ov.note,
        bookingId: ov.bookingId,
        customerName: ov.bookingId ? (customerByBookingId.get(ov.bookingId) ?? null) : null,
        isOverride: true,
        lockedBySibling,
        siblingBookingId,
        siblingCustomerName,
        siblingStatus,
        siblingNote,
      }
    }
    return {
      date,
      price: defaultPrice,
      agentPrice: defaultAgentPrice,
      splitOpen,
      status: 'OPEN' as CalendarStatus,
      priceType: null,
      originalPrice: null,
      originalAgentPrice: null,
      minStay: defaultMinStay,
      note: null,
      bookingId: null,
      customerName: null,
      isOverride: false,
      lockedBySibling,
      siblingBookingId,
      siblingCustomerName,
      siblingStatus,
      siblingNote,
    }
  })
}
