import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma, type Prisma } from '@pms/db'
import { router, ownerProcedure, publicProcedure } from '../trpc'
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
  /** List active property types (master data) — used by listing forms & explore filter */
  types: publicProcedure.query(async () => {
    return prisma.propertyTypeMaster.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { nameTh: 'asc' }],
      select: { code: true, nameTh: true, nameEn: true, desc: true, iconRef: true },
    })
  }),

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
          // Prefer a cover image, but fall back to any uploaded photo so picker
          // cards still show a thumbnail when the owner hasn't set a cover yet.
          // Ordering: cover first (alphabetical 'c' < 't' < 'g' for cover/tour/gallery
          // doesn't apply universally, so we sort by type and then sortOrder).
          images: { orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }], take: 1 },
          variants: {
            orderBy: { sortOrder: 'asc' },
            include: { weeklyPricing: { select: { dayOfWeek: true, splitOpen: true } } },
          },
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

  /** Look up a property by its human-readable `code` (e.g. TN-001) — scoped to the current owner.
   *  Used by per-property share URLs like /listings-calendar/[mode]/[code] which prefer code over cuid. */
  byCode: ownerProcedure.input(z.object({ code: z.string() })).query(async ({ ctx, input }) => {
    const property = await prisma.property.findFirst({
      where: { code: input.code, ownerId: ctx.ownerId, deletedAt: null },
      include: {
        variants: {
          orderBy: { sortOrder: 'asc' },
          include: { weeklyPricing: { select: { dayOfWeek: true, splitOpen: true } } },
        },
        images: { where: { type: 'cover' }, take: 1 },
      },
    })
    if (!property) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบที่พัก' })
    return property
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
          partnerListing: input.partnerListing ?? false,
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

    return prisma.$transaction(async (tx) => {
      const updated = await tx.property.update({
        where: { id },
        data: {
          ...rest,
          ...(name && { name: name as Prisma.InputJsonValue }),
        },
      })

      // Keep default variant in sync with property totalBedrooms
      // (default variant = "เปิดทั้งหลัง" — always reflects the whole property)
      if (input.totalBedrooms !== undefined) {
        await tx.propertyVariant.updateMany({
          where: { propertyId: id, isDefault: true },
          data: { bedrooms: input.totalBedrooms },
        })
      }

      return updated
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
