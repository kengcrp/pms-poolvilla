import { prisma } from '@pms/db'
import { router, publicProcedure } from '../trpc'

/** Locations master is read-only on owner side. */
export const locationRouter = router({
  list: publicProcedure.query(() =>
    prisma.location.findMany({
      orderBy: { name: 'asc' },
      include: { zones: { orderBy: { name: 'asc' } } },
    }),
  ),
})
