import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { prisma, Prisma } from '@pms/db'
import { router, ownerProcedure } from '../trpc'
import {
  propertyLocationSchema,
  propertyPolicySchema,
  propertyIcalSchema,
  propertyPoolSchema,
} from '../schemas/property-extras'

async function assertOwn(propertyId: string, ownerId: string) {
  const p = await prisma.property.findFirst({
    where: { id: propertyId, ownerId, deletedAt: null },
    select: { id: true },
  })
  if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'ไม่พบที่พัก' })
}

const localizedJson = (th: string) => ({ th, en: '', zh: '' }) as Prisma.InputJsonValue

/** "14:00:00" / "14:00" → "14:00". Returns undefined for invalid input. */
function normalizeTime(s: string): string | undefined {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!m) return undefined
  const h = Math.min(23, Math.max(0, Number(m[1])))
  const mi = Math.min(59, Math.max(0, Number(m[2])))
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

/** Combine an HH + MM (+ optional am/pm) into a 24-hour "HH:MM" string. */
function formatHM(h: string | undefined, mm: string | undefined, ampm?: string): string | undefined {
  if (!h || !mm) return undefined
  let hour = Number(h)
  const minute = Number(mm)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return undefined
  if (ampm) {
    const ap = ampm.toLowerCase()
    if (ap === 'pm' && hour < 12) hour += 12
    if (ap === 'am' && hour === 12) hour = 0
  }
  if (hour > 23 || minute > 59) return undefined
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export const propertyExtrasRouter = router({
  // ─── Location ─────────────────────────────────────────────
  upsertLocation: ownerProcedure.input(propertyLocationSchema).mutation(async ({ ctx, input }) => {
    await assertOwn(input.propertyId, ctx.ownerId)
    return prisma.propertyLocation.upsert({
      where: { propertyId: input.propertyId },
      create: {
        propertyId: input.propertyId,
        locationId: input.locationId,
        zoneId: input.zoneId ?? null,
        province: input.province,
        lat: input.lat,
        lng: input.lng,
        gmapUrl: input.gmapUrl ?? null,
        address: input.address,
        distanceTargetType: input.distanceTargetType ?? null,
        distanceValue: input.distanceValue ?? null,
        distanceUnit: input.distanceUnit ?? null,
      },
      update: {
        locationId: input.locationId,
        zoneId: input.zoneId ?? null,
        province: input.province,
        lat: input.lat,
        lng: input.lng,
        gmapUrl: input.gmapUrl ?? null,
        address: input.address,
        distanceTargetType: input.distanceTargetType ?? null,
        distanceValue: input.distanceValue ?? null,
        distanceUnit: input.distanceUnit ?? null,
      },
    })
  }),

  // ─── Policy ───────────────────────────────────────────────
  upsertPolicy: ownerProcedure.input(propertyPolicySchema).mutation(async ({ ctx, input }) => {
    await assertOwn(input.propertyId, ctx.ownerId)
    const data = {
      checkinStart: input.checkinStart,
      checkinEnd: input.checkinEnd ?? null,
      checkout: input.checkout,
      deposit: input.deposit as unknown as Prisma.Decimal,
      cancellationPolicy: localizedJson(input.cancellationPolicyTh),
      postponePolicy: localizedJson(input.postponePolicyTh),
      houseRules: input.houseRulesTh ? localizedJson(input.houseRulesTh) : Prisma.JsonNull,
      maxGuests: input.maxGuests,
      extraAdultPrice: input.extraAdultPrice as unknown as Prisma.Decimal,
      freeChildAgeUnder7: input.freeChildAgeUnder7,
      extraChildPrice: input.extraChildPrice as unknown as Prisma.Decimal,
      freeInfantAgeUnder2: input.freeInfantAgeUnder2,
      maxPets: input.maxPets,
      extraPetPrice: input.extraPetPrice as unknown as Prisma.Decimal,
    }
    return prisma.propertyPolicy.upsert({
      where: { propertyId: input.propertyId },
      create: { propertyId: input.propertyId, ...data },
      update: data,
    })
  }),

  // ─── iCal sync ────────────────────────────────────────────
  upsertIcal: ownerProcedure.input(propertyIcalSchema).mutation(async ({ ctx, input }) => {
    await assertOwn(input.propertyId, ctx.ownerId)
    if (!input.icalUrl) {
      // empty url = delete
      return prisma.propertyIcal.deleteMany({
        where: { propertyId: input.propertyId, platform: input.platform },
      })
    }
    return prisma.propertyIcal.upsert({
      where: { propertyId_platform: { propertyId: input.propertyId, platform: input.platform } },
      create: {
        propertyId: input.propertyId,
        platform: input.platform,
        icalUrl: input.icalUrl,
      },
      update: { icalUrl: input.icalUrl },
    })
  }),

  // ─── Amenities ────────────────────────────────────────────
  setAmenities: ownerProcedure
    .input(z.object({ propertyId: z.string(), amenityMasterIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await assertOwn(input.propertyId, ctx.ownerId)
      await prisma.$transaction([
        prisma.propertyAmenity.deleteMany({ where: { propertyId: input.propertyId } }),
        ...input.amenityMasterIds.map((amenityMasterId) =>
          prisma.propertyAmenity.create({
            data: { propertyId: input.propertyId, amenityMasterId },
          }),
        ),
      ])
      return { ok: true, count: input.amenityMasterIds.length }
    }),

  // ─── Pool ─────────────────────────────────────────────────
  upsertPool: ownerProcedure
    .input(propertyPoolSchema.extend({ id: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwn(input.propertyId, ctx.ownerId)
      const data = {
        ownership: input.ownership,
        system: input.system,
        widthM: input.widthM ?? null,
        lengthM: input.lengthM ?? null,
        depthM: input.depthM ?? null,
        features: input.features as unknown as Prisma.InputJsonValue,
      }
      if (input.id) {
        return prisma.propertyPool.update({ where: { id: input.id }, data })
      }
      return prisma.propertyPool.create({
        data: { propertyId: input.propertyId, ...data },
      })
    }),

  deletePool: ownerProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const pool = await prisma.propertyPool.findFirst({
      where: { id: input.id, property: { ownerId: ctx.ownerId, deletedAt: null } },
    })
    if (!pool) throw new TRPCError({ code: 'NOT_FOUND' })
    return prisma.propertyPool.delete({ where: { id: input.id } })
  }),

  // ─── Amenity master (read-only on owner side) ────────────
  amenityMaster: ownerProcedure.query(() =>
    prisma.amenityMaster.findMany({ orderBy: [{ category: 'asc' }, { nameTh: 'asc' }] }),
  ),

  // ─── Images ───────────────────────────────────────────────
  addImage: ownerProcedure
    .input(
      z.object({
        propertyId: z.string(),
        url: z.string().min(1),
        type: z.enum(['cover', 'gallery', 'tour']),
        category: z
          .enum(['pool', 'bedroom', 'bathroom', 'living', 'kitchen', 'rooftop', 'outdoor'])
          .nullable()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwn(input.propertyId, ctx.ownerId)
      // If adding a cover, demote any existing cover to gallery
      if (input.type === 'cover') {
        await prisma.propertyImage.updateMany({
          where: { propertyId: input.propertyId, type: 'cover' },
          data: { type: 'gallery' },
        })
      }
      const count = await prisma.propertyImage.count({
        where: { propertyId: input.propertyId, type: input.type, category: input.category ?? null },
      })
      return prisma.propertyImage.create({
        data: {
          propertyId: input.propertyId,
          url: input.url,
          type: input.type,
          category: input.category ?? null,
          sortOrder: count,
        },
      })
    }),

  deleteImage: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const img = await prisma.propertyImage.findFirst({
        where: { id: input.id, property: { ownerId: ctx.ownerId, deletedAt: null } },
      })
      if (!img) throw new TRPCError({ code: 'NOT_FOUND' })
      return prisma.propertyImage.delete({ where: { id: input.id } })
    }),

  setCover: ownerProcedure
    .input(z.object({ imageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const img = await prisma.propertyImage.findFirst({
        where: { id: input.imageId, property: { ownerId: ctx.ownerId, deletedAt: null } },
      })
      if (!img) throw new TRPCError({ code: 'NOT_FOUND' })
      await prisma.$transaction([
        prisma.propertyImage.updateMany({
          where: { propertyId: img.propertyId, type: 'cover' },
          data: { type: 'gallery' },
        }),
        prisma.propertyImage.update({
          where: { id: input.imageId },
          data: { type: 'cover', category: null },
        }),
      ])
      return { ok: true }
    }),

  setTour360Url: ownerProcedure
    .input(z.object({ propertyId: z.string(), url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwn(input.propertyId, ctx.ownerId)
      // 1 single 3D record per property — upsert by deleting existing first
      await prisma.propertyImage.deleteMany({
        where: { propertyId: input.propertyId, type: 'tour_360' },
      })
      if (!input.url) return { ok: true }
      return prisma.propertyImage.create({
        data: {
          propertyId: input.propertyId,
          url: input.url,
          type: 'tour_360',
          sortOrder: 0,
        },
      })
    }),

  /**
   * Resolve a Google Maps URL (including shortlinks like maps.app.goo.gl/* or goo.gl/maps/*)
   * to its lat/lng coordinates. Browsers can't follow these redirects due to CORS, so this
   * runs server-side: fetch the URL, follow redirects, then regex-match coordinates from
   * the resolved URL and HTML body.
   */
  resolveGmapCoords: ownerProcedure
    .input(z.object({ url: z.string().url('ลิงก์ไม่ถูกต้อง') }))
    .mutation(async ({ input }) => {
      const tryExtract = (s: string): { lat: number; lng: number } | null => {
        // @lat,lng (most common in /maps URLs)
        let m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
        // ?q=lat,lng or &q=lat,lng
        if (!m) m = s.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
        // ?ll=lat,lng
        if (!m) m = s.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
        // ?query=lat,lng (Google Maps API URLs)
        if (!m) m = s.match(/[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/)
        // !3d{lat}!4d{lng} (place URL embedded coords)
        if (!m) {
          const lat3 = s.match(/!3d(-?\d+\.\d+)/)
          const lng4 = s.match(/!4d(-?\d+\.\d+)/)
          if (lat3 && lng4) {
            return { lat: Number(lat3[1]), lng: Number(lng4[1]) }
          }
        }
        if (m) return { lat: Number(m[1]), lng: Number(m[2]) }
        return null
      }

      // First try the input URL directly (in case it already contains coords)
      const direct = tryExtract(input.url)
      if (direct) return { ...direct, source: 'url' as const }

      // Otherwise fetch and inspect the final URL + body (server-side, no CORS)
      try {
        const res = await fetch(input.url, {
          redirect: 'follow',
          headers: {
            // Regular user-agent so Google returns the canonical /maps URL with @coords
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9,th;q=0.8',
          },
        })
        // Inspect both the final redirected URL and the page HTML — coords often live in one or the other
        const fromFinalUrl = tryExtract(res.url)
        if (fromFinalUrl) return { ...fromFinalUrl, source: 'redirect' as const }

        const body = await res.text()
        const fromBody = tryExtract(body)
        if (fromBody) return { ...fromBody, source: 'body' as const }

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'ไม่พบพิกัดในลิงก์ — ลองคัดลอกลิงก์เต็มจาก Google Maps อีกครั้ง',
        })
      } catch (err) {
        if (err instanceof TRPCError) throw err
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'ดึงลิงก์ไม่สำเร็จ — ตรวจสอบ URL หรือลองใหม่อีกครั้ง',
        })
      }
    }),

  /**
   * Scrape a listing URL (Airbnb / Vrbo / TripAdvisor / Booking.com / etc.) and return
   * structured property data: name, description, image URLs, bedroom/bathroom/guest counts.
   *
   * Strategy:
   *   1. Fetch the page server-side (no CORS) with a real-browser User-Agent
   *   2. Extract from <meta property="og:..."> tags (always present on these sites)
   *   3. Extract from JSON-LD blocks if present (Booking.com, some Airbnb pages)
   *   4. Best-effort regex for "N bedrooms", "N bathrooms", "N guests" in the HTML
   *
   * Note: Not all sites expose all fields reliably — this is best-effort and the owner
   * always reviews/edits in the form before saving.
   */
  scrapeListingUrl: ownerProcedure
    .input(z.object({ url: z.string().url('ลิงก์ไม่ถูกต้อง') }))
    .mutation(async ({ input }) => {
      try {
        const res = await fetch(input.url, {
          redirect: 'follow',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9,th;q=0.8',
          },
        })
        const html = await res.text()

        // ── OpenGraph metadata (universally supported) ──
        const meta = (prop: string) => {
          const m = html.match(
            new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
          ) ?? html.match(
            new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'),
          )
          return m?.[1]?.trim()
        }
        const ogTitle = meta('og:title')
        const ogDesc = meta('og:description')
        const ogImage = meta('og:image')

        // Collect ALL og:image / og:image:url tags for an image gallery
        const imageRegex =
          /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/gi
        const images: string[] = []
        let m: RegExpExecArray | null
        while ((m = imageRegex.exec(html))) {
          if (m[1] && !images.includes(m[1])) images.push(m[1])
        }
        if (ogImage && !images.includes(ogImage)) images.unshift(ogImage)

        // ── JSON-LD (Booking.com et al. expose LodgingBusiness / HotelRoom schema) ──
        let bedrooms: number | undefined
        let bathrooms: number | undefined
        let guests: number | undefined
        let checkinTime: string | undefined
        let checkoutTime: string | undefined
        const ldRegex =
          /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
        let ld: RegExpExecArray | null
        while ((ld = ldRegex.exec(html))) {
          try {
            const json = JSON.parse(ld[1]!)
            const blocks: unknown[] = Array.isArray(json) ? json : [json]
            for (const blk of blocks) {
              if (!blk || typeof blk !== 'object') continue
              const b = blk as Record<string, unknown>
              const nr = b.numberOfRooms
              if (typeof nr === 'number' && !bedrooms) bedrooms = nr
              const occ = b.occupancy as { value?: number } | undefined
              if (occ?.value && !guests) guests = occ.value
              // Schema.org LodgingBusiness exposes checkinTime / checkoutTime as
              // ISO time strings (e.g. "14:00:00"). Normalize to "HH:MM".
              const ci = b.checkinTime
              if (typeof ci === 'string' && !checkinTime) checkinTime = normalizeTime(ci)
              const co = b.checkoutTime
              if (typeof co === 'string' && !checkoutTime) checkoutTime = normalizeTime(co)
              const amen = b.amenityFeature as Array<{ name?: string; value?: unknown }> | undefined
              if (Array.isArray(amen)) {
                for (const a of amen) {
                  const name = (a.name ?? '').toString().toLowerCase()
                  const val = Number(a.value) || 0
                  if (val && /bedroom/.test(name) && !bedrooms) bedrooms = val
                  if (val && /bath/.test(name) && !bathrooms) bathrooms = val
                  if (val && /(guest|sleeps?|occup)/.test(name) && !guests) guests = val
                }
              }
            }
          } catch {
            /* malformed JSON-LD — ignore */
          }
        }

        // ── Best-effort regex fallback for plain HTML phrases ──
        const num = (s: string | undefined) =>
          s ? Number(s.replace(/[^\d]/g, '')) || undefined : undefined

        if (!bedrooms) {
          // "3 bedrooms" / "3 ห้องนอน" / "ห้องนอน 3"
          const re =
            html.match(/(\d+)\s*bedrooms?/i) ??
            html.match(/(\d+)\s*ห้องนอน/) ??
            html.match(/ห้องนอน\s*(\d+)/)
          bedrooms = num(re?.[1])
        }
        if (!bathrooms) {
          const re =
            html.match(/(\d+)\s*bathrooms?/i) ??
            html.match(/(\d+)\s*ห้องน้ำ/) ??
            html.match(/ห้องน้ำ\s*(\d+)/)
          bathrooms = num(re?.[1])
        }
        if (!guests) {
          const re =
            html.match(/(\d+)\s*guests?/i) ??
            html.match(/sleeps?\s*(\d+)/i) ??
            html.match(/(\d+)\s*ท่าน/) ??
            html.match(/(\d+)\s*คน/)
          guests = num(re?.[1])
        }
        // Check-in / check-out time regex fallback — many sites print these as plain text
        // Patterns covered: "Check-in: 2:00 PM", "Check-in from 14:00", "เช็คอิน 14:00"
        if (!checkinTime) {
          const re =
            html.match(/check[-\s]?in[^0-9]{0,30}(\d{1,2})[:.](\d{2})\s*(am|pm)?/i) ??
            html.match(/เช็คอิน[^0-9]{0,15}(\d{1,2})[:.](\d{2})/) ??
            html.match(/รับห้อง[^0-9]{0,15}(\d{1,2})[:.](\d{2})/)
          if (re) checkinTime = formatHM(re[1], re[2], re[3])
        }
        if (!checkoutTime) {
          const re =
            html.match(/check[-\s]?out[^0-9]{0,30}(\d{1,2})[:.](\d{2})\s*(am|pm)?/i) ??
            html.match(/เช็คเอาท?์?[^0-9]{0,15}(\d{1,2})[:.](\d{2})/) ??
            html.match(/คืนห้อง[^0-9]{0,15}(\d{1,2})[:.](\d{2})/)
          if (re) checkoutTime = formatHM(re[1], re[2], re[3])
        }

        if (!ogTitle && !ogImage && images.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'ดึงข้อมูลไม่ได้ — เว็บไซต์ปลายทางอาจบล็อกการเข้าถึง',
          })
        }

        return {
          name: ogTitle ?? null,
          description: ogDesc ?? null,
          images: images.slice(0, 20), // cap to avoid bloat
          bedrooms: bedrooms ?? null,
          bathrooms: bathrooms ?? null,
          maxGuests: guests ?? null,
          checkinTime: checkinTime ?? null,
          checkoutTime: checkoutTime ?? null,
          source: new URL(res.url).hostname,
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'ดึงข้อมูลไม่สำเร็จ — ตรวจสอบลิงก์หรือลองใหม่อีกครั้ง',
        })
      }
    }),
})
