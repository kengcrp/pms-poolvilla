import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'
import { getCalendarRange } from '../lib/calendar'

async function assertVariantOwn(variantId: string, ownerId: string) {
  const v = await prisma.propertyVariant.findFirst({
    where: { id: variantId, property: { ownerId, deletedAt: null } },
    select: { id: true },
  })
  if (!v) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบ variant' })
}

export const calendarRouter = router({
  range: ownerProcedure
    .input(
      z.object({
        variantId: z.string(),
        from: z.string(), // ISO date YYYY-MM-DD
        to: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertVariantOwn(input.variantId, ctx.ownerId)
      return getCalendarRange(input.variantId, new Date(input.from), new Date(input.to))
    }),
})
