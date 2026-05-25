import { TRPCError } from '@trpc/server'
import {
  prisma,
  type Prisma,
  type PrismaClient,
  type CalendarStatus,
  type BookingStatus,
  type BookingSource,
  type PaymentMethod,
} from '@pms/db'
import { eachDay, toDateOnly } from './calendar'

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

interface DateRangeInput {
  checkin: Date | string
  checkout: Date | string
}

interface CreateBookingBase extends DateRangeInput {
  variantId: string
  ownerId: string
  customerName: string
  customerPhone?: string
  bookerName?: string
  guestCount: number
  total: number
  publicNote?: string
  internalNote?: string
  couponId?: string
}

interface CreateConfirmedInput extends CreateBookingBase {
  source: BookingSource
  paymentMethod?: PaymentMethod
}

interface CreatePendingInput extends CreateBookingBase {
  paymentDueAt: Date | string
  deposit: number
  paymentMethod?: PaymentMethod
}

interface CreateInvoiceInput extends CreateBookingBase {
  deposit: number
  vat: boolean
  showLogo: boolean
  paymentMethod?: PaymentMethod
}

interface BlockDatesInput extends DateRangeInput {
  variantId: string
  ownerId: string
  note?: string
}

/**
 * Compute night list from checkin (inclusive) → checkout (exclusive).
 * Throws if range invalid.
 */
function nightDays(checkin: Date | string, checkout: Date | string): Date[] {
  const inD = toDateOnly(new Date(checkin))
  const outD = toDateOnly(new Date(checkout))
  if (outD.getTime() <= inD.getTime()) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'วันที่เช็คเอาท์ต้องหลังเช็คอิน' })
  }
  // Last night = checkout - 1 day
  const lastNight = new Date(outD)
  lastNight.setUTCDate(lastNight.getUTCDate() - 1)
  return eachDay(inD, lastNight)
}

async function assertVariantOwn(tx: Tx, variantId: string, ownerId: string) {
  const v = await tx.propertyVariant.findFirst({
    where: { id: variantId, property: { ownerId, deletedAt: null } },
    select: { id: true, propertyId: true },
  })
  if (!v) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบ variant ของคุณ' })
  return v
}

/**
 * Enforce the property's booking window. Owners can set how far ahead guests may book
 * (e.g. 3/6/12 months). Dates beyond `today + bookingWindowMonths` are rejected because
 * the owner hasn't extended pricing/availability that far yet.
 */
async function assertWithinBookingWindow(tx: Tx, variantId: string, nights: Date[]) {
  if (nights.length === 0) return
  const variant = await tx.propertyVariant.findUniqueOrThrow({
    where: { id: variantId },
    select: { property: { select: { bookingWindowMonths: true } } },
  })
  const months = variant.property.bookingWindowMonths
  if (months == null) return // No window configured — allow
  const maxDate = new Date()
  maxDate.setUTCMonth(maxDate.getUTCMonth() + months)
  const maxDateOnly = new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth(), maxDate.getUTCDate()))
  const offenders = nights.filter((d) => d.getTime() > maxDateOnly.getTime())
  if (offenders.length > 0) {
    const first = offenders[0]!.toISOString().slice(0, 10)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `วันที่ ${first} อยู่นอกช่วงที่เปิดจอง (เปิดจองล่วงหน้าได้ ${months} เดือน) — เจ้าของยังไม่ได้ตั้งราคาในช่วงนั้น`,
    })
  }
}

/**
 * Check that none of the nights are already booked / pending / under maintenance.
 * Includes SIBLING variants of the same property — split variants and "เหมาหลัง"
 * share physical bedrooms, so a hold on any one variant locks the others on that date.
 */
async function assertNoConflict(tx: Tx, variantId: string, nights: Date[]) {
  if (nights.length === 0) return

  const variant = await tx.propertyVariant.findUniqueOrThrow({
    where: { id: variantId },
    select: { propertyId: true },
  })

  const conflicts = await tx.variantCalendar.findMany({
    where: {
      variant: { propertyId: variant.propertyId },
      date: { in: nights },
      status: { in: ['BOOKED', 'PENDING_PAYMENT', 'UNDER_MAINTENANCE'] },
    },
    select: { date: true, status: true, variantId: true },
  })
  if (conflicts.length) {
    const first = conflicts[0]!
    const firstDate = first.date.toISOString().slice(0, 10)
    const fromSibling = first.variantId !== variantId
    throw new TRPCError({
      code: 'CONFLICT',
      message: fromSibling
        ? `วันที่ ${firstDate} ถูกล็อกเพราะมีการจองในรูปแบบห้องอื่นของที่พักเดียวกัน`
        : `มีการจอง/บล็อกในช่วงวันที่เลือกแล้ว (${firstDate})`,
    })
  }
}

/** Atomically decrement coupon qtyLeft + verify ownership; returns coupon or throws. */
async function consumeCoupon(tx: Tx, couponId: string, ownerId: string) {
  const coupon = await tx.coupon.findFirst({ where: { id: couponId, ownerId } })
  if (!coupon) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบคูปอง' })
  const now = new Date()
  if (now < coupon.startsAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'คูปองยังไม่เริ่ม' })
  if (now > coupon.expiresAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'คูปองหมดอายุ' })
  const result = await tx.coupon.updateMany({
    where: { id: couponId, qtyLeft: { gt: 0 } },
    data: { qtyLeft: { decrement: 1 } },
  })
  if (result.count === 0) throw new TRPCError({ code: 'CONFLICT', message: 'คูปองหมดแล้ว' })
  return coupon
}

async function syncCalendar(
  tx: Tx,
  variantId: string,
  nights: Date[],
  status: CalendarStatus,
  bookingId: string | null,
  note: string | null,
) {
  for (const date of nights) {
    await tx.variantCalendar.upsert({
      where: { variantId_date: { variantId, date } },
      update: { status, bookingId, note },
      create: { variantId, date, status, bookingId, note },
    })
  }
}

/** Clear calendar entries linked to a booking. */
async function clearBookingCalendar(tx: Tx, bookingId: string) {
  await tx.variantCalendar.updateMany({
    where: { bookingId },
    data: { status: 'OPEN', bookingId: null, note: null },
  })
}

export const BookingService = {
  async createConfirmed(input: CreateConfirmedInput) {
    return prisma.$transaction(async (tx) => {
      const v = await assertVariantOwn(tx, input.variantId, input.ownerId)
      const nights = nightDays(input.checkin, input.checkout)
      await assertNoConflict(tx, input.variantId, nights)
      await assertWithinBookingWindow(tx, input.variantId, nights)
      if (input.couponId) await consumeCoupon(tx, input.couponId, input.ownerId)
      const booking = await tx.booking.create({
        data: {
          variantId: input.variantId,
          propertyId: v.propertyId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          bookerName: input.bookerName || input.customerName,
          guestCount: input.guestCount,
          checkin: toDateOnly(new Date(input.checkin)),
          checkout: toDateOnly(new Date(input.checkout)),
          total: input.total as unknown as Prisma.Decimal,
          source: input.source,
          paymentMethod: input.paymentMethod,
          status: 'CONFIRMED' as BookingStatus,
          publicNote: input.publicNote,
          internalNote: input.internalNote,
          couponId: input.couponId,
        },
      })
      await syncCalendar(tx, input.variantId, nights, 'BOOKED', booking.id, input.publicNote ?? null)
      return booking
    })
  },

  async createPending(input: CreatePendingInput) {
    return prisma.$transaction(async (tx) => {
      const v = await assertVariantOwn(tx, input.variantId, input.ownerId)
      const nights = nightDays(input.checkin, input.checkout)
      await assertNoConflict(tx, input.variantId, nights)
      await assertWithinBookingWindow(tx, input.variantId, nights)
      if (input.couponId) await consumeCoupon(tx, input.couponId, input.ownerId)
      const booking = await tx.booking.create({
        data: {
          variantId: input.variantId,
          propertyId: v.propertyId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          bookerName: input.bookerName || input.customerName,
          guestCount: input.guestCount,
          checkin: toDateOnly(new Date(input.checkin)),
          checkout: toDateOnly(new Date(input.checkout)),
          total: input.total as unknown as Prisma.Decimal,
          deposit: input.deposit as unknown as Prisma.Decimal,
          source: 'OWNER_DIRECT' as BookingSource,
          paymentMethod: input.paymentMethod,
          paymentDueAt: new Date(input.paymentDueAt),
          status: 'PENDING_PAYMENT' as BookingStatus,
          publicNote: input.publicNote,
          internalNote: input.internalNote,
          couponId: input.couponId,
        },
      })
      await syncCalendar(tx, input.variantId, nights, 'PENDING_PAYMENT', booking.id, input.publicNote ?? null)
      return booking
    })
  },

  async createInvoice(input: CreateInvoiceInput) {
    return prisma.$transaction(async (tx) => {
      const v = await assertVariantOwn(tx, input.variantId, input.ownerId)
      const nights = nightDays(input.checkin, input.checkout)
      await assertNoConflict(tx, input.variantId, nights)
      await assertWithinBookingWindow(tx, input.variantId, nights)
      if (input.couponId) await consumeCoupon(tx, input.couponId, input.ownerId)
      const booking = await tx.booking.create({
        data: {
          variantId: input.variantId,
          propertyId: v.propertyId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          bookerName: input.bookerName || input.customerName,
          guestCount: input.guestCount,
          checkin: toDateOnly(new Date(input.checkin)),
          checkout: toDateOnly(new Date(input.checkout)),
          total: input.total as unknown as Prisma.Decimal,
          deposit: input.deposit as unknown as Prisma.Decimal,
          source: 'OWNER_DIRECT' as BookingSource,
          paymentMethod: input.paymentMethod,
          status: 'CONFIRMED' as BookingStatus,
          publicNote: input.publicNote,
          internalNote: input.internalNote,
          invoiceVat: input.vat,
          invoiceShowLogo: input.showLogo,
          invoiceIssued: true,
          invoiceIssuedAt: new Date(),
          couponId: input.couponId,
        },
      })
      await syncCalendar(tx, input.variantId, nights, 'BOOKED', booking.id, input.publicNote ?? null)
      return booking
    })
  },

  async blockDates(input: BlockDatesInput) {
    return prisma.$transaction(async (tx) => {
      await assertVariantOwn(tx, input.variantId, input.ownerId)
      const nights = nightDays(input.checkin, input.checkout)
      await assertNoConflict(tx, input.variantId, nights)
      await assertWithinBookingWindow(tx, input.variantId, nights)
      await syncCalendar(tx, input.variantId, nights, 'UNDER_MAINTENANCE', null, input.note ?? null)
      return { ok: true, count: nights.length }
    })
  },

  async cancelBooking(bookingId: string, ownerId: string) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, property: { ownerId, deletedAt: null } },
      })
      if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบการจอง' })
      await clearBookingCalendar(tx, bookingId)
      return tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' as BookingStatus },
      })
    })
  },

  /**
   * Find every PENDING_PAYMENT booking whose paymentDueAt has passed,
   * mark booking AUTO_CANCELLED, and release its calendar cells back to OPEN.
   * Returns the count of bookings cancelled.
   */
  async runAutoCancel(): Promise<{ cancelled: number; ids: string[] }> {
    const now = new Date()
    const stale = await prisma.booking.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        paymentDueAt: { lte: now, not: null },
        deletedAt: null,
      },
      select: { id: true },
    })
    if (stale.length === 0) return { cancelled: 0, ids: [] }

    const ids = stale.map((b) => b.id)
    await prisma.$transaction([
      prisma.variantCalendar.updateMany({
        where: { bookingId: { in: ids } },
        data: { status: 'OPEN', bookingId: null, note: null },
      }),
      prisma.booking.updateMany({
        where: { id: { in: ids } },
        data: { status: 'AUTO_CANCELLED' as BookingStatus },
      }),
    ])
    return { cancelled: ids.length, ids }
  },

  async postpone(input: {
    bookingId: string
    ownerId: string
    /** Empty string = "ยังไม่ระบุวัน" (postpone without committing new dates yet) */
    newCheckin: Date | string
    newCheckout: Date | string
    reason?: string
    expiresAt?: Date | string
  }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: input.bookingId, property: { ownerId: input.ownerId, deletedAt: null } },
      })
      if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบการจอง' })
      if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING_PAYMENT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'เลื่อนได้เฉพาะ booking ที่ยืนยันแล้วหรือรอชำระ',
        })
      }

      const datesUnspecified =
        (typeof input.newCheckin === 'string' && input.newCheckin === '') ||
        (typeof input.newCheckout === 'string' && input.newCheckout === '')

      // Common: release the old calendar cells in both paths so the original
      // dates become available regardless of whether we re-allocate new ones.
      const releaseOldCells = () =>
        tx.variantCalendar.updateMany({
          where: { bookingId: input.bookingId },
          data: { status: 'OPEN', bookingId: null, note: null },
        })

      const expires = input.expiresAt
        ? new Date(input.expiresAt)
        : new Date(Date.now() + 30 * 86400000) // default 30 days from now

      if (datesUnspecified) {
        // "ยังไม่ระบุวัน" path — free old cells, log history with null new dates,
        // but DON'T reserve any new cells and DON'T touch the booking's checkin/out
        // (those keep the original dates as a hint for what was scheduled).
        await releaseOldCells()
        await tx.bookingPostpone.create({
          data: {
            bookingId: input.bookingId,
            oldCheckin: booking.checkin,
            oldCheckout: booking.checkout,
            newCheckin: null,
            newCheckout: null,
            reason: input.reason,
            expiresAt: expires,
          },
        })
        return booking
      }

      const newNights = nightDays(input.newCheckin, input.newCheckout)

      // Check conflicts on NEW dates excluding this booking's own cells
      const conflicts = await tx.variantCalendar.findMany({
        where: {
          variantId: booking.variantId,
          date: { in: newNights },
          status: { in: ['BOOKED', 'PENDING_PAYMENT', 'UNDER_MAINTENANCE'] },
          NOT: { bookingId: input.bookingId },
        },
        select: { date: true },
      })
      if (conflicts.length) {
        const d = conflicts[0]!.date.toISOString().slice(0, 10)
        throw new TRPCError({
          code: 'CONFLICT',
          message: `วันใหม่ที่เลือก (${d}) มีการจองอื่นอยู่แล้ว`,
        })
      }

      // Release old calendar cells (set OPEN + clear bookingId)
      await releaseOldCells()

      // Reserve new calendar cells
      const targetStatus = booking.status === 'CONFIRMED' ? 'BOOKED' : 'PENDING_PAYMENT'
      for (const date of newNights) {
        await tx.variantCalendar.upsert({
          where: { variantId_date: { variantId: booking.variantId, date } },
          update: {
            status: targetStatus as CalendarStatus,
            bookingId: input.bookingId,
            note: booking.publicNote,
          },
          create: {
            variantId: booking.variantId,
            date,
            status: targetStatus as CalendarStatus,
            bookingId: input.bookingId,
            note: booking.publicNote,
          },
        })
      }

      // Record history
      await tx.bookingPostpone.create({
        data: {
          bookingId: input.bookingId,
          oldCheckin: booking.checkin,
          oldCheckout: booking.checkout,
          newCheckin: toDateOnly(new Date(input.newCheckin)),
          newCheckout: toDateOnly(new Date(input.newCheckout)),
          reason: input.reason,
          expiresAt: expires,
        },
      })

      // Update booking
      return tx.booking.update({
        where: { id: input.bookingId },
        data: {
          checkin: toDateOnly(new Date(input.newCheckin)),
          checkout: toDateOnly(new Date(input.newCheckout)),
        },
      })
    })
  },

  async confirmPending(bookingId: string, ownerId: string) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, property: { ownerId, deletedAt: null } },
      })
      if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบการจอง' })
      if (booking.status !== 'PENDING_PAYMENT') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'การจองนี้ไม่ได้อยู่ในสถานะรอชำระ' })
      }
      // Promote calendar cells PENDING_PAYMENT → BOOKED
      await tx.variantCalendar.updateMany({
        where: { bookingId },
        data: { status: 'BOOKED' as CalendarStatus },
      })
      return tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' as BookingStatus, paymentDueAt: null },
      })
    })
  },

  async unblockDates(input: { variantId: string; ownerId: string; checkin: Date | string; checkout: Date | string }) {
    return prisma.$transaction(async (tx) => {
      await assertVariantOwn(tx, input.variantId, input.ownerId)
      const nights = nightDays(input.checkin, input.checkout)
      const result = await tx.variantCalendar.updateMany({
        where: { variantId: input.variantId, date: { in: nights }, status: 'UNDER_MAINTENANCE' },
        data: { status: 'OPEN', note: null },
      })
      return { ok: true, count: result.count }
    })
  },

  /** Get booking attached to a specific date cell. */
  async getBookingAtDate(variantId: string, date: Date | string, ownerId: string) {
    const d = toDateOnly(new Date(date))
    const cell = await prisma.variantCalendar.findFirst({
      where: { variantId, date: d, variant: { property: { ownerId, deletedAt: null } } },
      include: { booking: true },
    })
    return cell
  },
}
