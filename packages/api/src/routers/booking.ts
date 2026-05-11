import { z } from 'zod'
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

  /** Inspect what's at a specific (variant, date) cell. */
  atDate: ownerProcedure
    .input(z.object({ variantId: z.string(), date: isoDate }))
    .query(({ ctx, input }) => BookingService.getBookingAtDate(input.variantId, input.date, ctx.ownerId)),
})
