import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma, type Prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'
import { variantCreateSchema, variantUpdateSchema } from '../schemas/property'

async function assertVariantOwn(variantId: string, ownerId: string) {
  const variant = await prisma.propertyVariant.findFirst({
    where: { id: variantId, property: { ownerId, deletedAt: null } },
    include: { property: true },
  })
  if (!variant) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบ variant' })
  return variant
}

async function assertPropertyOwn(propertyId: string, ownerId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId, deletedAt: null },
  })
  if (!property) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบที่พัก' })
}

export const variantRouter = router({
  create: ownerProcedure.input(variantCreateSchema).mutation(async ({ ctx, input }) => {
    await assertPropertyOwn(input.propertyId, ctx.ownerId)
    const count = await prisma.propertyVariant.count({ where: { propertyId: input.propertyId } })
    return prisma.propertyVariant.create({
      data: {
        propertyId: input.propertyId,
        name: input.name as Prisma.InputJsonValue,
        bedrooms: input.bedrooms,
        maxGuests: input.maxGuests,
        extraRoomPrice: input.extraRoomPrice,
        roomSelectionMode: input.roomSelectionMode,
        isDefault: false,
        sortOrder: count,
      },
    })
  }),

  update: ownerProcedure.input(variantUpdateSchema).mutation(async ({ ctx, input }) => {
    await assertVariantOwn(input.id, ctx.ownerId)
    const { id, name, ...rest } = input
    return prisma.propertyVariant.update({
      where: { id },
      data: {
        ...rest,
        ...(name && { name: name as Prisma.InputJsonValue }),
      },
    })
  }),

  delete: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const variant = await assertVariantOwn(input.id, ctx.ownerId)
    if (variant.isDefault) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'ไม่สามารถลบ variant ค่าเริ่มต้นได้ — ใช้ลบที่พักทั้งหลังแทน',
      })
    }
    return prisma.propertyVariant.delete({ where: { id: input.id } })
  }),
})
