import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma, type Prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'
import { generateHotelCode } from '../lib/code-gen'

/** Ensure hotel belongs to current owner; return the hotel (throws if not). */
async function assertOwn(hotelId: string, ownerId: string) {
  const hotel = await prisma.hotel.findFirst({
    where: { id: hotelId, ownerId, deletedAt: null },
  })
  if (!hotel) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบโรงแรม' })
  return hotel
}

const localized = z.object({
  th: z.string().min(1, 'ต้องระบุชื่อภาษาไทย'),
  en: z.string().optional(),
  zh: z.string().optional(),
})

const createSchema = z.object({
  name: localized,
  hotelType: z.string().min(1),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
})

const updateSchema = z.object({
  id: z.string(),
  name: localized.optional(),
  hotelType: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
})

export const hotelRouter = router({
  /** List public-active hotel types — for forms */
  types: ownerProcedure.query(async () => {
    return prisma.hotelTypeMaster.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { nameTh: 'asc' }],
      select: { code: true, nameTh: true, nameEn: true, desc: true, iconRef: true },
    })
  }),

  list: ownerProcedure.query(async ({ ctx }) => {
    return prisma.hotel.findMany({
      where: { ownerId: ctx.ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            roomTypes: { where: { isActive: true } },
            bookings: { where: { deletedAt: null } },
          },
        },
      },
    })
  }),

  byId: ownerProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    await assertOwn(input.id, ctx.ownerId)
    return prisma.hotel.findUniqueOrThrow({
      where: { id: input.id },
      include: { roomTypes: { orderBy: { sortOrder: 'asc' } } },
    })
  }),

  create: ownerProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
    const type = await prisma.hotelTypeMaster.findUnique({ where: { code: input.hotelType } })
    if (!type) throw new TRPCError({ code: 'BAD_REQUEST', message: 'hotelType ไม่ถูกต้อง' })
    return prisma.hotel.create({
      data: {
        code: await generateHotelCode(),
        ownerId: ctx.ownerId,
        name: input.name as Prisma.InputJsonValue,
        hotelType: input.hotelType,
        description: input.description,
        address: input.address,
        phone: input.phone,
        email: input.email,
        reviewStatus: 'ACTIVE', // owner self-publish (no admin review in MVP)
        isActive: true,
      },
    })
  }),

  update: ownerProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    await assertOwn(input.id, ctx.ownerId)
    const { id, name, ...rest } = input
    return prisma.hotel.update({
      where: { id },
      data: { ...rest, ...(name && { name: name as Prisma.InputJsonValue }) },
    })
  }),

  setActive: ownerProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwn(input.id, ctx.ownerId)
      return prisma.hotel.update({ where: { id: input.id }, data: { isActive: input.isActive } })
    }),

  delete: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await assertOwn(input.id, ctx.ownerId)
    return prisma.hotel.update({
      where: { id: input.id },
      data: { deletedAt: new Date() },
    })
  }),

  // ─── Images ───
  listImages: ownerProcedure
    .input(z.object({ hotelId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertOwn(input.hotelId, ctx.ownerId)
      return prisma.hotelImage.findMany({
        where: { hotelId: input.hotelId },
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
      })
    }),

  addImage: ownerProcedure
    .input(
      z.object({
        hotelId: z.string(),
        url: z.string().min(1),
        type: z.enum(['cover', 'gallery']).default('gallery'),
        category: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwn(input.hotelId, ctx.ownerId)
      // If setting a new cover, demote existing cover to gallery
      if (input.type === 'cover') {
        await prisma.hotelImage.updateMany({
          where: { hotelId: input.hotelId, type: 'cover' },
          data: { type: 'gallery' },
        })
      }
      return prisma.hotelImage.create({
        data: {
          hotelId: input.hotelId,
          url: input.url,
          type: input.type,
          category: input.category ?? null,
        },
      })
    }),

  deleteImage: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const img = await prisma.hotelImage.findUnique({
        where: { id: input.id },
        include: { hotel: true },
      })
      if (!img || img.hotel.ownerId !== ctx.ownerId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      return prisma.hotelImage.delete({ where: { id: input.id } })
    }),

  setCover: ownerProcedure
    .input(z.object({ imageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const img = await prisma.hotelImage.findUnique({
        where: { id: input.imageId },
        include: { hotel: true },
      })
      if (!img || img.hotel.ownerId !== ctx.ownerId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      // Demote any existing cover then promote this one
      return prisma.$transaction(async (tx) => {
        await tx.hotelImage.updateMany({
          where: { hotelId: img.hotelId, type: 'cover' },
          data: { type: 'gallery' },
        })
        return tx.hotelImage.update({
          where: { id: input.imageId },
          data: { type: 'cover' },
        })
      })
    }),
})
