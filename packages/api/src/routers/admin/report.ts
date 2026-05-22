import { z } from 'zod'
import { prisma } from '@pms/db'
import { router, adminProcedure } from '../../trpc'

export const adminReportRouter = router({
  marketplaceSummary: adminProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      }),
    )
    .query(async ({ input }) => {
      const since = new Date()
      since.setDate(since.getDate() - input.days)
      const [total, marketplace, ownerDirect, ical] = await Promise.all([
        prisma.booking.count({ where: { deletedAt: null, createdAt: { gte: since } } }),
        prisma.booking.count({
          where: { deletedAt: null, source: 'PUBLIC_SALE_PAGE', createdAt: { gte: since } },
        }),
        prisma.booking.count({
          where: { deletedAt: null, source: 'OWNER_DIRECT', createdAt: { gte: since } },
        }),
        prisma.booking.count({
          where: { deletedAt: null, source: 'EXTERNAL_ICAL', createdAt: { gte: since } },
        }),
      ])

      const recent = await prisma.booking.findMany({
        where: { deletedAt: null, source: 'PUBLIC_SALE_PAGE', createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          property: { select: { name: true, code: true } },
          variant: { select: { name: true } },
        },
      })

      return {
        days: input.days,
        total,
        bySource: { marketplace, ownerDirect, ical },
        recent,
      }
    }),
})
