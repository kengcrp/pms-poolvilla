import { z } from 'zod'
import { prisma } from '@pms/db'
import { router, adminProcedure } from '../../trpc'

const SINGLETON_ID = 'singleton'

async function ensureSettings() {
  const existing = await prisma.systemSetting.findUnique({ where: { id: SINGLETON_ID } })
  if (existing) return existing
  return prisma.systemSetting.create({ data: { id: SINGLETON_ID } })
}

export const adminSettingsRouter = router({
  get: adminProcedure.query(async () => {
    return ensureSettings()
  }),

  updateCommission: adminProcedure
    .input(z.object({ defaultCommissionPercent: z.number().min(0).max(100) }))
    .mutation(async ({ input }) => {
      await ensureSettings()
      return prisma.systemSetting.update({
        where: { id: SINGLETON_ID },
        data: { defaultCommissionPercent: input.defaultCommissionPercent },
      })
    }),

  updateFlags: adminProcedure
    .input(
      z.object({
        allowOwnerSelfPublish: z.boolean().optional(),
        enableMarketplace: z.boolean().optional(),
        enableAutoCancel: z.boolean().optional(),
        enableHousekeeping: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureSettings()
      return prisma.systemSetting.update({
        where: { id: SINGLETON_ID },
        data: input,
      })
    }),

  updateTheme: adminProcedure
    .input(
      z.object({
        brandName: z.string().min(1).optional(),
        brandColorHex: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/, 'รูปแบบสีไม่ถูกต้อง (#RRGGBB)')
          .optional(),
        logoUrl: z.string().url().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await ensureSettings()
      return prisma.systemSetting.update({
        where: { id: SINGLETON_ID },
        data: input,
      })
    }),
})
