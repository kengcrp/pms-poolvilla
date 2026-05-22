import { prisma, type Prisma } from '@pms/db'

/** Format Date → "YYYY-MM-DD" (UTC) */
export const ymd = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Yield each night (Date at 00:00 UTC) in the half-open interval [checkin, checkout).
 * Booking checkout day is NOT yielded (guest leaves that morning → room free that night).
 */
export function* eachNight(checkin: Date, checkout: Date): Generator<Date> {
  const d = new Date(checkin)
  d.setUTCHours(0, 0, 0, 0)
  const end = new Date(checkout)
  end.setUTCHours(0, 0, 0, 0)
  while (d < end) {
    yield new Date(d)
    d.setUTCDate(d.getUTCDate() + 1)
  }
}

/**
 * Sum reserved rooms per-day for `roomTypeId` within [from, to).
 *
 * Business rule: count only bookings whose status ∈ {PENDING, CONFIRMED}
 * (CANCELLED + COMPLETED are excluded → COMPLETED still occupied physically but
 * those are past dates; we never check availability for past dates in practice).
 *
 * Pass `tx` from prisma.$transaction for race-safe checks inside a booking mutation.
 */
export async function getReservedCounts(
  client: Prisma.TransactionClient | typeof prisma,
  roomTypeId: string,
  from: Date,
  to: Date,
): Promise<Map<string, number>> {
  const lines = await client.hotelBookingLine.findMany({
    where: {
      roomTypeId,
      booking: {
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED'] },
        // Overlap: booking.checkin < to AND booking.checkout > from
        checkin: { lt: to },
        checkout: { gt: from },
      },
    },
    select: {
      roomsReserved: true,
      booking: { select: { checkin: true, checkout: true } },
    },
  })

  const reserved = new Map<string, number>()
  for (const line of lines) {
    // Clip booking range to [from, to) before walking
    const start = line.booking.checkin > from ? line.booking.checkin : from
    const end = line.booking.checkout < to ? line.booking.checkout : to
    for (const night of eachNight(start, end)) {
      const key = ymd(night)
      reserved.set(key, (reserved.get(key) ?? 0) + line.roomsReserved)
    }
  }
  return reserved
}

export interface DayAvailability {
  date: string // YYYY-MM-DD
  total: number
  reserved: number
  available: number
}

/** Per-day availability for a room type across [from, to). */
export async function getAvailability(
  roomTypeId: string,
  from: Date,
  to: Date,
): Promise<DayAvailability[]> {
  const roomType = await prisma.roomType.findUnique({
    where: { id: roomTypeId },
    select: { totalInventory: true },
  })
  if (!roomType) throw new Error('Room type not found')

  const reserved = await getReservedCounts(prisma, roomTypeId, from, to)
  const result: DayAvailability[] = []
  for (const night of eachNight(from, to)) {
    const key = ymd(night)
    const used = reserved.get(key) ?? 0
    result.push({
      date: key,
      total: roomType.totalInventory,
      reserved: used,
      available: Math.max(0, roomType.totalInventory - used),
    })
  }
  return result
}

/** Availability for every active room type in a hotel. */
export async function getAvailabilityByHotel(
  hotelId: string,
  from: Date,
  to: Date,
): Promise<
  {
    roomType: { id: string; name: unknown; totalInventory: number; pricePerNight: unknown }
    days: DayAvailability[]
  }[]
> {
  const roomTypes = await prisma.roomType.findMany({
    where: { hotelId, isActive: true },
    select: { id: true, name: true, totalInventory: true, pricePerNight: true },
    orderBy: { sortOrder: 'asc' },
  })

  const out = await Promise.all(
    roomTypes.map(async (rt) => {
      const reserved = await getReservedCounts(prisma, rt.id, from, to)
      const days: DayAvailability[] = []
      for (const night of eachNight(from, to)) {
        const key = ymd(night)
        const used = reserved.get(key) ?? 0
        days.push({
          date: key,
          total: rt.totalInventory,
          reserved: used,
          available: Math.max(0, rt.totalInventory - used),
        })
      }
      return { roomType: rt, days }
    }),
  )
  return out
}
