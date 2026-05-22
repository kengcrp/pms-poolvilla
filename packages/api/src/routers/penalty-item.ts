import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'

async function assertPropertyOwn(propertyId: string, ownerId: string) {
  const p = await prisma.property.findFirst({
    where: { id: propertyId, ownerId, deletedAt: null },
    select: { id: true, name: true, code: true },
  })
  if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบที่พัก' })
  return p
}

async function assertItemOwn(itemId: string, ownerId: string) {
  const item = await prisma.penaltyItem.findFirst({
    where: { id: itemId, property: { ownerId, deletedAt: null } },
  })
  if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบรายการ' })
  return item
}

const createSchema = z.object({
  propertyId: z.string(),
  name: z.string().min(1, 'กรุณาระบุชื่อ').max(120),
  feePerPiece: z.number().nonnegative('ราคาต้องไม่ติดลบ'),
  sortOrder: z.number().int().optional(),
})

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120).optional(),
  feePerPiece: z.number().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
})

export const penaltyItemRouter = router({
  /** Penalty items list for a property — used by the House Keeper "ทำรายการ" page. */
  listByProperty: ownerProcedure
    .input(z.object({ propertyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const property = await assertPropertyOwn(input.propertyId, ctx.ownerId)
      const items = await prisma.penaltyItem.findMany({
        where: { propertyId: input.propertyId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })
      return {
        property,
        items: items.map((it) => ({
          ...it,
          feePerPiece: Number(it.feePerPiece),
        })),
      }
    }),

  create: ownerProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
    await assertPropertyOwn(input.propertyId, ctx.ownerId)
    return prisma.penaltyItem.create({
      data: {
        propertyId: input.propertyId,
        name: input.name,
        feePerPiece: input.feePerPiece,
        sortOrder: input.sortOrder ?? 0,
      },
    })
  }),

  update: ownerProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    await assertItemOwn(input.id, ctx.ownerId)
    const { id, ...data } = input
    return prisma.penaltyItem.update({
      where: { id },
      data,
    })
  }),

  delete: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await assertItemOwn(input.id, ctx.ownerId)
    return prisma.penaltyItem.delete({ where: { id: input.id } })
  }),
})
