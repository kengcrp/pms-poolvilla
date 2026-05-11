import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'

async function assertVariantOwn(variantId: string, ownerId: string) {
  const v = await prisma.propertyVariant.findFirst({
    where: { id: variantId, property: { ownerId, deletedAt: null } },
  })
  if (!v) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบ variant' })
  return v
}

const weeklyRowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  price: z.number().nonnegative(),
  minStay: z.number().int().min(1).max(60).default(1),
})

export const pricingRouter = router({
  /** Get weekly pricing for a variant (returns 7 rows, filling defaults for missing days). */
  weeklyByVariant: ownerProcedure
    .input(z.object({ variantId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertVariantOwn(input.variantId, ctx.ownerId)
      const rows = await prisma.variantWeeklyPricing.findMany({
        where: { variantId: input.variantId },
        orderBy: { dayOfWeek: 'asc' },
      })
      const byDow = new Map(rows.map((r) => [r.dayOfWeek, r]))
      return Array.from({ length: 7 }, (_, dow) => {
        const row = byDow.get(dow)
        return row
          ? { dayOfWeek: dow, price: Number(row.price), minStay: row.minStay }
          : { dayOfWeek: dow, price: 0, minStay: 1 }
      })
    }),

  /** Upsert all 7 weekly rows for a variant in one shot. */
  upsertWeekly: ownerProcedure
    .input(
      z.object({
        variantId: z.string(),
        rows: z.array(weeklyRowSchema).length(7),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertVariantOwn(input.variantId, ctx.ownerId)
      await prisma.$transaction(
        input.rows.map((r) =>
          prisma.variantWeeklyPricing.upsert({
            where: { variantId_dayOfWeek: { variantId: input.variantId, dayOfWeek: r.dayOfWeek } },
            update: { price: r.price, minStay: r.minStay },
            create: {
              variantId: input.variantId,
              dayOfWeek: r.dayOfWeek,
              price: r.price,
              minStay: r.minStay,
            },
          }),
        ),
      )
      return { ok: true }
    }),
})
