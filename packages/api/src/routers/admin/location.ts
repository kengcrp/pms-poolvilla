import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@pms/db'
import { router, adminProcedure } from '../../trpc'

export const adminLocationRouter = router({
  list: adminProcedure.query(async () => {
    return prisma.location.findMany({
      orderBy: { name: 'asc' },
      include: {
        zones: { orderBy: { name: 'asc' } },
        _count: { select: { properties: true } },
      },
    })
  }),

  create: adminProcedure
    .input(z.object({ name: z.string().min(1), province: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return prisma.location.create({ data: input })
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        province: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input
      return prisma.location.update({ where: { id }, data: rest })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const count = await prisma.propertyLocation.count({ where: { locationId: input.id } })
      if (count > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `มีที่พัก ${count} หลังใช้โลเคชันนี้อยู่`,
        })
      }
      // delete zones first
      await prisma.locationZone.deleteMany({ where: { locationId: input.id } })
      return prisma.location.delete({ where: { id: input.id } })
    }),

  createZone: adminProcedure
    .input(z.object({ locationId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return prisma.locationZone.create({ data: input })
    }),

  updateZone: adminProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return prisma.locationZone.update({
        where: { id: input.id },
        data: { name: input.name },
      })
    }),

  deleteZone: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const count = await prisma.propertyLocation.count({ where: { zoneId: input.id } })
      if (count > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `มีที่พัก ${count} หลังใช้โซนนี้อยู่`,
        })
      }
      return prisma.locationZone.delete({ where: { id: input.id } })
    }),
})
