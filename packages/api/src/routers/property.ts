import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma, type Prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'
import { propertyCreateSchema, propertyUpdateSchema } from '../schemas/property'
import { generatePropertyCode } from '../lib/code-gen'

/** Ensure the property belongs to current owner; returns the property or throws. */
async function assertOwn(propertyId: string, ownerId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId, deletedAt: null },
  })
  if (!property) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบที่พัก' })
  return property
}

export const propertyRouter = router({
  list: ownerProcedure.query(async ({ ctx }) => {
    const [owner, properties] = await Promise.all([
      prisma.user.findUnique({
        where: { id: ctx.ownerId },
        select: { saleSlug: true },
      }),
      prisma.property.findMany({
        where: { ownerId: ctx.ownerId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          location: { include: { location: true, zone: true } },
          images: { where: { type: 'cover' }, take: 1 },
          variants: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { bookings: { where: { deletedAt: null } } } },
        },
      }),
    ])
    return { ownerSaleSlug: owner?.saleSlug ?? null, properties }
  }),

  byId: ownerProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    await assertOwn(input.id, ctx.ownerId)
    return prisma.property.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        variants: {
          orderBy: { sortOrder: 'asc' },
          include: { weeklyPricing: true },
        },
        location: { include: { location: true, zone: true } },
        pools: true,
        amenities: { include: { amenity: true } },
        policy: true,
        icals: true,
        images: true,
        landmarks: { orderBy: { sortOrder: 'asc' } },
        shops: { orderBy: { sortOrder: 'asc' } },
        extraDetails: { orderBy: { sortOrder: 'asc' } },
      },
    })
  }),

  create: ownerProcedure.input(propertyCreateSchema).mutation(async ({ ctx, input }) => {
    const code = await generatePropertyCode()
    const property = await prisma.$transaction(async (tx) => {
      const created = await tx.property.create({
        data: {
          code,
          ownerId: ctx.ownerId,
          name: input.name as Prisma.InputJsonValue,
          type: input.type,
          totalBedrooms: input.totalBedrooms,
          totalBathrooms: input.totalBathrooms,
          areaSqwa: input.areaSqwa,
          contactInfo: input.contactInfo,
          reviewStatus: 'ACTIVE', // owner self-publish (no admin review in MVP)
          isActive: true,
        },
      })
      // Always create default variant ("เปิดทั้งหลัง")
      const defaultName = input.defaultVariantName ?? `${input.totalBedrooms} ห้องนอน`
      await tx.propertyVariant.create({
        data: {
          propertyId: created.id,
          name: { th: defaultName } as Prisma.InputJsonValue,
          bedrooms: input.totalBedrooms,
          maxGuests: input.defaultVariantMaxGuests,
          isDefault: true,
          sortOrder: 0,
        },
      })
      return created
    })
    return property
  }),

  update: ownerProcedure.input(propertyUpdateSchema).mutation(async ({ ctx, input }) => {
    await assertOwn(input.id, ctx.ownerId)
    const { id, name, ...rest } = input
    return prisma.property.update({
      where: { id },
      data: {
        ...rest,
        ...(name && { name: name as Prisma.InputJsonValue }),
      },
    })
  }),

  toggleActive: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const property = await assertOwn(input.id, ctx.ownerId)
    return prisma.property.update({
      where: { id: property.id },
      data: { isActive: !property.isActive },
    })
  }),

  delete: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await assertOwn(input.id, ctx.ownerId)
    return prisma.property.update({
      where: { id: input.id },
      data: { deletedAt: new Date() },
    })
  }),
})
