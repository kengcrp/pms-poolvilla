import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma, Prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'
import {
  propertyLocationSchema,
  propertyPolicySchema,
  propertyIcalSchema,
  propertyPoolSchema,
} from '../schemas/property-extras'

async function assertOwn(propertyId: string, ownerId: string) {
  const p = await prisma.property.findFirst({
    where: { id: propertyId, ownerId, deletedAt: null },
    select: { id: true },
  })
  if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบที่พัก' })
}

const localizedJson = (th: string) => ({ th, en: '', zh: '' }) as Prisma.InputJsonValue

export const propertyExtrasRouter = router({
  // ─── Location ─────────────────────────────────────────────
  upsertLocation: ownerProcedure.input(propertyLocationSchema).mutation(async ({ ctx, input }) => {
    await assertOwn(input.propertyId, ctx.ownerId)
    return prisma.propertyLocation.upsert({
      where: { propertyId: input.propertyId },
      create: {
        propertyId: input.propertyId,
        locationId: input.locationId,
        zoneId: input.zoneId ?? null,
        province: input.province,
        lat: input.lat,
        lng: input.lng,
        gmapUrl: input.gmapUrl ?? null,
        address: input.address,
        distanceTargetType: input.distanceTargetType ?? null,
        distanceValue: input.distanceValue ?? null,
        distanceUnit: input.distanceUnit ?? null,
      },
      update: {
        locationId: input.locationId,
        zoneId: input.zoneId ?? null,
        province: input.province,
        lat: input.lat,
        lng: input.lng,
        gmapUrl: input.gmapUrl ?? null,
        address: input.address,
        distanceTargetType: input.distanceTargetType ?? null,
        distanceValue: input.distanceValue ?? null,
        distanceUnit: input.distanceUnit ?? null,
      },
    })
  }),

  // ─── Policy ───────────────────────────────────────────────
  upsertPolicy: ownerProcedure.input(propertyPolicySchema).mutation(async ({ ctx, input }) => {
    await assertOwn(input.propertyId, ctx.ownerId)
    const data = {
      checkinStart: input.checkinStart,
      checkinEnd: input.checkinEnd ?? null,
      checkout: input.checkout,
      deposit: input.deposit as unknown as Prisma.Decimal,
      cancellationPolicy: localizedJson(input.cancellationPolicyTh),
      postponePolicy: localizedJson(input.postponePolicyTh),
      houseRules: input.houseRulesTh ? localizedJson(input.houseRulesTh) : Prisma.JsonNull,
      maxGuests: input.maxGuests,
      extraAdultPrice: input.extraAdultPrice as unknown as Prisma.Decimal,
      freeChildAgeUnder7: input.freeChildAgeUnder7,
      extraChildPrice: input.extraChildPrice as unknown as Prisma.Decimal,
      freeInfantAgeUnder2: input.freeInfantAgeUnder2,
      maxPets: input.maxPets,
      extraPetPrice: input.extraPetPrice as unknown as Prisma.Decimal,
    }
    return prisma.propertyPolicy.upsert({
      where: { propertyId: input.propertyId },
      create: { propertyId: input.propertyId, ...data },
      update: data,
    })
  }),

  // ─── iCal sync ────────────────────────────────────────────
  upsertIcal: ownerProcedure.input(propertyIcalSchema).mutation(async ({ ctx, input }) => {
    await assertOwn(input.propertyId, ctx.ownerId)
    if (!input.icalUrl) {
      // empty url = delete
      return prisma.propertyIcal.deleteMany({
        where: { propertyId: input.propertyId, platform: input.platform },
      })
    }
    return prisma.propertyIcal.upsert({
      where: { propertyId_platform: { propertyId: input.propertyId, platform: input.platform } },
      create: {
        propertyId: input.propertyId,
        platform: input.platform,
        icalUrl: input.icalUrl,
      },
      update: { icalUrl: input.icalUrl },
    })
  }),

  // ─── Amenities ────────────────────────────────────────────
  setAmenities: ownerProcedure
    .input(z.object({ propertyId: z.string(), amenityMasterIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await assertOwn(input.propertyId, ctx.ownerId)
      await prisma.$transaction([
        prisma.propertyAmenity.deleteMany({ where: { propertyId: input.propertyId } }),
        ...input.amenityMasterIds.map((amenityMasterId) =>
          prisma.propertyAmenity.create({
            data: { propertyId: input.propertyId, amenityMasterId },
          }),
        ),
      ])
      return { ok: true, count: input.amenityMasterIds.length }
    }),

  // ─── Pool ─────────────────────────────────────────────────
  upsertPool: ownerProcedure
    .input(propertyPoolSchema.extend({ id: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwn(input.propertyId, ctx.ownerId)
      const data = {
        ownership: input.ownership,
        system: input.system,
        widthM: input.widthM ?? null,
        lengthM: input.lengthM ?? null,
        depthM: input.depthM ?? null,
        features: input.features as unknown as Prisma.InputJsonValue,
      }
      if (input.id) {
        return prisma.propertyPool.update({ where: { id: input.id }, data })
      }
      return prisma.propertyPool.create({
        data: { propertyId: input.propertyId, ...data },
      })
    }),

  deletePool: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const pool = await prisma.propertyPool.findFirst({
      where: { id: input.id, property: { ownerId: ctx.ownerId, deletedAt: null } },
    })
    if (!pool) throw new TRPCError({ code: 'NOT_FOUND' })
    return prisma.propertyPool.delete({ where: { id: input.id } })
  }),

  // ─── Amenity master (read-only on owner side) ────────────
  amenityMaster: ownerProcedure.query(() =>
    prisma.amenityMaster.findMany({ orderBy: [{ category: 'asc' }, { nameTh: 'asc' }] }),
  ),

  // ─── Images ───────────────────────────────────────────────
  addImage: ownerProcedure
    .input(
      z.object({
        propertyId: z.string(),
        url: z.string().min(1),
        type: z.enum(['cover', 'gallery', 'tour']),
        category: z
          .enum(['pool', 'bedroom', 'bathroom', 'living', 'kitchen', 'rooftop', 'outdoor'])
          .nullable()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwn(input.propertyId, ctx.ownerId)
      // If adding a cover, demote any existing cover to gallery
      if (input.type === 'cover') {
        await prisma.propertyImage.updateMany({
          where: { propertyId: input.propertyId, type: 'cover' },
          data: { type: 'gallery' },
        })
      }
      const count = await prisma.propertyImage.count({
        where: { propertyId: input.propertyId, type: input.type, category: input.category ?? null },
      })
      return prisma.propertyImage.create({
        data: {
          propertyId: input.propertyId,
          url: input.url,
          type: input.type,
          category: input.category ?? null,
          sortOrder: count,
        },
      })
    }),

  deleteImage: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const img = await prisma.propertyImage.findFirst({
        where: { id: input.id, property: { ownerId: ctx.ownerId, deletedAt: null } },
      })
      if (!img) throw new TRPCError({ code: 'NOT_FOUND' })
      return prisma.propertyImage.delete({ where: { id: input.id } })
    }),

  setCover: ownerProcedure
    .input(z.object({ imageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const img = await prisma.propertyImage.findFirst({
        where: { id: input.imageId, property: { ownerId: ctx.ownerId, deletedAt: null } },
      })
      if (!img) throw new TRPCError({ code: 'NOT_FOUND' })
      await prisma.$transaction([
        prisma.propertyImage.updateMany({
          where: { propertyId: img.propertyId, type: 'cover' },
          data: { type: 'gallery' },
        }),
        prisma.propertyImage.update({
          where: { id: input.imageId },
          data: { type: 'cover', category: null },
        }),
      ])
      return { ok: true }
    }),

  setTour360Url: ownerProcedure
    .input(z.object({ propertyId: z.string(), url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwn(input.propertyId, ctx.ownerId)
      // 1 single 3D record per property — upsert by deleting existing first
      await prisma.propertyImage.deleteMany({
        where: { propertyId: input.propertyId, type: 'tour_360' },
      })
      if (!input.url) return { ok: true }
      return prisma.propertyImage.create({
        data: {
          propertyId: input.propertyId,
          url: input.url,
          type: 'tour_360',
          sortOrder: 0,
        },
      })
    }),
})
