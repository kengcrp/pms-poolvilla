import { z } from 'zod'
import { prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'
import { BookingService } from '../lib/booking-service'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง')
const isoDateTime = z.string().min(1)

const baseInput = {
  variantId: z.string(),
  checkin: isoDate,
  checkout: isoDate,
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  bookerName: z.string().min(1),
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
        paymentDueAt: isoDateTime,
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
        newCheckin: isoDate,
        newCheckout: isoDate,
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
