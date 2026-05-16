import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma, Prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'
import { calcCouponDiscount, couponCreateSchema, couponUpdateSchema } from '../schemas/coupon'

async function assertOwn(id: string, ownerId: string) {
  const c = await prisma.coupon.findFirst({ where: { id, ownerId } })
  if (!c) throw new TRPCError({ code: 'NOT_FOUND' })
  return c
}

export const couponRouter = router({
  list: ownerProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(({ ctx, input }) => {
      const search = input?.search?.trim()
      return prisma.coupon.findMany({
        where: {
          ownerId: ctx.ownerId,
          ...(search && {
            OR: [
              { code: { contains: search } },
              { name: { contains: search } },
            ],
          }),
        },
        orderBy: { startsAt: 'desc' },
        take: 200,
      })
    }),

  byId: ownerProcedure.input(z.object({ id: z.string() })).query(({ ctx, input }) => assertOwn(input.id, ctx.ownerId)),

  create: ownerProcedure.input(couponCreateSchema).mutation(async ({ ctx, input }) => {
    const exists = await prisma.coupon.findFirst({
      where: { ownerId: ctx.ownerId, code: input.code },
    })
    if (exists) {
      throw new TRPCError({ code: 'CONFLICT', message: `รหัส ${input.code} ซ้ำกับคูปองเดิม` })
    }
    return prisma.coupon.create({
      data: {
        ownerId: ctx.ownerId,
        code: input.code,
        name: input.name,
        type: input.type,
        format: input.format,
        value: input.value as unknown as Prisma.Decimal,
        qty: input.qty,
        qtyLeft: input.qty,
        startsAt: new Date(input.startsAt),
        expiresAt: new Date(input.expiresAt),
        perUser: input.perUser,
      },
    })
  }),

  update: ownerProcedure.input(couponUpdateSchema).mutation(async ({ ctx, input }) => {
    const cur = await assertOwn(input.id, ctx.ownerId)
    // If qty increased, increase qtyLeft proportionally; if decreased, clamp
    let nextQtyLeft = cur.qtyLeft
    if (input.qty !== undefined && input.qty !== cur.qty) {
      const used = cur.qty - cur.qtyLeft
      nextQtyLeft = Math.max(0, input.qty - used)
    }
    return prisma.coupon.update({
      where: { id: input.id },
      data: {
        ...(input.code !== undefined && { code: input.code }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.format !== undefined && { format: input.format }),
        ...(input.value !== undefined && { value: input.value as unknown as Prisma.Decimal }),
        ...(input.qty !== undefined && { qty: input.qty, qtyLeft: nextQtyLeft }),
        ...(input.startsAt !== undefined && { startsAt: new Date(input.startsAt) }),
        ...(input.expiresAt !== undefined && { expiresAt: new Date(input.expiresAt) }),
        ...(input.perUser !== undefined && { perUser: input.perUser }),
      },
    })
  }),

  delete: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await assertOwn(input.id, ctx.ownerId)
    return prisma.coupon.delete({ where: { id: input.id } })
  }),

  /** Validate a coupon code for the current owner — returns coupon + computed discount for given base price */
  validate: ownerProcedure
    .input(z.object({ code: z.string().min(1), basePrice: z.number().nonnegative() }))
    .query(async ({ ctx, input }) => {
      const code = input.code.trim().toUpperCase()
      const coupon = await prisma.coupon.findFirst({
        where: { ownerId: ctx.ownerId, code },
      })
      if (!coupon) return { ok: false as const, reason: 'ไม่พบรหัสคูปอง' }
      const now = new Date()
      if (now < coupon.startsAt) return { ok: false as const, reason: 'คูปองยังไม่เริ่ม', coupon }
      if (now > coupon.expiresAt) return { ok: false as const, reason: 'คูปองหมดอายุ', coupon }
      if (coupon.qtyLeft <= 0) return { ok: false as const, reason: 'คูปองหมด', coupon }
      const discount = calcCouponDiscount({
        type: coupon.type,
        format: coupon.format,
        value: Number(coupon.value),
        basePrice: input.basePrice,
      })
      return { ok: true as const, coupon, discount }
    }),
})
