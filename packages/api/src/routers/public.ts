import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma, Prisma } from '@pms/db'
import { router, publicProcedure } from '../trpc'
import { BookingService } from '../lib/booking-service'
import { getCalendarRange } from '../lib/calendar'
import { calcCouponDiscount } from '../schemas/coupon'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/**
 * Public-facing API for /sale/[slug] pages.
 * NO auth required. Strictly filters: only ACTIVE + isActive properties.
 */
export const publicRouter = router({
  /** Master locations + zones for filter dropdowns (public). */
  locations: publicProcedure.query(() =>
    prisma.location.findMany({
      orderBy: { name: 'asc' },
      include: { zones: { orderBy: { name: 'asc' } } },
    }),
  ),

  /** Global marketplace — all active properties from all owners with filters. */
  exploreAll: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        locationId: z.string().optional(),
        zoneId: z.string().optional(),
        minBed: z.number().int().min(0).optional(),
        hasPool: z.boolean().optional(),
        propertyType: z.enum(['POOL_VILLA', 'LOFT', 'BNB']).optional(),
        sort: z.enum(['newest', 'bedroomDesc', 'bedroomAsc']).default('newest'),
        limit: z.number().int().min(1).max(60).default(24),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      const f = input
      const search = f.search?.trim()

      const where: Prisma.PropertyWhereInput = {
        deletedAt: null,
        isActive: true,
        reviewStatus: 'ACTIVE',
        owner: { saleSlug: { not: null } },
        ...(f.locationId && { location: { locationId: f.locationId } }),
        ...(f.zoneId && { location: { zoneId: f.zoneId } }),
        ...(f.minBed && f.minBed > 0 && { totalBedrooms: { gte: f.minBed } }),
        ...(f.propertyType && { type: f.propertyType }),
        ...(f.hasPool && { pools: { some: {} } }),
      }

      let orderBy: Prisma.PropertyOrderByWithRelationInput = { createdAt: 'desc' }
      if (f.sort === 'bedroomDesc') orderBy = { totalBedrooms: 'desc' }
      else if (f.sort === 'bedroomAsc') orderBy = { totalBedrooms: 'asc' }

      const limit = f.limit
      const offset = f.offset

      const [items, total] = await Promise.all([
        prisma.property.findMany({
          where,
          orderBy,
          take: limit,
          skip: offset,
          include: {
            owner: { select: { id: true, name: true, saleSlug: true } },
            location: { include: { location: true, zone: true } },
            images: { where: { type: 'cover' }, take: 1 },
            variants: { where: { isDefault: true }, take: 1 },
            pools: { select: { id: true } },
          },
        }),
        prisma.property.count({ where }),
      ])

      // Optional in-memory text filter (Prisma full-text on JSON `name` is heavy)
      const filtered = search
        ? items.filter((p) => {
            const name = (p.name as { th?: string })?.th?.toLowerCase() ?? ''
            return name.includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
          })
        : items

      return { items: filtered, total, limit, offset }
    }),

  /** Get owner + their active properties by sale slug. */
  ownerBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const owner = await prisma.user.findUnique({
        where: { saleSlug: input.slug },
        select: {
          id: true,
          name: true,
          phone: true,
          saleSlug: true,
        },
      })
      if (!owner) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบหน้าร้าน' })

      const properties = await prisma.property.findMany({
        where: {
          ownerId: owner.id,
          deletedAt: null,
          isActive: true,
          reviewStatus: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
        include: {
          location: { include: { location: true, zone: true } },
          images: { where: { type: 'cover' }, take: 1 },
          variants: { where: { isDefault: true }, take: 1 },
          pools: true,
        },
      })

      return { owner, properties }
    }),

  /** Get property detail (by owner slug + property code). */
  propertyByCode: publicProcedure
    .input(z.object({ slug: z.string(), code: z.string() }))
    .query(async ({ input }) => {
      const property = await prisma.property.findFirst({
        where: {
          code: input.code,
          deletedAt: null,
          isActive: true,
          reviewStatus: 'ACTIVE',
          owner: { saleSlug: input.slug },
        },
        include: {
          owner: { select: { id: true, name: true, phone: true } },
          variants: { orderBy: { sortOrder: 'asc' } },
          location: { include: { location: true, zone: true } },
          pools: true,
          amenities: { include: { amenity: true } },
          policy: true,
          images: { orderBy: { sortOrder: 'asc' } },
        },
      })
      if (!property) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบที่พัก' })
      return property
    }),

  /** Get calendar range for a public-visible variant. */
  calendarRange: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        variantId: z.string(),
        from: isoDate,
        to: isoDate,
      }),
    )
    .query(async ({ input }) => {
      // Verify variant belongs to a public-visible property of this slug
      const variant = await prisma.propertyVariant.findFirst({
        where: {
          id: input.variantId,
          property: {
            deletedAt: null,
            isActive: true,
            reviewStatus: 'ACTIVE',
            owner: { saleSlug: input.slug },
          },
        },
        select: { id: true },
      })
      if (!variant) throw new TRPCError({ code: 'NOT_FOUND' })
      return getCalendarRange(input.variantId, new Date(input.from), new Date(input.to))
    }),

  /** Public coupon validation — uses slug to scope owner */
  validateCoupon: publicProcedure
    .input(z.object({ slug: z.string(), code: z.string().min(1), basePrice: z.number().nonnegative() }))
    .query(async ({ input }) => {
      const owner = await prisma.user.findUnique({
        where: { saleSlug: input.slug },
        select: { id: true },
      })
      if (!owner) return { ok: false as const, reason: 'ไม่พบหน้าร้าน' }
      const code = input.code.trim().toUpperCase()
      const coupon = await prisma.coupon.findFirst({
        where: { ownerId: owner.id, code },
      })
      if (!coupon) return { ok: false as const, reason: 'ไม่พบรหัสคูปอง' }
      const now = new Date()
      if (now < coupon.startsAt) return { ok: false as const, reason: 'คูปองยังไม่เริ่ม' }
      if (now > coupon.expiresAt) return { ok: false as const, reason: 'คูปองหมดอายุ' }
      if (coupon.qtyLeft <= 0) return { ok: false as const, reason: 'คูปองหมด' }
      const discount = calcCouponDiscount({
        type: coupon.type,
        format: coupon.format,
        value: Number(coupon.value),
        basePrice: input.basePrice,
      })
      return {
        ok: true as const,
        code: coupon.code,
        couponId: coupon.id,
        discount,
      }
    }),

  /** Public booking submission — creates PENDING_PAYMENT (24h auto-cancel). */
  submitBooking: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        variantId: z.string(),
        checkin: isoDate,
        checkout: isoDate,
        customerName: z.string().min(1).max(120),
        customerPhone: z.string().min(1).max(40),
        guestCount: z.number().int().min(1).max(100),
        message: z.string().max(500).optional(),
        couponCode: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Verify variant + get owner + total
      const variant = await prisma.propertyVariant.findFirst({
        where: {
          id: input.variantId,
          property: {
            deletedAt: null,
            isActive: true,
            reviewStatus: 'ACTIVE',
            owner: { saleSlug: input.slug },
          },
        },
        include: {
          property: { include: { owner: { select: { id: true } } } },
        },
      })
      if (!variant) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบที่พัก' })

      // Compute total from weekly pricing (rough, for display only)
      const days = await getCalendarRange(input.variantId, new Date(input.checkin), new Date(input.checkout))
      const nightTotal = days
        .slice(0, -1) // exclude checkout day
        .reduce((sum, d) => sum + d.price, 0)

      // Resolve coupon if provided
      let couponId: string | undefined
      let finalTotal = nightTotal
      if (input.couponCode) {
        const code = input.couponCode.trim().toUpperCase()
        const coupon = await prisma.coupon.findFirst({
          where: { ownerId: variant.property.owner.id, code },
        })
        if (!coupon) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบรหัสคูปอง' })
        const now = new Date()
        if (now < coupon.startsAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'คูปองยังไม่เริ่ม' })
        if (now > coupon.expiresAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'คูปองหมดอายุ' })
        if (coupon.qtyLeft <= 0) throw new TRPCError({ code: 'CONFLICT', message: 'คูปองหมดแล้ว' })
        const discount = calcCouponDiscount({
          type: coupon.type,
          format: coupon.format,
          value: Number(coupon.value),
          basePrice: nightTotal,
        })
        couponId = coupon.id
        finalTotal = Math.max(0, nightTotal - discount)
      }

      // Create booking via BookingService — atomic with calendar + coupon decrement
      const booking = await BookingService.createPending({
        variantId: input.variantId,
        ownerId: variant.property.owner.id,
        checkin: input.checkin,
        checkout: input.checkout,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        bookerName: input.customerName,
        guestCount: input.guestCount,
        total: finalTotal,
        deposit: 0,
        paymentDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        publicNote: input.message,
        couponId,
      })

      // Override source to PUBLIC_SALE_PAGE (BookingService defaults to OWNER_DIRECT)
      await prisma.booking.update({
        where: { id: booking.id },
        data: { source: 'PUBLIC_SALE_PAGE' as Prisma.EnumBookingSourceFieldUpdateOperationsInput['set'] },
      })

      return { ok: true, bookingId: booking.id, total: finalTotal, originalTotal: nightTotal }
    }),
})
