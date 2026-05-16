import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง')

async function assertPropertyOwn(propertyId: string, ownerId: string) {
  const p = await prisma.property.findFirst({
    where: { id: propertyId, ownerId, deletedAt: null },
    select: { id: true },
  })
  if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบที่พัก' })
}

async function assertTaskOwn(taskId: string, ownerId: string) {
  const t = await prisma.housekeepingTask.findFirst({
    where: { id: taskId, property: { ownerId, deletedAt: null } },
  })
  if (!t) throw new TRPCError({ code: 'NOT_FOUND' })
  return t
}

export const housekeepingRouter = router({
  /** All properties with task summary (count, latest task) */
  summary: ownerProcedure.query(async ({ ctx }) => {
    const props = await prisma.property.findMany({
      where: { ownerId: ctx.ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        name: true,
        _count: { select: { housekeepingTasks: true } },
      },
    })
    // Get pending tasks per property
    const pending = await prisma.housekeepingTask.groupBy({
      by: ['propertyId'],
      where: {
        status: 'PENDING',
        property: { ownerId: ctx.ownerId, deletedAt: null },
      },
      _count: true,
    })
    const pendingMap = new Map(pending.map((p) => [p.propertyId, p._count]))
    return props.map((p) => ({
      ...p,
      taskCount: p._count.housekeepingTasks,
      pendingCount: pendingMap.get(p.id) ?? 0,
    }))
  }),

  /** Tasks for one property */
  tasksByProperty: ownerProcedure
    .input(z.object({ propertyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertPropertyOwn(input.propertyId, ctx.ownerId)
      return prisma.housekeepingTask.findMany({
        where: { propertyId: input.propertyId },
        orderBy: { date: 'desc' },
        take: 100,
      })
    }),

  create: ownerProcedure
    .input(
      z.object({
        propertyId: z.string(),
        date: isoDate,
        note: z.string().optional(),
        lineUserId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPropertyOwn(input.propertyId, ctx.ownerId)
      return prisma.housekeepingTask.create({
        data: {
          propertyId: input.propertyId,
          date: new Date(input.date),
          note: input.note,
          lineUserId: input.lineUserId,
          status: 'PENDING',
        },
      })
    }),

  setStatus: ownerProcedure
    .input(z.object({ id: z.string(), status: z.enum(['PENDING', 'DONE']) }))
    .mutation(async ({ ctx, input }) => {
      await assertTaskOwn(input.id, ctx.ownerId)
      return prisma.housekeepingTask.update({
        where: { id: input.id },
        data: { status: input.status },
      })
    }),

  delete: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await assertTaskOwn(input.id, ctx.ownerId)
    return prisma.housekeepingTask.delete({ where: { id: input.id } })
  }),
})
