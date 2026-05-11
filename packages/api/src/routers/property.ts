import { z } from 'zod'
import { prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'

export const propertyRouter = router({
  list: ownerProcedure.query(({ ctx }) =>
    prisma.property.findMany({
      where: { ownerId: ctx.ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        location: true,
        images: { where: { type: 'cover' }, take: 1 },
        variants: { orderBy: { sortOrder: 'asc' } },
      },
    }),
  ),

  byId: ownerProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const property = await prisma.property.findFirst({
      where: { id: input.id, ownerId: ctx.ownerId, deletedAt: null },
      include: {
        variants: { orderBy: { sortOrder: 'asc' } },
        location: true,
        pools: true,
        amenities: { include: { amenity: true } },
        policy: true,
        icals: true,
        images: true,
        landmarks: true,
        shops: true,
        extraDetails: true,
      },
    })
    if (!property) throw new Error('Property not found')
    return property
  }),
})
