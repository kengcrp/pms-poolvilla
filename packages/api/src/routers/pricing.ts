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
  agentPrice: z.number().nonnegative().nullable().optional(),
  minStay: z.number().int().min(1).max(60).default(1),
  splitOpen: z.boolean().default(true),
  /** Guests included in `price`. null = ใช้ค่า PropertyVariant.maxGuests. */
  includedGuests: z.number().int().min(1).max(100).nullable().optional(),
  /** Fee per guest above `includedGuests`. null/0 = ไม่คิดค่าท่านเพิ่ม. */
  extraGuestFee: z.number().nonnegative().nullable().optional(),
})

/** Iterate nights [checkin, checkout) inclusive of checkin, exclusive of checkout. */
function nightDays(checkinISO: string, checkoutISO: string): Date[] {
  const start = new Date(`${checkinISO}T00:00:00.000Z`)
  const end = new Date(`${checkoutISO}T00:00:00.000Z`)
  const days: Date[] = []
  const cur = new Date(start)
  while (cur.getTime() < end.getTime()) {
    days.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}

export const pricingRouter = router({
  /**
   * Quick boolean check: has the owner configured ANY weekly pricing for this variant?
   * Used by the calendar to surface a "still no pricing — set it up?" prompt on first
   * click before falling back to the per-day no-price modal.
   */
  hasAnyWeeklyPricing: ownerProcedure
    .input(z.object({ variantId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertVariantOwn(input.variantId, ctx.ownerId)
      const row = await prisma.variantWeeklyPricing.findFirst({
        where: { variantId: input.variantId, price: { gt: 0 } },
        select: { id: true },
      })
      return { hasAny: row !== null }
    }),

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
          ? {
              dayOfWeek: dow,
              price: Number(row.price),
              agentPrice: row.agentPrice !== null ? Number(row.agentPrice) : null,
              minStay: row.minStay,
              splitOpen: row.splitOpen,
              includedGuests: row.includedGuests,
              extraGuestFee: row.extraGuestFee !== null ? Number(row.extraGuestFee) : null,
            }
          : {
              dayOfWeek: dow,
              price: 0,
              agentPrice: null as number | null,
              minStay: 1,
              splitOpen: true,
              includedGuests: null as number | null,
              extraGuestFee: null as number | null,
            }
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
            update: {
              price: r.price,
              agentPrice: r.agentPrice ?? null,
              minStay: r.minStay,
              splitOpen: r.splitOpen,
              includedGuests: r.includedGuests ?? null,
              extraGuestFee: r.extraGuestFee ?? null,
            },
            create: {
              variantId: input.variantId,
              dayOfWeek: r.dayOfWeek,
              price: r.price,
              agentPrice: r.agentPrice ?? null,
              minStay: r.minStay,
              splitOpen: r.splitOpen,
              includedGuests: r.includedGuests ?? null,
              extraGuestFee: r.extraGuestFee ?? null,
            },
          }),
        ),
      )
      return { ok: true }
    }),

  /**
   * Set per-day price override for a date range [checkin, checkout).
   * Skips cells that are BOOKED / PENDING_PAYMENT / UNDER_MAINTENANCE so we
   * never accidentally change pricing on a held cell.
   */
  setDayOverride: ownerProcedure
    .input(
      z.object({
        variantId: z.string(),
        checkin: z.string(), // YYYY-MM-DD
        checkout: z.string(), // YYYY-MM-DD (exclusive)
        price: z.number().nonnegative(),
        /** Optional per-day agent / OTA price. null = fall back to weekly default. */
        agentPrice: z.number().nonnegative().nullable().optional(),
        priceType: z.enum(['SPECIAL', 'DISCOUNT']).nullable().optional(),
        note: z.string().nullable().optional(),
        /** Original (pre-discount) price — only meaningful when priceType=DISCOUNT.
         *  Used by the UI to render strikethrough original alongside the promo price. */
        originalPrice: z.number().nonnegative().nullable().optional(),
        /** Original (pre-discount) AGENT price — same role as originalPrice but
         *  for the agent / OTA price column. Used to render strikethrough on the
         *  agent-mode calendar. */
        originalAgentPrice: z.number().nonnegative().nullable().optional(),
        /** Per-day minimum-stay override (nights). null = fall back to the
         *  variant's weekly minStay for this DOW. Surfaced in the day-edit
         *  drawer so the owner can require 2/3-night minimums on holidays. */
        minStay: z.number().int().min(1).max(60).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertVariantOwn(input.variantId, ctx.ownerId)
      const nights = nightDays(input.checkin, input.checkout)
      if (nights.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'ต้องมีอย่างน้อย 1 คืน' })
      }
      // For DISCOUNT type — only store originalPrice when it's strictly higher
      // than the new price (otherwise it's not a "discount" comparison).
      const originalPriceForSave =
        input.priceType === 'DISCOUNT' &&
        input.originalPrice != null &&
        input.originalPrice > input.price
          ? input.originalPrice
          : null
      // Same rule for the agent price snapshot — only persist when DISCOUNT AND
      // the previous agent price is strictly higher than the new one.
      const agentPriceNow = input.agentPrice ?? 0
      const originalAgentForSave =
        input.priceType === 'DISCOUNT' &&
        input.originalAgentPrice != null &&
        input.originalAgentPrice > agentPriceNow
          ? input.originalAgentPrice
          : null
      return prisma.$transaction(async (tx) => {
        const existing = await tx.variantCalendar.findMany({
          where: { variantId: input.variantId, date: { in: nights } },
          select: { date: true, status: true },
        })
        const blocked = new Set(
          existing
            .filter((r) => r.status !== 'OPEN')
            .map((r) => r.date.toISOString().slice(0, 10)),
        )
        const writable = nights.filter((d) => !blocked.has(d.toISOString().slice(0, 10)))
        for (const date of writable) {
          await tx.variantCalendar.upsert({
            where: { variantId_date: { variantId: input.variantId, date } },
            update: {
              priceOverride: input.price,
              agentPriceOverride: input.agentPrice ?? null,
              priceType: input.priceType ?? null,
              originalPrice: originalPriceForSave,
              originalAgentPrice: originalAgentForSave,
              minStayOverride: input.minStay ?? null,
              note: input.note ?? undefined,
            },
            create: {
              variantId: input.variantId,
              date,
              status: 'OPEN',
              priceOverride: input.price,
              agentPriceOverride: input.agentPrice ?? null,
              priceType: input.priceType ?? null,
              originalPrice: originalPriceForSave,
              originalAgentPrice: originalAgentForSave,
              minStayOverride: input.minStay ?? null,
              note: input.note ?? null,
            },
          })
        }
        return {
          ok: true,
          updated: writable.length,
          skipped: nights.length - writable.length,
        }
      })
    }),

  /** Remove price override (reset to weekly default) for a date range. */
  clearDayOverride: ownerProcedure
    .input(
      z.object({
        variantId: z.string(),
        checkin: z.string(),
        checkout: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertVariantOwn(input.variantId, ctx.ownerId)
      const nights = nightDays(input.checkin, input.checkout)
      return prisma.$transaction(async (tx) => {
        // Only clear the override fields — leave status (e.g. BOOKED) intact.
        // Delete OPEN-status rows entirely (so they fall back to weekly default).
        const rows = await tx.variantCalendar.findMany({
          where: { variantId: input.variantId, date: { in: nights } },
        })
        let cleared = 0
        for (const r of rows) {
          if (r.status === 'OPEN') {
            await tx.variantCalendar.delete({ where: { id: r.id } })
            cleared++
          } else if (r.priceOverride !== null || r.priceType !== null) {
            await tx.variantCalendar.update({
              where: { id: r.id },
              data: { priceOverride: null, priceType: null },
            })
            cleared++
          }
        }
        return { ok: true, cleared }
      })
    }),
})
