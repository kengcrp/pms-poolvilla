import { z } from 'zod'
import { prisma } from '@pms/db'
import { router, adminProcedure } from '../../trpc'
import { HotelBookingService } from '../../lib/hotel-booking-service'
import { getAvailability, getAvailabilityByHotel } from '../../lib/hotel-availability'

const dateInput = z.coerce.date()

const createSchema = z.object({
  hotelId: z.string(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  guestCount: z.number().int().min(1).default(1),
  checkin: dateInput,
  checkout: dateInput,
  lines: z
    .array(
      z.object({
        roomTypeId: z.string(),
        roomsReserved: z.number().int().min(1),
      }),
    )
    .min(1),
  source: z.enum(['OWNER_DIRECT', 'PUBLIC_SALE_PAGE', 'EXTERNAL_ICAL']).optional(),
  publicNote: z.string().optional(),
  internalNote: z.string().optional(),
})

export const adminHotelBookingRouter = router({
  list: adminProcedure
    .input(
      z.object({
        hotelId: z.string().optional(),
        status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
        search: z.string().optional(),
        from: dateInput.optional(),
        to: dateInput.optional(),
        limit: z.number().min(1).max(200).default(50),
      }),
    )
    .query(async ({ input }) => {
      return prisma.hotelBooking.findMany({
        where: {
          deletedAt: null,
          ...(input.hotelId ? { hotelId: input.hotelId } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.search
            ? {
                OR: [
                  { code: { contains: input.search } },
                  { customerName: { contains: input.search } },
                  { customerPhone: { contains: input.search } },
                  { customerEmail: { contains: input.search } },
                ],
              }
            : {}),
          ...(input.from || input.to
            ? {
                AND: [
                  input.to ? { checkin: { lt: input.to } } : {},
                  input.from ? { checkout: { gt: input.from } } : {},
                ],
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: {
          hotel: { select: { id: true, code: true, name: true } },
          lines: { include: { roomType: { select: { name: true } } } },
        },
      })
    }),

  byId: adminProcedure.input(z.object({ id: z.string() })).query(async ({ input }) =>
    prisma.hotelBooking.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        hotel: true,
        lines: { include: { roomType: true } },
      },
    }),
  ),

  create: adminProcedure.input(createSchema).mutation(async ({ input }) => {
    return HotelBookingService.create(input)
  }),

  confirm: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => HotelBookingService.confirm(input.id)),

  cancel: adminProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input }) => HotelBookingService.cancel(input.id, input.reason)),

  availability: adminProcedure
    .input(z.object({ roomTypeId: z.string(), from: dateInput, to: dateInput }))
    .query(async ({ input }) => getAvailability(input.roomTypeId, input.from, input.to)),

  availabilityByHotel: adminProcedure
    .input(z.object({ hotelId: z.string(), from: dateInput, to: dateInput }))
    .query(async ({ input }) => getAvailabilityByHotel(input.hotelId, input.from, input.to)),
})
