import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'
import { HotelBookingService } from '../lib/hotel-booking-service'
import { getAvailability, getAvailabilityByHotel } from '../lib/hotel-availability'

async function assertOwnHotel(hotelId: string, ownerId: string) {
  const h = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId, deletedAt: null } })
  if (!h) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบโรงแรม' })
  return h
}

async function assertOwnBooking(bookingId: string, ownerId: string) {
  const b = await prisma.hotelBooking.findUnique({
    where: { id: bookingId },
    include: { hotel: true },
  })
  if (!b || b.hotel.ownerId !== ownerId || b.deletedAt) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบการจอง' })
  }
  return b
}

async function assertOwnRoomType(roomTypeId: string, ownerId: string) {
  const rt = await prisma.roomType.findUnique({
    where: { id: roomTypeId },
    include: { hotel: true },
  })
  if (!rt || rt.hotel.ownerId !== ownerId) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบประเภทห้อง' })
  }
  return rt
}

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
    .array(z.object({ roomTypeId: z.string(), roomsReserved: z.number().int().min(1) }))
    .min(1),
  publicNote: z.string().optional(),
  internalNote: z.string().optional(),
})

export const hotelBookingRouter = router({
  list: ownerProcedure
    .input(
      z.object({
        hotelId: z.string().optional(),
        status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Scope to owner's hotels only
      if (input.hotelId) await assertOwnHotel(input.hotelId, ctx.ownerId)

      const ownedHotels = await prisma.hotel.findMany({
        where: { ownerId: ctx.ownerId, deletedAt: null },
        select: { id: true },
      })
      const ownedIds = ownedHotels.map((h) => h.id)

      return prisma.hotelBooking.findMany({
        where: {
          deletedAt: null,
          hotelId: input.hotelId ? input.hotelId : { in: ownedIds },
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
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: {
          hotel: { select: { id: true, code: true, name: true } },
          lines: { include: { roomType: { select: { name: true } } } },
        },
      })
    }),

  byId: ownerProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    await assertOwnBooking(input.id, ctx.ownerId)
    return prisma.hotelBooking.findUniqueOrThrow({
      where: { id: input.id },
      include: { hotel: true, lines: { include: { roomType: true } } },
    })
  }),

  create: ownerProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
    await assertOwnHotel(input.hotelId, ctx.ownerId)
    return HotelBookingService.create({ ...input, source: 'OWNER_DIRECT' })
  }),

  confirm: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await assertOwnBooking(input.id, ctx.ownerId)
    return HotelBookingService.confirm(input.id)
  }),

  cancel: ownerProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnBooking(input.id, ctx.ownerId)
      return HotelBookingService.cancel(input.id, input.reason)
    }),

  availability: ownerProcedure
    .input(z.object({ roomTypeId: z.string(), from: dateInput, to: dateInput }))
    .query(async ({ ctx, input }) => {
      await assertOwnRoomType(input.roomTypeId, ctx.ownerId)
      return getAvailability(input.roomTypeId, input.from, input.to)
    }),

  availabilityByHotel: ownerProcedure
    .input(z.object({ hotelId: z.string(), from: dateInput, to: dateInput }))
    .query(async ({ ctx, input }) => {
      await assertOwnHotel(input.hotelId, ctx.ownerId)
      return getAvailabilityByHotel(input.hotelId, input.from, input.to)
    }),
})
