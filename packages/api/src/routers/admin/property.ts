import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@pms/db'
import { router, adminProcedure } from '../../trpc'

/**
 * Admin operations on properties:
 * - listForReview: PENDING / REJECTED queue
 * - approve / reject (sets reviewStatus + isActive)
 * - suspend / unsuspend
 */
export const adminPropertyRouter = router({
  listForReview: adminProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'REJECTED', 'ACTIVE', 'INACTIVE']).optional(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input }) => {
      return prisma.property.findMany({
        where: {
          deletedAt: null,
          ...(input.status ? { reviewStatus: input.status } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: {
          owner: { select: { id: true, name: true, email: true, phone: true } },
          location: { include: { location: true, zone: true } },
          images: { where: { type: 'cover' }, take: 1 },
          _count: { select: { variants: true } },
        },
      })
    }),

  approve: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const property = await prisma.property.findUnique({ where: { id: input.id } })
      if (!property) throw new TRPCError({ code: 'NOT_FOUND' })
      return prisma.property.update({
        where: { id: input.id },
        data: { reviewStatus: 'ACTIVE', isActive: true },
      })
    }),

  reject: adminProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      return prisma.property.update({
        where: { id: input.id },
        data: { reviewStatus: 'REJECTED', isActive: false },
      })
    }),

  setActive: adminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      return prisma.property.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      })
    }),
})
