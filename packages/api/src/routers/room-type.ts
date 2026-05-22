import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma, type Prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'

async function assertOwnRoomType(roomTypeId: string, ownerId: string) {
  const rt = await prisma.roomType.findUnique({
    where: { id: roomTypeId },
    include: { hotel: true },
  })
  if (!rt || rt.hotel.ownerId !== ownerId || rt.hotel.deletedAt) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบประเภทห้อง' })
  }
  return rt
}

async function assertOwnHotel(hotelId: string, ownerId: string) {
  const h = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId, deletedAt: null } })
  if (!h) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบโรงแรม' })
  return h
}

const localized = z.object({
  th: z.string().min(1),
  en: z.string().optional(),
})

const createSchema = z.object({
  hotelId: z.string(),
  name: localized,
  description: z.string().optional(),
  pricePerNight: z.number().nonnegative(),
  totalInventory: z.number().int().min(1),
  maxGuests: z.number().int().min(1).default(2),
  bedConfig: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

const updateSchema = z.object({
  id: z.string(),
  name: localized.optional(),
  description: z.string().nullable().optional(),
  pricePerNight: z.number().nonnegative().optional(),
  totalInventory: z.number().int().min(1).optional(),
  maxGuests: z.number().int().min(1).optional(),
  bedConfig: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export const roomTypeRouter = router({
  list: ownerProcedure.input(z.object({ hotelId: z.string() })).query(async ({ ctx, input }) => {
    await assertOwnHotel(input.hotelId, ctx.ownerId)
    return prisma.roomType.findMany({
      where: { hotelId: input.hotelId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: {
            bookingLines: {
              where: {
                booking: { deletedAt: null, status: { in: ['PENDING', 'CONFIRMED'] } },
              },
            },
          },
        },
      },
    })
  }),

  create: ownerProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
    await assertOwnHotel(input.hotelId, ctx.ownerId)
    return prisma.roomType.create({
      data: {
        hotelId: input.hotelId,
        name: input.name as Prisma.InputJsonValue,
        description: input.description,
        pricePerNight: input.pricePerNight,
        totalInventory: input.totalInventory,
        maxGuests: input.maxGuests,
        bedConfig: input.bedConfig,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
    })
  }),

  update: ownerProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    const current = await assertOwnRoomType(input.id, ctx.ownerId)

    // If reducing totalInventory, ensure no future date is overbooked
    if (input.totalInventory !== undefined && input.totalInventory < current.totalInventory) {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      const futureLines = await prisma.hotelBookingLine.findMany({
        where: {
          roomTypeId: input.id,
          booking: {
            deletedAt: null,
            status: { in: ['PENDING', 'CONFIRMED'] },
            checkout: { gt: today },
          },
        },
        select: { roomsReserved: true, booking: { select: { checkin: true, checkout: true } } },
      })
      const perDay = new Map<string, number>()
      for (const ln of futureLines) {
        const start = ln.booking.checkin > today ? ln.booking.checkin : today
        const d = new Date(start)
        d.setUTCHours(0, 0, 0, 0)
        const end = new Date(ln.booking.checkout)
        end.setUTCHours(0, 0, 0, 0)
        while (d < end) {
          const key = d.toISOString().slice(0, 10)
          perDay.set(key, (perDay.get(key) ?? 0) + ln.roomsReserved)
          d.setUTCDate(d.getUTCDate() + 1)
        }
      }
      const maxReserved = Math.max(0, ...perDay.values())
      if (input.totalInventory < maxReserved) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `ลด inventory ไม่ได้ — มีวันที่ถูกจองอยู่ ${maxReserved} ห้อง`,
        })
      }
    }

    const { id, name, ...rest } = input
    return prisma.roomType.update({
      where: { id },
      data: { ...rest, ...(name && { name: name as Prisma.InputJsonValue }) },
    })
  }),

  delete: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await assertOwnRoomType(input.id, ctx.ownerId)
    const active = await prisma.hotelBookingLine.count({
      where: {
        roomTypeId: input.id,
        booking: { deletedAt: null, status: { in: ['PENDING', 'CONFIRMED'] } },
      },
    })
    if (active > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `มี booking ที่ยัง active อยู่ ${active} รายการ — ปิด (set inactive) แทน`,
      })
    }
    return prisma.roomType.delete({ where: { id: input.id } })
  }),

  // ─── Images ───
  listImages: ownerProcedure
    .input(z.object({ roomTypeId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertOwnRoomType(input.roomTypeId, ctx.ownerId)
      return prisma.roomTypeImage.findMany({
        where: { roomTypeId: input.roomTypeId },
        orderBy: { sortOrder: 'asc' },
      })
    }),

  addImage: ownerProcedure
    .input(z.object({ roomTypeId: z.string(), url: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnRoomType(input.roomTypeId, ctx.ownerId)
      return prisma.roomTypeImage.create({
        data: { roomTypeId: input.roomTypeId, url: input.url },
      })
    }),

  deleteImage: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const img = await prisma.roomTypeImage.findUnique({
        where: { id: input.id },
        include: { roomType: { include: { hotel: true } } },
      })
      if (!img || img.roomType.hotel.ownerId !== ctx.ownerId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      return prisma.roomTypeImage.delete({ where: { id: input.id } })
    }),
})
