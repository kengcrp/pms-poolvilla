import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { hash } from 'bcryptjs'
import { prisma } from '@pms/db'
import { router, adminProcedure } from '../../trpc'

/**
 * Admin user management.
 * - Owners CRUD: any STAFF/SUPER_ADMIN can manage
 * - Staff CRUD: SUPER_ADMIN only (enforced per-mutation)
 */

function assertSuperAdmin(role: string) {
  if (role !== 'SUPER_ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'ต้องเป็น Super Admin' })
  }
}

export const adminUserRouter = router({
  listOwners: adminProcedure
    .input(
      z.object({
        q: z.string().optional(),
        limit: z.number().min(1).max(200).default(100),
      }),
    )
    .query(async ({ input }) => {
      const where = {
        role: 'OWNER' as const,
        ...(input.q
          ? {
              OR: [
                { name: { contains: input.q } },
                { email: { contains: input.q } },
              ],
            }
          : {}),
      }
      return prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          saleSlug: true,
          suspendedAt: true,
          createdAt: true,
          _count: { select: { properties: { where: { deletedAt: null } } } },
        },
      })
    }),

  listStaff: adminProcedure.query(async () => {
    return prisma.user.findMany({
      where: { role: { in: ['STAFF', 'SUPER_ADMIN'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        suspendedAt: true,
        createdAt: true,
      },
    })
  }),

  createOwner: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        password: z.string().min(6),
        saleSlug: z.string().min(2).regex(/^[a-z0-9-]+$/i).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const exists = await prisma.user.findUnique({ where: { email: input.email } })
      if (exists) throw new TRPCError({ code: 'CONFLICT', message: 'อีเมลนี้มีในระบบแล้ว' })
      if (input.saleSlug) {
        const slugUsed = await prisma.user.findUnique({ where: { saleSlug: input.saleSlug } })
        if (slugUsed) throw new TRPCError({ code: 'CONFLICT', message: 'sale slug ซ้ำ' })
      }
      return prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash: await hash(input.password, 10),
          role: 'OWNER',
          saleSlug: input.saleSlug ?? null,
        },
      })
    }),

  createStaff: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['STAFF', 'SUPER_ADMIN']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSuperAdmin(ctx.session.role)
      const exists = await prisma.user.findUnique({ where: { email: input.email } })
      if (exists) throw new TRPCError({ code: 'CONFLICT', message: 'อีเมลนี้มีในระบบแล้ว' })
      return prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: await hash(input.password, 10),
          role: input.role,
        },
      })
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        saleSlug: z.string().min(2).regex(/^[a-z0-9-]+$/i).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await prisma.user.findUnique({ where: { id: input.id } })
      if (!target) throw new TRPCError({ code: 'NOT_FOUND' })
      // Only SUPER_ADMIN can edit other admins
      if (target.role !== 'OWNER') assertSuperAdmin(ctx.session.role)
      if (input.saleSlug) {
        const slugUsed = await prisma.user.findFirst({
          where: { saleSlug: input.saleSlug, NOT: { id: input.id } },
        })
        if (slugUsed) throw new TRPCError({ code: 'CONFLICT', message: 'sale slug ซ้ำ' })
      }
      const { id, ...rest } = input
      return prisma.user.update({ where: { id }, data: rest })
    }),

  setSuspended: adminProcedure
    .input(z.object({ id: z.string(), suspended: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const target = await prisma.user.findUnique({ where: { id: input.id } })
      if (!target) throw new TRPCError({ code: 'NOT_FOUND' })
      if (target.role !== 'OWNER') assertSuperAdmin(ctx.session.role)
      if (target.id === ctx.session.userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'ระงับบัญชีตัวเองไม่ได้' })
      }
      return prisma.user.update({
        where: { id: input.id },
        data: { suspendedAt: input.suspended ? new Date() : null },
      })
    }),

  resetPassword: adminProcedure
    .input(z.object({ id: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const target = await prisma.user.findUnique({ where: { id: input.id } })
      if (!target) throw new TRPCError({ code: 'NOT_FOUND' })
      if (target.role !== 'OWNER') assertSuperAdmin(ctx.session.role)
      return prisma.user.update({
        where: { id: input.id },
        data: { passwordHash: await hash(input.newPassword, 10) },
        select: { id: true, email: true },
      })
    }),

  changeRole: adminProcedure
    .input(z.object({ id: z.string(), role: z.enum(['STAFF', 'SUPER_ADMIN']) }))
    .mutation(async ({ ctx, input }) => {
      assertSuperAdmin(ctx.session.role)
      if (input.id === ctx.session.userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'เปลี่ยนสิทธิ์ตัวเองไม่ได้' })
      }
      const target = await prisma.user.findUnique({ where: { id: input.id } })
      if (!target || target.role === 'OWNER') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'เปลี่ยนได้เฉพาะพนักงาน/Admin' })
      }
      return prisma.user.update({ where: { id: input.id }, data: { role: input.role } })
    }),
})
