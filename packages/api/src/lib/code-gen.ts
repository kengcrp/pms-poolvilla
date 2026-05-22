import { prisma } from '@pms/db'

/**
 * Generate next property code in `CITY-NNN` format.
 * Counts existing properties + 1 and pads with leading zeros.
 * Note: This is not race-safe — for production use a DB sequence or transaction lock.
 */
export async function generatePropertyCode(): Promise<string> {
  const count = await prisma.property.count()
  const next = count + 1
  return `CITY-${String(next).padStart(3, '0')}`
}

/** Generate hotel code in `HTL-NNN` format. */
export async function generateHotelCode(): Promise<string> {
  const count = await prisma.hotel.count()
  return `HTL-${String(count + 1).padStart(3, '0')}`
}

/** Generate hotel booking code in `HB-YYYY-NNNN` format. */
export async function generateHotelBookingCode(): Promise<string> {
  const year = new Date().getUTCFullYear()
  const startOfYear = new Date(Date.UTC(year, 0, 1))
  const count = await prisma.hotelBooking.count({
    where: { createdAt: { gte: startOfYear } },
  })
  return `HB-${year}-${String(count + 1).padStart(4, '0')}`
}
