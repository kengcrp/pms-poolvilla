import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma, type Prisma } from '@pms/db'
import { router, adminProcedure } from '../../trpc'
import { generateHotelCode } from '../../lib/code-gen'

const localized = z.object({
  th: z.string().min(1, 'ต้องระบุชื่อภาษาไทย'),
  en: z.string().optional(),
  zh: z.string().optional(),
})

const createSchema = z.object({
  ownerId: z.string(),
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
  reviewStatus: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED']).optional(),
})

export const adminHotelRouter = router({
  list: adminProcedure
    .input(
      z
        .object({
          ownerId: z.string().optional(),
          q: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return prisma.hotel.findMany({
        where: {
          deletedAt: null,
          ...(input?.ownerId ? { ownerId: input.ownerId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              roomTypes: { where: { isActive: true } },
              bookings: { where: { deletedAt: null } },
            },
          },
        },
      })
    }),

  byId: adminProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return prisma.hotel.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        roomTypes: { orderBy: { sortOrder: 'asc' } },
      },
    })
  }),

  create: adminProcedure.input(createSchema).mutation(async ({ input }) => {
    // Verify owner exists + is OWNER role
    const owner = await prisma.user.findUnique({ where: { id: input.ownerId } })
    if (!owner || owner.role !== 'OWNER') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'ownerId ต้องเป็น OWNER ที่มีอยู่จริง' })
    }
    // Verify hotelType
    const type = await prisma.hotelTypeMaster.findUnique({ where: { code: input.hotelType } })
    if (!type) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'hotelType ไม่ถูกต้อง' })
    }
    return prisma.hotel.create({
      data: {
        code: await generateHotelCode(),
        ownerId: input.ownerId,
        name: input.name as Prisma.InputJsonValue,
        hotelType: input.hotelType,
        description: input.description,
        address: input.address,
        phone: input.phone,
        email: input.email,
        reviewStatus: 'PENDING',
        isActive: true,
      },
    })
  }),

  update: adminProcedure.input(updateSchema).mutation(async ({ input }) => {
    const { id, name, ...rest } = input
    return prisma.hotel.update({
      where: { id },
      data: {
        ...rest,
        ...(name && { name: name as Prisma.InputJsonValue }),
      },
    })
  }),

  setActive: adminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) =>
      prisma.hotel.update({ where: { id: input.id }, data: { isActive: input.isActive } }),
    ),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) =>
    prisma.hotel.update({
      where: { id: input.id },
      data: { deletedAt: new Date() },
    }),
  ),
})
