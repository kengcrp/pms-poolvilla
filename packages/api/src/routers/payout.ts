import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'

const payoutSchema = z.object({
  bank: z.string().min(1, 'กรุณาเลือกธนาคาร'),
  accountName: z.string().min(1, 'กรุณาระบุชื่อบัญชี'),
  accountNo: z.string().min(1, 'กรุณาระบุเลขบัญชี').max(40),
})

async function assertOwn(id: string, ownerId: string) {
  const c = await prisma.payoutChannel.findFirst({ where: { id, ownerId } })
  if (!c) throw new TRPCError({ code: 'NOT_FOUND' })
  return c
}

export const payoutRouter = router({
  list: ownerProcedure.query(({ ctx }) =>
    prisma.payoutChannel.findMany({
      where: { ownerId: ctx.ownerId },
      orderBy: { bank: 'asc' },
      include: {
        properties: { include: { property: { select: { id: true, code: true, name: true } } } },
      },
    }),
  ),

  create: ownerProcedure.input(payoutSchema).mutation(({ ctx, input }) =>
    prisma.payoutChannel.create({
      data: { ownerId: ctx.ownerId, ...input },
    }),
  ),

  update: ownerProcedure
    .input(payoutSchema.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwn(input.id, ctx.ownerId)
      const { id, ...rest } = input
      return prisma.payoutChannel.update({ where: { id }, data: rest })
    }),

  delete: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await assertOwn(input.id, ctx.ownerId)
    return prisma.payoutChannel.delete({ where: { id: input.id } })
  }),

  /** Replace property mapping for this channel */
  setProperties: ownerProcedure
    .input(z.object({ id: z.string(), propertyIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await assertOwn(input.id, ctx.ownerId)
      // Verify all properties belong to owner
      const owned = await prisma.property.findMany({
        where: { id: { in: input.propertyIds }, ownerId: ctx.ownerId, deletedAt: null },
        select: { id: true },
      })
      const validIds = new Set(owned.map((p) => p.id))
      await prisma.$transaction([
        prisma.payoutChannelProperty.deleteMany({ where: { payoutChannelId: input.id } }),
        ...Array.from(validIds).map((pid) =>
          prisma.payoutChannelProperty.create({
            data: { payoutChannelId: input.id, propertyId: pid },
          }),
        ),
      ])
      return { ok: true, count: validIds.size }
    }),
})
