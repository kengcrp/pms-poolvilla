import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma, Prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'
import {
  docCreateSchema,
  docStatusEnum,
  docTypeEnum,
  docUpdateSchema,
} from '../schemas/accounting'
import { buildDocNo, computeTotals } from '../lib/accounting'

async function assertOwn(id: string, ownerId: string) {
  const doc = await prisma.accountingDoc.findFirst({ where: { id, ownerId } })
  if (!doc) throw new TRPCError({ code: 'NOT_FOUND' })
  return doc
}

async function nextDocNo(ownerId: string, type: string): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.accountingDoc.count({
    where: {
      ownerId,
      type: type as 'QUOTE' | 'INVOICE' | 'TAX_INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE',
      createdAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
  })
  return buildDocNo(type, year, count + 1)
}

export const accountingRouter = router({
  list: ownerProcedure
    .input(
      z
        .object({
          type: docTypeEnum.optional(),
          status: docStatusEnum.optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) => {
      const search = input?.search?.trim()
      return prisma.accountingDoc.findMany({
        where: {
          ownerId: ctx.ownerId,
          ...(input?.type && { type: input.type }),
          ...(input?.status && { status: input.status }),
          ...(search && {
            OR: [
              { docNo: { contains: search } },
              // search inside customerData.name JSON would need raw query; skip for MVP
            ],
          }),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    }),

  byId: ownerProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return assertOwn(input.id, ctx.ownerId)
  }),

  create: ownerProcedure.input(docCreateSchema).mutation(async ({ ctx, input }) => {
    const docNo = await nextDocNo(ctx.ownerId, input.type)
    const totals = computeTotals(input.items, input.withVat)
    return prisma.accountingDoc.create({
      data: {
        ownerId: ctx.ownerId,
        type: input.type,
        docNo,
        customerData: {
          ...input.customerData,
          notes: input.notes ?? '',
          withVat: input.withVat,
        } as Prisma.InputJsonValue,
        items: input.items as unknown as Prisma.InputJsonValue,
        subtotal: totals.subtotal as unknown as Prisma.Decimal,
        vat: totals.vat as unknown as Prisma.Decimal,
        total: totals.total as unknown as Prisma.Decimal,
        status: 'DRAFT',
      },
    })
  }),

  update: ownerProcedure.input(docUpdateSchema).mutation(async ({ ctx, input }) => {
    const doc = await assertOwn(input.id, ctx.ownerId)
    if (doc.status !== 'DRAFT') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `แก้ไขไม่ได้ — เอกสารสถานะ ${doc.status}`,
      })
    }
    const existing = doc.customerData as Record<string, unknown>
    const customerData = input.customerData
      ? ({ ...existing, ...input.customerData } as Prisma.InputJsonValue)
      : (doc.customerData as Prisma.InputJsonValue)
    const items = input.items ?? (doc.items as unknown as { qty: number; price: number; desc: string }[])
    const withVat = input.withVat ?? Boolean(existing.withVat)
    const totals = computeTotals(items, withVat)
    const newCustomerObj = {
      ...(customerData as Record<string, unknown>),
      ...(input.notes !== undefined && { notes: input.notes }),
      withVat,
    }
    return prisma.accountingDoc.update({
      where: { id: input.id },
      data: {
        customerData: newCustomerObj as Prisma.InputJsonValue,
        items: items as unknown as Prisma.InputJsonValue,
        subtotal: totals.subtotal as unknown as Prisma.Decimal,
        vat: totals.vat as unknown as Prisma.Decimal,
        total: totals.total as unknown as Prisma.Decimal,
      },
    })
  }),

  setStatus: ownerProcedure
    .input(z.object({ id: z.string(), status: docStatusEnum }))
    .mutation(async ({ ctx, input }) => {
      await assertOwn(input.id, ctx.ownerId)
      return prisma.accountingDoc.update({
        where: { id: input.id },
        data: { status: input.status },
      })
    }),

  delete: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const doc = await assertOwn(input.id, ctx.ownerId)
    if (doc.status !== 'DRAFT' && doc.status !== 'CANCELLED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'ลบได้เฉพาะเอกสารร่างหรือยกเลิก',
      })
    }
    return prisma.accountingDoc.delete({ where: { id: input.id } })
  }),

  /** Build draft from a booking — quick action from /manage/bookings */
  createFromBooking: ownerProcedure
    .input(z.object({ bookingId: z.string(), type: docTypeEnum, withVat: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const booking = await prisma.booking.findFirst({
        where: { id: input.bookingId, property: { ownerId: ctx.ownerId, deletedAt: null } },
        include: {
          property: { select: { code: true, name: true } },
          variant: { select: { name: true } },
        },
      })
      if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบการจอง' })

      const propName = (booking.property.name as { th?: string })?.th ?? booking.property.code
      const variantName = (booking.variant.name as { th?: string })?.th ?? ''
      const nights = Math.max(
        1,
        Math.round((booking.checkout.getTime() - booking.checkin.getTime()) / 86400000),
      )
      const checkinStr = booking.checkin.toISOString().slice(0, 10)
      const checkoutStr = booking.checkout.toISOString().slice(0, 10)

      const desc = `${propName}${variantName ? ` (${variantName})` : ''} · ${checkinStr} → ${checkoutStr} · ${nights} คืน × ${booking.guestCount} ท่าน`

      const items = [
        {
          desc,
          qty: nights,
          price: nights > 0 ? Number((Number(booking.total) / nights).toFixed(2)) : Number(booking.total),
        },
      ]
      const totals = computeTotals(items, input.withVat)
      const docNo = await nextDocNo(ctx.ownerId, input.type)

      return prisma.accountingDoc.create({
        data: {
          ownerId: ctx.ownerId,
          type: input.type,
          docNo,
          customerData: {
            name: booking.customerName,
            phone: booking.customerPhone ?? '',
            address: '',
            taxId: '',
            email: '',
            branchNo: '',
            notes: booking.publicNote ?? '',
            withVat: input.withVat,
            sourceBookingId: booking.id,
          } as Prisma.InputJsonValue,
          items: items as unknown as Prisma.InputJsonValue,
          subtotal: totals.subtotal as unknown as Prisma.Decimal,
          vat: totals.vat as unknown as Prisma.Decimal,
          total: totals.total as unknown as Prisma.Decimal,
          status: 'DRAFT',
        },
      })
    }),
})
