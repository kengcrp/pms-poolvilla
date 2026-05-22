import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@pms/db'
import { router, adminProcedure } from '../../trpc'

const amenitySchema = z.object({
  code: z.string().min(1).regex(/^[a-z0-9_-]+$/i),
  nameTh: z.string().min(1),
  nameEn: z.string().optional(),
  category: z.string().min(1),
  iconRef: z.string().optional(),
})

export const adminAmenityRouter = router({
  list: adminProcedure.query(async () => {
    return prisma.amenityMaster.findMany({
      orderBy: [{ category: 'asc' }, { nameTh: 'asc' }],
      include: { _count: { select: { amenities: true } } },
    })
  }),

  create: adminProcedure.input(amenitySchema).mutation(async ({ input }) => {
    const exists = await prisma.amenityMaster.findUnique({ where: { code: input.code } })
    if (exists) throw new TRPCError({ code: 'CONFLICT', message: 'code ซ้ำ' })
    return prisma.amenityMaster.create({ data: input })
  }),

  update: adminProcedure
    .input(z.object({ id: z.string() }).merge(amenitySchema.partial()))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input
      return prisma.amenityMaster.update({ where: { id }, data: rest })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const count = await prisma.propertyAmenity.count({ where: { amenityMasterId: input.id } })
      if (count > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `มีที่พัก ${count} หลังใช้สิ่งอำนวยฯ นี้`,
        })
      }
      return prisma.amenityMaster.delete({ where: { id: input.id } })
    }),
})
