import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@pms/db'
import { router, adminProcedure } from '../../trpc'

const typeSchema = z.object({
  code: z.string().min(1).regex(/^[A-Z0-9_]+$/, 'code ต้องเป็นตัวพิมพ์ใหญ่/_/ตัวเลข'),
  nameTh: z.string().min(1),
  nameEn: z.string().optional(),
  desc: z.string().optional(),
  iconRef: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export const adminPropertyTypeRouter = router({
  list: adminProcedure.query(async () => {
    const types = await prisma.propertyTypeMaster.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameTh: 'asc' }],
    })
    // attach in-use count manually (no FK relation since type is just a string column)
    const counts = await prisma.property.groupBy({
      by: ['type'],
      _count: { _all: true },
      where: { deletedAt: null },
    })
    const map = new Map(counts.map((c) => [c.type, c._count._all]))
    return types.map((t) => ({ ...t, usageCount: map.get(t.code) ?? 0 }))
  }),

  create: adminProcedure.input(typeSchema).mutation(async ({ input }) => {
    const exists = await prisma.propertyTypeMaster.findUnique({ where: { code: input.code } })
    if (exists) throw new TRPCError({ code: 'CONFLICT', message: 'code ซ้ำ' })
    return prisma.propertyTypeMaster.create({ data: input })
  }),

  update: adminProcedure
    .input(z.object({ id: z.string() }).merge(typeSchema.partial().omit({ code: true })))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input
      return prisma.propertyTypeMaster.update({ where: { id }, data: rest })
    }),

  setActive: adminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      return prisma.propertyTypeMaster.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      })
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const t = await prisma.propertyTypeMaster.findUnique({ where: { id: input.id } })
      if (!t) throw new TRPCError({ code: 'NOT_FOUND' })
      const count = await prisma.property.count({ where: { type: t.code, deletedAt: null } })
      if (count > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `มีที่พัก ${count} หลังใช้ประเภทนี้ — ปิดแทน (set inactive)`,
        })
      }
      return prisma.propertyTypeMaster.delete({ where: { id: input.id } })
    }),
})
