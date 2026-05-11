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
