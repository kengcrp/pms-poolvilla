import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@pms/db'
import { router, adminProcedure } from '../../trpc'

const baseSchema = z.object({
  code: z.string().min(1).regex(/^[A-Z0-9_]+$/, 'code ต้องเป็นตัวพิมพ์ใหญ่/_/ตัวเลข'),
  nameTh: z.string().min(1),
  nameEn: z.string().optional(),
  desc: z.string().optional(),
  iconRef: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export const adminHotelTypeRouter = router({
  list: adminProcedure.query(async () => {
    const types = await prisma.hotelTypeMaster.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameTh: 'asc' }],
    })
    const counts = await prisma.hotel.groupBy({
      by: ['hotelType'],
      _count: { _all: true },
      where: { deletedAt: null },
    })
    const map = new Map(counts.map((c) => [c.hotelType, c._count._all]))
    return types.map((t) => ({ ...t, usageCount: map.get(t.code) ?? 0 }))
  }),

  create: adminProcedure.input(baseSchema).mutation(async ({ input }) => {
    const exists = await prisma.hotelTypeMaster.findUnique({ where: { code: input.code } })
    if (exists) throw new TRPCError({ code: 'CONFLICT', message: 'code ซ้ำ' })
    return prisma.hotelTypeMaster.create({ data: input })
  }),

  update: adminProcedure
    .input(z.object({ id: z.string() }).merge(baseSchema.partial().omit({ code: true })))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input
      return prisma.hotelTypeMaster.update({ where: { id }, data: rest })
    }),

  setActive: adminProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) =>
      prisma.hotelTypeMaster.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      }),
    ),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const t = await prisma.hotelTypeMaster.findUnique({ where: { id: input.id } })
    if (!t) throw new TRPCError({ code: 'NOT_FOUND' })
    const used = await prisma.hotel.count({ where: { hotelType: t.code, deletedAt: null } })
    if (used > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `มีโรงแรม ${used} แห่งใช้ประเภทนี้ — ปิดแทน (set inactive)`,
      })
    }
    return prisma.hotelTypeMaster.delete({ where: { id: input.id } })
  }),
})
