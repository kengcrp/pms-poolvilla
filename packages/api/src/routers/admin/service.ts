import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@pms/db'
import { router, adminProcedure } from '../../trpc'

const serviceSchema = z.object({
  code: z.string().min(1).regex(/^[a-z0-9_-]+$/i),
  nameTh: z.string().min(1),
  nameEn: z.string().optional(),
  category: z.string().min(1),
  basePrice: z.number().nonnegative().nullable().optional(),
  iconRef: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const adminServiceRouter = router({
  list: adminProcedure.query(async () => {
    return prisma.serviceMaster.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { nameTh: 'asc' }],
    })
  }),

  create: adminProcedure.input(serviceSchema).mutation(async ({ input }) => {
    const exists = await prisma.serviceMaster.findUnique({ where: { code: input.code } })
    if (exists) throw new TRPCError({ code: 'CONFLICT', message: 'code ซ้ำ' })
    return prisma.serviceMaster.create({ data: input })
  }),

  update: adminProcedure
    .input(z.object({ id: z.string() }).merge(serviceSchema.partial()))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input
      return prisma.serviceMaster.update({ where: { id }, data: rest })
    }),

  setActive: adminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      return prisma.serviceMaster.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.serviceMaster.delete({ where: { id: input.id } })
    }),
})
