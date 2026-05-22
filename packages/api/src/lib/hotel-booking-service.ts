import { TRPCError } from '@trpc/server'
import { prisma, type Prisma } from '@pms/db'
import { eachNight, getReservedCounts, ymd } from './hotel-availability'
import { generateHotelBookingCode } from './code-gen'

export interface HotelBookingLineInput {
  roomTypeId: string
  roomsReserved: number
}

export interface CreateHotelBookingInput {
  hotelId: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  guestCount: number
  checkin: Date // expected midnight UTC
  checkout: Date
  lines: HotelBookingLineInput[]
  source?: 'OWNER_DIRECT' | 'PUBLIC_SALE_PAGE' | 'EXTERNAL_ICAL'
  publicNote?: string
  internalNote?: string
}

/**
 * HotelBookingService — transactional create / confirm / cancel for hotel bookings.
 *
 * Concurrency: `create` re-queries reserved counts INSIDE the transaction so two
 * concurrent attempts on the last room will both attempt insert, but only one
 * will commit before the other re-reads — at REPEATABLE READ (MySQL default),
 * the second tx sees the first's row only after commit; in practice this is safe
 * for low-medium traffic. For very high concurrency, switch to SERIALIZABLE
 * isolation or pre-allocated daily inventory rows with SELECT ... FOR UPDATE.
 */
export class HotelBookingService {
  /** Create a new booking in PENDING status. Throws CONFLICT on overbook. */
  static async create(input: CreateHotelBookingInput) {
    if (input.checkout <= input.checkin) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'วันออกต้องหลังวันเข้า' })
    }
    if (input.lines.length === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'ต้องมีอย่างน้อย 1 ห้อง' })
    }
    if (input.lines.some((l) => l.roomsReserved <= 0)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'จำนวนห้องต้องมากกว่า 0' })
    }
    // Deduplicate by roomTypeId — caller should aggregate, but we defend
    const seen = new Set<string>()
    for (const l of input.lines) {
      if (seen.has(l.roomTypeId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'มี roomTypeId ซ้ำใน lines — รวมก่อนส่ง',
        })
      }
      seen.add(l.roomTypeId)
    }

    const nights = Math.round(
      (input.checkout.getTime() - input.checkin.getTime()) / 86_400_000,
    )

    return prisma.$transaction(async (tx) => {
      // 1. Load all requested room types (filter by hotelId + isActive to avoid spoof)
      const roomTypes = await tx.roomType.findMany({
        where: {
          id: { in: input.lines.map((l) => l.roomTypeId) },
          hotelId: input.hotelId,
          isActive: true,
        },
      })
      if (roomTypes.length !== input.lines.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'พบ room type ไม่ถูกต้อง หรือไม่ได้อยู่ในโรงแรมนี้ หรือถูกปิด',
        })
      }
      const rtMap = new Map(roomTypes.map((r) => [r.id, r]))

      // 2. Per-line availability check (re-queried INSIDE tx for race protection)
      const linesData: {
        roomTypeId: string
        roomsReserved: number
        pricePerNight: Prisma.Decimal
        lineSubtotal: Prisma.Decimal
      }[] = []

      for (const line of input.lines) {
        const rt = rtMap.get(line.roomTypeId)!
        const reserved = await getReservedCounts(
          tx,
          line.roomTypeId,
          input.checkin,
          input.checkout,
        )

        for (const night of eachNight(input.checkin, input.checkout)) {
          const used = reserved.get(ymd(night)) ?? 0
          const available = rt.totalInventory - used
          if (line.roomsReserved > available) {
            const name = (rt.name as { th?: string })?.th ?? rt.id
            throw new TRPCError({
              code: 'CONFLICT',
              message: `${name} คืน ${ymd(night)} เหลือ ${available} ห้อง (ขอ ${line.roomsReserved})`,
            })
          }
        }

        const subtotal = Number(rt.pricePerNight) * line.roomsReserved * nights
        linesData.push({
          roomTypeId: line.roomTypeId,
          roomsReserved: line.roomsReserved,
          pricePerNight: rt.pricePerNight,
          lineSubtotal: new (rt.pricePerNight.constructor as new (v: number) => Prisma.Decimal)(
            subtotal,
          ),
        })
      }

      const totalAmount = linesData.reduce((s, l) => s + Number(l.lineSubtotal), 0)

      // 3. Insert booking + lines
      const booking = await tx.hotelBooking.create({
        data: {
          code: await generateHotelBookingCode(),
          hotelId: input.hotelId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
          guestCount: input.guestCount,
          checkin: input.checkin,
          checkout: input.checkout,
          totalAmount,
          status: 'PENDING',
          source: input.source ?? 'OWNER_DIRECT',
          publicNote: input.publicNote,
          internalNote: input.internalNote,
          lines: { create: linesData },
        },
        include: { lines: { include: { roomType: true } } },
      })

      return booking
    })
  }

  /** Manual confirm: PENDING → CONFIRMED */
  static async confirm(bookingId: string) {
    const b = await prisma.hotelBooking.findUnique({ where: { id: bookingId } })
    if (!b) throw new TRPCError({ code: 'NOT_FOUND' })
    if (b.status !== 'PENDING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `confirm ได้เฉพาะสถานะ PENDING (ปัจจุบัน ${b.status})`,
      })
    }
    return prisma.hotelBooking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    })
  }

  /** Cancel: PENDING|CONFIRMED → CANCELLED (releases inventory automatically). */
  static async cancel(bookingId: string, reason?: string) {
    const b = await prisma.hotelBooking.findUnique({ where: { id: bookingId } })
    if (!b) throw new TRPCError({ code: 'NOT_FOUND' })
    if (b.status === 'CANCELLED' || b.status === 'COMPLETED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `ยกเลิกไม่ได้ในสถานะ ${b.status}`,
      })
    }
    return prisma.hotelBooking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        internalNote: reason
          ? `${b.internalNote ?? ''}\n[CANCELLED ${new Date().toISOString()}] ${reason}`.trim()
          : b.internalNote,
      },
    })
  }
}
