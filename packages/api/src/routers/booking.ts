import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'
import { BookingService } from '../lib/booking-service'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง')
const isoDateTime = z.string().min(1)

const baseInput = {
  variantId: z.string(),
  checkin: isoDate,
  checkout: isoDate,
  // Customer + booker names are optional on quick / pending — the UI shows them with no
  // asterisk and the service substitutes a fallback ("— ไม่ระบุชื่อ —") if blank.
  customerName: z.string().min(1).default('— ไม่ระบุชื่อ —'),
  customerPhone: z.string().optional(),
  bookerName: z.string().optional(),
  guestCount: z.number().int().min(1),
  total: z.number().nonnegative(),
  publicNote: z.string().optional(),
  internalNote: z.string().optional(),
  couponId: z.string().optional(),
}

export const bookingRouter = router({
  createConfirmed: ownerProcedure
    .input(
      z.object({
        ...baseInput,
        paymentMethod: z.enum(['TRANSFER', 'CARD', 'MOBILE_BANKING']).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      BookingService.createConfirmed({
        ...input,
        ownerId: ctx.ownerId,
        source: 'OWNER_DIRECT',
      }),
    ),

  createPending: ownerProcedure
    .input(
      z.object({
        ...baseInput,
        // Optional — when omitted the PENDING_PAYMENT booking has no auto-cancel
        // deadline (owner confirms/cancels manually).
        paymentDueAt: isoDateTime.optional(),
        deposit: z.number().nonnegative(),
        paymentMethod: z.enum(['TRANSFER', 'CARD', 'MOBILE_BANKING']).optional(),
      }),
    )
    .mutation(({ ctx, input }) => BookingService.createPending({ ...input, ownerId: ctx.ownerId })),

  createInvoice: ownerProcedure
    .input(
      z.object({
        ...baseInput,
        deposit: z.number().nonnegative(),
        vat: z.boolean(),
        showLogo: z.boolean(),
        paymentMethod: z.enum(['TRANSFER', 'CARD', 'MOBILE_BANKING']).optional(),
      }),
    )
    .mutation(({ ctx, input }) => BookingService.createInvoice({ ...input, ownerId: ctx.ownerId })),

  blockDates: ownerProcedure
    .input(
      z.object({
        variantId: z.string(),
        checkin: isoDate,
        checkout: isoDate,
        note: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => BookingService.blockDates({ ...input, ownerId: ctx.ownerId })),

  unblockDates: ownerProcedure
    .input(
      z.object({
        variantId: z.string(),
        checkin: isoDate,
        checkout: isoDate,
      }),
    )
    .mutation(({ ctx, input }) => BookingService.unblockDates({ ...input, ownerId: ctx.ownerId })),

  cancel: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => BookingService.cancelBooking(input.id, ctx.ownerId)),

  confirmPending: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => BookingService.confirmPending(input.id, ctx.ownerId)),

  /** Manual auto-cancel trigger (any owner can run — affects only their bookings indirectly via paymentDueAt). */
  runAutoCancel: ownerProcedure.mutation(() => BookingService.runAutoCancel()),

  postpone: ownerProcedure
    .input(
      z.object({
        id: z.string(),
        // Both dates optional — when empty, the postpone is recorded as
        // "ยังไม่ระบุวัน" so the booking sits in history without a new slot yet.
        newCheckin: isoDate.or(z.literal('')),
        newCheckout: isoDate.or(z.literal('')),
        reason: z.string().optional(),
        expiresAt: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      BookingService.postpone({
        bookingId: input.id,
        ownerId: ctx.ownerId,
        newCheckin: input.newCheckin,
        newCheckout: input.newCheckout,
        reason: input.reason,
        expiresAt: input.expiresAt,
      }),
    ),

  /** Count of postpones with no new dates set yet + timestamp of the most recent
   *  one. Drives the sidebar badge:
   *   - count = 0 → no badge
   *   - count > 0 AND seenAt < latestAt → red (unseen / new entries)
   *   - count > 0 AND seenAt >= latestAt → gray (all seen) */
  pendingPostponeCount: ownerProcedure.query(async ({ ctx }) => {
    const [count, latest] = await Promise.all([
      prisma.bookingPostpone.count({
        where: {
          booking: { property: { ownerId: ctx.ownerId, deletedAt: null } },
          newCheckin: null,
        },
      }),
      prisma.bookingPostpone.findFirst({
        where: {
          booking: { property: { ownerId: ctx.ownerId, deletedAt: null } },
          newCheckin: null,
        },
        orderBy: { postponedAt: 'desc' },
        select: { postponedAt: true },
      }),
    ])
    return { count, latestAt: latest?.postponedAt ?? null }
  }),

  /** Commit new check-in/out dates onto an existing "ยังไม่ระบุวัน" postpone row.
   *  Used by the "จองวันเข้าพักใหม่" modal in /manage/postpone. Reserves the new
   *  calendar cells, updates the booking dates, and stamps the new dates onto
   *  the postpone history row so it disappears from the "active" tab. */
  completePostpone: ownerProcedure
    .input(
      z.object({
        id: z.string(),
        newCheckin: isoDate,
        newCheckout: isoDate,
        total: z.number().nonnegative().optional(),
        deposit: z.number().nonnegative().optional(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await prisma.bookingPostpone.findFirst({
        where: {
          id: input.id,
          booking: { property: { ownerId: ctx.ownerId, deletedAt: null } },
        },
        include: { booking: true },
      })
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบรายการ' })
      if (input.newCheckout <= input.newCheckin) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'วันเช็คเอาท์ต้องมาหลังวันเช็คอิน' })
      }
      // Delegate the heavy lifting (cell reservation, conflict check) to BookingService
      await BookingService.postpone({
        bookingId: row.bookingId,
        ownerId: ctx.ownerId,
        newCheckin: input.newCheckin,
        newCheckout: input.newCheckout,
        reason: input.note ?? row.reason ?? undefined,
        expiresAt: row.expiresAt,
      })
      // Update optional pricing fields on the underlying booking
      if (typeof input.total === 'number' || typeof input.deposit === 'number') {
        await prisma.booking.update({
          where: { id: row.bookingId },
          data: {
            ...(typeof input.total === 'number' && { total: input.total }),
            ...(typeof input.deposit === 'number' && { deposit: input.deposit }),
          },
        })
      }
      // BookingService.postpone CREATES a new BookingPostpone row, so the original
      // "ยังไม่ระบุวัน" row would still exist. Delete it so the active tab clears.
      await prisma.bookingPostpone.delete({ where: { id: row.id } }).catch(() => null)
      return { ok: true }
    }),

  /** Delete a postpone entry — owner cleans up a history row. Doesn't touch the
   *  underlying booking, only removes the postpone log. */
  deletePostpone: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the postpone belongs to a property the owner owns
      const row = await prisma.bookingPostpone.findFirst({
        where: {
          id: input.id,
          booking: { property: { ownerId: ctx.ownerId, deletedAt: null } },
        },
      })
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบรายการ' })
      await prisma.bookingPostpone.delete({ where: { id: input.id } })
      return { ok: true }
    }),

  postponeHistory: ownerProcedure
    .input(z.object({ scope: z.enum(['ACTIVE', 'EXPIRED', 'ALL']).default('ALL') }).optional())
    .query(({ ctx, input }) => {
      const scope = input?.scope ?? 'ALL'
      const now = new Date()
      return prisma.bookingPostpone.findMany({
        where: {
          booking: { property: { ownerId: ctx.ownerId, deletedAt: null } },
          ...(scope === 'ACTIVE' && { expiresAt: { gte: now } }),
          ...(scope === 'EXPIRED' && { expiresAt: { lt: now } }),
        },
        orderBy: { postponedAt: 'desc' },
        take: 100,
        include: {
          booking: {
            include: {
              property: { select: { code: true, name: true } },
              variant: { select: { name: true, bedrooms: true } },
            },
          },
        },
      })
    }),

  list: ownerProcedure
    .input(
      z
        .object({
          status: z
            .enum(['PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'AUTO_CANCELLED'])
            .optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) => {
      const search = input?.search?.trim()
      return prisma.booking.findMany({
        where: {
          deletedAt: null,
          property: { ownerId: ctx.ownerId, deletedAt: null },
          ...(input?.status && { status: input.status }),
          ...(search && {
            OR: [
              { customerName: { contains: search } },
              { bookerName: { contains: search } },
              { customerPhone: { contains: search } },
            ],
          }),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          property: { select: { id: true, code: true, name: true } },
          variant: { select: { id: true, name: true, bedrooms: true } },
          postpones: {
            where: { expiresAt: { gte: new Date() } },
            select: { id: true },
            take: 1,
          },
        },
      })
    }),

  byId: ownerProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return prisma.booking.findFirst({
      where: { id: input.id, property: { ownerId: ctx.ownerId, deletedAt: null } },
      include: {
        property: { select: { id: true, code: true, name: true } },
        variant: true,
        calendarCells: { orderBy: { date: 'asc' } },
      },
    })
  }),

  /** Inspect what's at a specific (variant, date) cell. */
  atDate: ownerProcedure
    .input(z.object({ variantId: z.string(), date: isoDate }))
    .query(({ ctx, input }) => BookingService.getBookingAtDate(input.variantId, input.date, ctx.ownerId)),
})
