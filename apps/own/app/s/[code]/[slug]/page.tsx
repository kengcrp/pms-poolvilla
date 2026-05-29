'use client'

/**
 * Single property detail page.
 *
 * URL: /s/[code]/[slug]  (code = owner saleSlug, slug = property code)
 *
 * Pulls REAL data via trpc.public.propertyByCode and maps to the same UI
 * components. Falls back to mock when slug doesn't match any property (e.g.
 * /s/demo/sunrise-pool-villa where 'demo' isn't a real saleSlug).
 *
 * Layout: photo gallery → 2-col body (info left + sticky booking sidebar
 * right) → map → nearby → amenities → specs → rules → payment → footer.
 */

import { use } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '@pms/ui'
import { trpc } from '@/lib/trpc'
import { BookingCard } from './BookingCard'
import { BookingProvider } from './BookingContext'
import { InlineCalendar } from './InlineCalendar'

/** Amenity code → Icon name (reused from listings edit page) */
const AMENITY_ICONS: Record<string, IconName> = {
  wifi: 'wifi', tv: 'tv', kitchen: 'kitchen', washer: 'shirt', dryer: 'wind',
  parking: 'parking', ac: 'ac', workspace: 'briefcase', shower: 'shower',
  karaoke: 'microphone', smart_tv: 'tv', pool: 'swimmer', hot_tub: 'hotTub',
  yard: 'tree', bbq: 'fire', outdoor_dining: 'glassWater', fire_pit: 'fire',
  pool_table: 'pingPong', table_tennis: 'pingPong', snooker: 'pingPong',
  foosball: 'ball', arcade: 'gamepad', fireplace: 'fire', piano: 'music',
  gym: 'dumbbell', sauna: 'spa', lake_access: 'water', beach_access: 'beach',
  waterfall_access: 'water', river_access: 'water', pet_friendly: 'pet',
  smoke_alarm: 'alert', co_alarm: 'alert', fire_ext: 'fireExt',
  first_aid: 'shelter', security_camera: 'eye', lock: 'lock',
}

function iconForAmenity(code: string): IconName {
  return AMENITY_ICONS[code] ?? 'gear'
}

// ─── Mock property ─────────────────────────────────────────────────────

interface MockProperty {
  slug: string
  code: string
  name: string
  location: string
  bedrooms: number
  bathrooms: number
  maxGuests: number
  pricePerNight: number
  hero: string
  gallery: string[]
  description: string
  bedConfig: string[]
  amenities: { code: string; label: string; icon: 'wifi' | 'tv' | 'kitchen' | 'parking' | 'ac' | 'swimmer' | 'spa' | 'gear' }[]
  nearby: string[]
  specs: string[]
  bookingHistory: { icon: 'card' | 'cash'; label: string }[]
  rules: string[]
  /** Whether the property has split-room variants (controls guest-chip UI in booking card) */
  splitRoom: boolean
}

const MOCK: Record<string, MockProperty> = {
  'sunrise-pool-villa': {
    slug: 'sunrise-pool-villa',
    code: 'CITY-018',
    name: 'The Sunrise Pool Villa',
    location: 'หัวหิน · จังหวัดประจวบฯ',
    bedrooms: 3,
    bathrooms: 3,
    maxGuests: 8,
    pricePerNight: 24000,
    hero: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80',
      'https://images.unsplash.com/photo-1571508601891-ca5e7a713859?w=800&q=80',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
    ],
    description: 'พูลวิลล่าหรูริมหาด พร้อมสระว่ายน้ำส่วนตัว วิวทะเลพานอราม่า',
    bedConfig: [
      'ห้องนอน 1: เตียง King 1 หลัง',
      'ห้องนอน 2: เตียง Queen 2 หลัง',
      'ห้องนอน 3: เตียง Twin 2 หลัง',
    ],
    amenities: [
      { code: 'wifi', label: 'Wi-Fi', icon: 'wifi' },
      { code: 'tv', label: 'Smart TV', icon: 'tv' },
      { code: 'kitchen', label: 'ห้องครัว', icon: 'kitchen' },
      { code: 'parking', label: 'ที่จอดรถฟรี', icon: 'parking' },
      { code: 'ac', label: 'เครื่องปรับอากาศ', icon: 'ac' },
      { code: 'pool', label: 'สระว่ายน้ำส่วนตัว', icon: 'swimmer' },
    ],
    nearby: [
      'หาดทรายแก้ว 1.5 กม.',
      'พระธาตุพนม 3 กม.',
      'โรงแรมหัวหิน 2 กม.',
      'ตลาดหัวหิน 4 กม.',
      'สนามบินหัวหิน 12 กม.',
      'น้ำพุร้อน 8 กม.',
    ],
    specs: [
      'บ้านพัก 3 ห้องนอน 3 ห้องน้ำ 2 แอร์',
      'เตาแก๊ส ตู้เย็น',
      'ทีวี + Wi-Fi',
      'จอดรถได้สูงสุด 3 คัน',
    ],
    bookingHistory: [
      { icon: 'card', label: 'บัตรเครดิตทุกประเภท' },
      { icon: 'cash', label: 'บัตรเดบิตทุกบัตร' },
    ],
    rules: [
      'เช็คอิน 14:00 น. – 15:30 น.',
      'เช็คเอาท์ 11:00 น.',
      'ห้องนอน 1 มี ห้องน้ำในตัว มีระเบียงส่วนตัวจัดให้พักผ่อน',
      'ห้องนั่งเล่น 1 ห้อง พร้อมสนามการพักผ่อน',
    ],
    splitRoom: false,
  },
  'sunset-pool-villa': {
    slug: 'sunset-pool-villa',
    code: 'CITY-019',
    name: 'The Sunset Pool Villa',
    location: 'หัวหิน · จังหวัดประจวบฯ',
    bedrooms: 4,
    bathrooms: 4,
    maxGuests: 10,
    pricePerNight: 24000,
    hero: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1571508601891-ca5e7a713859?w=800&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    ],
    description:
      'พูลวิลล่าสไตล์โมเดิร์น 4 ห้องนอน วิวพระอาทิตย์ตก สระว่ายน้ำส่วนตัว ขนาดใหญ่',
    bedConfig: [
      'ห้องนอนใหญ่: เตียง King 1 หลัง + วิวสระ',
      'ห้องนอน 2: เตียง Queen 2 หลัง',
      'ห้องนอน 3: เตียง Twin 4 หลัง',
      'ห้องนอน 4: เตียง Single 2 หลัง',
    ],
    amenities: [
      { code: 'wifi', label: 'Wi-Fi ทุกห้อง', icon: 'wifi' },
      { code: 'tv', label: 'Smart TV 4K', icon: 'tv' },
      { code: 'kitchen', label: 'ห้องครัวเต็มรูปแบบ', icon: 'kitchen' },
      { code: 'parking', label: 'ที่จอดรถ 4 คัน', icon: 'parking' },
      { code: 'ac', label: 'แอร์ทุกห้อง', icon: 'ac' },
      { code: 'pool', label: 'สระว่ายน้ำส่วนตัว ขนาด 12x6m', icon: 'swimmer' },
      { code: 'spa', label: 'จากุซซี่', icon: 'spa' },
    ],
    nearby: [
      'หาดเขาตะเกียบ 0.8 กม.',
      'ตลาด Cicada 2.5 กม.',
      'สวนน้ำวานานาวา 5 กม.',
      'ห้างมาร์เก็ตวิลเลจ 3.5 กม.',
      'สนามกอล์ฟ Black Mountain 8 กม.',
      'สนามบินหัวหิน 14 กม.',
    ],
    specs: [
      'บ้านพัก 4 ห้องนอน 4 ห้องน้ำ 5 แอร์',
      'ครัวเต็มรูปแบบ + เตาอบ',
      'Smart TV 4K + Netflix + Wi-Fi',
      'จอดรถได้สูงสุด 4 คัน',
      'เครื่องซักผ้า + เครื่องอบผ้า',
    ],
    bookingHistory: [
      { icon: 'card', label: 'บัตรเครดิตทุกประเภท' },
      { icon: 'cash', label: 'โอนเงินผ่านธนาคาร' },
    ],
    rules: [
      'เช็คอิน 15:00 น. – 18:00 น.',
      'เช็คเอาท์ 11:00 น.',
      'อนุญาตให้สูบบุหรี่เฉพาะนอกตัวบ้าน',
      'ไม่อนุญาตให้นำสัตว์เลี้ยงเข้าพัก',
      'งดเสียงดังหลัง 22:00 น.',
    ],
    splitRoom: true,
  },
}

// fallback for any other slug
const FALLBACK = MOCK['sunrise-pool-villa']!

const MOCK_BANK = {
  name: 'นายตัวอย่าง รับเงิน',
  number: '123-4-56789-0',
  bank: 'ธนาคารกรุงเทพ',
}

// ─── Page ──────────────────────────────────────────────────────────────

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ code: string; slug: string }>
}) {
  const { code, slug } = use(params)

  // Fetch REAL property (slug=property code, code=owner saleSlug — note that
  // URL order is /s/{ownerSlug}/{propertyCode} so we pass them as such).
  const real = trpc.public.propertyByCode.useQuery(
    { slug: code, code: slug },
    { retry: false, refetchOnWindowFocus: false, throwOnError: false },
  )

  // Map real property → display shape (same as MockProperty) when found.
  const realProperty: MockProperty | null = real.data
    ? {
        slug: real.data.code,
        code: real.data.code,
        name: (real.data.name as { th?: string })?.th ?? real.data.code,
        location:
          [real.data.location?.location?.name, real.data.location?.province]
            .filter(Boolean)
            .join(' · ') || '',
        bedrooms: real.data.totalBedrooms,
        bathrooms: real.data.totalBathrooms,
        maxGuests: real.data.variants[0]?.maxGuests ?? 0,
        pricePerNight: Number(real.data.variants[0]?.weeklyPricing?.[0]?.price ?? 0) || 0,
        hero:
          real.data.images.find((i) => i.type === 'cover')?.url ??
          real.data.images[0]?.url ??
          FALLBACK.hero,
        gallery: real.data.images.map((i) => i.url),
        description: '',
        bedConfig: real.data.variants
          .filter((v) => v.isDefault)
          .map((v) => {
            const vname = (v.name as { th?: string })?.th ?? `${v.bedrooms} ห้องนอน`
            return `${vname} (รับสูงสุด ${v.maxGuests} ท่าน)`
          }),
        amenities: real.data.amenities.map((a) => ({
          code: a.amenity.code,
          label: a.amenity.nameTh,
          icon: iconForAmenity(a.amenity.code) as MockProperty['amenities'][number]['icon'],
        })),
        nearby: real.data.landmarks
          .map((l) => ((l.text as { th?: string } | null)?.th ?? ''))
          .filter(Boolean),
        specs: [
          `บ้านพัก ${real.data.totalBedrooms} ห้องนอน ${real.data.totalBathrooms} ห้องน้ำ`,
          ...real.data.extraDetails
            .map((d) => ((d.text as { th?: string } | null)?.th ?? ''))
            .filter(Boolean),
        ],
        bookingHistory: [
          { icon: 'card', label: 'บัตรเครดิตทุกประเภท' },
          { icon: 'cash', label: 'โอนเงินผ่านธนาคาร' },
        ],
        rules: real.data.policy
          ? [
              `เช็คอิน ${real.data.policy.checkinStart}${real.data.policy.checkinEnd ? ` – ${real.data.policy.checkinEnd}` : ''} น.`,
              `เช็คเอาท์ ${real.data.policy.checkout} น.`,
              ...((real.data.policy.houseRules as { th?: string } | null)?.th
                ? [(real.data.policy.houseRules as { th: string }).th]
                : []),
            ]
          : [],
        splitRoom: real.data.variants.filter((v) => !v.isDefault).length > 0,
      }
    : null

  // Use real data if found, else fallback to mock for demo URLs
  const property: MockProperty = realProperty ?? MOCK[slug] ?? FALLBACK

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900">
      <DetailHeader code={code} />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-4">
        <PropertyHeading property={property} />
        <PhotoGallery
          hero={property.hero}
          gallery={property.gallery}
          photosHref={`/s/${code}/${slug}/photos`}
        />

        {/* Single 2-col grid wraps EVERYTHING below the gallery so all left-side
            cards (top + bottom sections) share the same width — matching the
            "บ้านพัก / สิ่งอำนวยความสะดวก / ปฏิทิน" blocks. The booking sidebar
            stays sticky on the right while the user scrolls through them.
            BookingProvider lets the inline calendar mutate the same checkin/
            checkout fields the sidebar reads from. */}
        <BookingProvider>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* LEFT — all info blocks stacked, same width */}
          <div className="space-y-4">
            <InfoBlock title="บ้านพัก" items={property.bedConfig} />
            <AmenityBlock title="จุดเด่น" amenities={property.amenities} />
            <VideoReviewsSection thumbnails={property.gallery.slice(0, 4)} />
            <InlineCalendar />
            <MapSection />
            <SectionList title="สถานที่ใกล้เคียง" items={property.nearby} />
            <AmenityBlock title="สิ่งอำนวยความสะดวก" amenities={property.amenities} />
            <SectionList title="ข้อมูลที่พัก" items={property.specs} />
            <BookingHistorySection items={property.bookingHistory} />
            <SectionList title="นโยบายที่พัก" items={property.rules} />
          </div>

          {/* RIGHT — sticky booking sidebar (follows on scroll).
              top-[4.5rem] = 72px clears the sticky header (h-14 = 56px) + 16px gap.
              max-h + overflow-y-auto so very tall content (calendar popup) can
              scroll internally instead of getting clipped off the viewport. */}
          <aside className="hidden lg:sticky lg:top-[4.5rem] lg:block lg:max-h-[calc(100vh-5rem)] lg:self-start lg:overflow-y-auto">
            <BookingCard
              pricePerNight={property.pricePerNight}
              splitRoom={property.splitRoom}
            />
          </aside>
        </div>
        </BookingProvider>
      </main>

      {/* Payment channels — full-width block spanning entire page (outside the
          2-col grid) so it reads as a major shop-level footer section, not a
          per-property detail like the blocks above. */}
      <PaymentChannelsSection bankAccount={MOCK_BANK} />

      {/* Mobile bottom-bar — compact CTA always visible at bottom of viewport
          on mobile/tablet, since the desktop right-column sidebar is hidden. */}
      <MobileBookingBar pricePerNight={property.pricePerNight} />
      <DetailFooter />
    </div>
  )
}

// ─── Header ────────────────────────────────────────────────────────────

function DetailHeader({ code }: { code: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href={`/s/${code}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand-700"
        >
          <Icon name="chevronLeft" className="size-4" />
          กลับ
        </Link>
        <div className="size-7 rounded-full bg-brand-600" aria-hidden />
      </div>
    </header>
  )
}

// ─── Property heading ──────────────────────────────────────────────────

function PropertyHeading({ property }: { property: MockProperty }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{property.name}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
        <span className="inline-flex items-center gap-1">
          <Icon name="pin" className="size-3.5 text-gray-400" />
          {property.location}
        </span>
        <span className="text-gray-300">·</span>
        <span className="inline-flex items-center gap-1">
          <Icon name="bed" className="size-3.5 text-gray-400" />
          {property.bedrooms} ห้องนอน
        </span>
        <span className="text-gray-300">·</span>
        <span className="inline-flex items-center gap-1">
          <Icon name="users" className="size-3.5 text-gray-400" />
          {property.maxGuests} ท่าน
        </span>
      </div>
    </div>
  )
}

// ─── Photo gallery ─────────────────────────────────────────────────────

function PhotoGallery({
  hero,
  gallery,
  photosHref,
}: {
  hero: string
  gallery: string[]
  photosHref: string
}) {
  // Build exactly 5 image slots: hero + first 4 of gallery.
  // Extra photos beyond 5 surface via the "ดูรูปภาพ (N+)" badge.
  const allPhotos = [hero, ...gallery]
  const visible = allPhotos.slice(0, 5)
  const totalCount = allPhotos.length
  const hasMore = totalCount > 5
  const [t1, t2, b1, b2, b3] = visible
  // Top row uses 50/50 split; bottom row 3 equal columns. Using a 6-col grid
  // (3+3 on top, 2+2+2 on bottom) keeps tile widths perfectly symmetrical.
  return (
    <div className="relative">
      <div className="grid grid-cols-6 grid-rows-2 gap-2">
        {/* Top row — 2 images (50/50) */}
        <div className="relative col-span-6 sm:col-span-3 aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 sm:aspect-[16/10]">
          {t1 && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t1} alt="photo-1" className="size-full object-cover" />
              {/* 360 badge anchored to first tile */}
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                360
              </span>
            </>
          )}
        </div>
        <div className="col-span-6 sm:col-span-3 aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 sm:aspect-[16/10]">
          {t2 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t2} alt="photo-2" className="size-full object-cover" />
          )}
        </div>

        {/* Bottom row — 3 images (33/33/33). The LAST tile is wrapped in a
            relative container so the "ดูรูปภาพ" button can be absolutely
            anchored at its bottom-right edge (instead of floating at the
            page level, which mis-aligned when the bottom row was shorter). */}
        {[b1, b2, b3].map((src, i) => {
          const isLast = i === 2
          return (
            <div
              key={i}
              className="relative col-span-2 aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100"
            >
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={`photo-${i + 3}`} className="size-full object-cover" />
              )}
              {isLast && (
                <Link
                  href={photosHref}
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-rose-600 shadow-md transition hover:bg-rose-50"
                >
                  <Icon name="images" className="size-3.5" />
                  ดูรูปภาพ {hasMore ? `(${totalCount - 5}+)` : `(${totalCount})`}
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Generic info block (used in left col) ─────────────────────────────

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-base font-bold text-gray-900">{title}</h3>
      <ul className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
        {items.map((it, i) => (
          <li key={i} className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-brand-600" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Calendar mock section ─────────────────────────────────────────────

function CalendarSection() {
  // Static mock — fake month grid showing the visual
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const weekHeaders = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
  const padStart = 4 // Thursday start (mock)
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 text-base font-bold text-gray-900 sm:text-lg">ปฏิทิน</h3>

      {/* Month label */}
      <div className="mb-3 text-center text-sm font-bold text-gray-900">พฤษภาคม 2568</div>

      {/* Day-of-week header */}
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-gray-500">
        {weekHeaders.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: padStart }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((d) => (
          <div
            key={d}
            className="flex aspect-square items-center justify-center rounded text-xs text-gray-700"
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Video reviews — vertical-thumb carousel block ─────────────────────

function VideoReviewsSection({ thumbnails }: { thumbnails: string[] }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900 sm:text-lg">วิดีโอรีวิว</h3>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-700 hover:underline"
        >
          ดูวิดีโอทั้งหมด
          <Icon name="chevronRight" className="size-3" />
        </button>
      </div>

      {/* Horizontal scroll row of portrait-orientation video cards */}
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {thumbnails.map((src, i) => (
          <button
            key={i}
            type="button"
            className="group relative aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-gray-200 transition-shadow hover:shadow-lg sm:w-36"
            title="เล่นวิดีโอ"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`video-${i + 1}`}
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            {/* Play button — centered */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg backdrop-blur transition-transform group-hover:scale-110">
                {/* Triangle "play" — pure CSS so we don't need a play icon */}
                <span
                  aria-hidden
                  className="ml-1 inline-block border-y-[10px] border-l-[16px] border-y-transparent border-l-gray-900"
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Booking sidebar card lives in ./BookingCard.tsx (client component) ──

// ─── Map section ───────────────────────────────────────────────────────

function MapSection() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 text-base font-bold text-gray-900 sm:text-lg">ตำแหน่งที่ตั้ง</h3>
      <div className="overflow-hidden rounded-xl">
        {/* Static placeholder — replace with Google Maps iframe/embed later.
            Server component: no event handlers, just CSS background + badge. */}
        <div
          className="relative h-56 w-full sm:h-64"
          style={{
            background:
              'linear-gradient(135deg, #eff6ff 0%, #ecfdf5 50%, #f0fdf4 100%)',
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 32px)',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur">
              <Icon name="map" className="size-4 text-brand-600" />
              แผนที่ตัวอย่าง
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section list (2-col bullets) ──────────────────────────────────────

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 text-base font-bold text-gray-900 sm:text-lg">{title}</h3>
      <ul className="grid gap-x-6 gap-y-1.5 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <li key={i} className="inline-flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-600" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Amenity-specific block — each item shows its real icon (Wi-Fi, TV, etc.)
 *  inside a soft brand-tinted square instead of a generic bullet dot. */
function AmenityBlock({
  title,
  amenities,
}: {
  title: string
  amenities: MockProperty['amenities']
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 text-base font-bold text-gray-900 sm:text-lg">{title}</h3>
      <ul className="grid gap-x-6 gap-y-2 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-3">
        {amenities.map((a) => (
          <li key={a.code} className="inline-flex items-center gap-2.5">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Icon name={a.icon} className="size-3.5" />
            </span>
            <span className="text-sm text-gray-800">{a.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Booking history (icons + label) ───────────────────────────────────

function BookingHistorySection({
  items,
}: {
  items: { icon: 'card' | 'cash'; label: string }[]
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 text-base font-bold text-gray-900 sm:text-lg">ประวัติการจอง</h3>
      <ul className="space-y-2 text-sm text-gray-700">
        {items.map((it, i) => (
          <li key={i} className="inline-flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Icon name={it.icon} className="size-3.5" />
            </span>
            {it.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Payment channels (same as collection page) ────────────────────────

function PaymentChannelsSection({
  bankAccount,
}: {
  bankAccount: { name: string; number: string; bank: string }
}) {
  return (
    <section className="border-t border-gray-100 bg-white py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Icon name="cash" className="size-4" />
          </div>
          <h3 className="text-base font-bold text-gray-900 sm:text-lg">
            ช่องทางที่รับชำระ
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Card + e-wallet section */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              บัตรเครดิต / เดบิต / ผ่อนชำระ
            </div>
            <div className="flex flex-wrap gap-2">
              <CardLogo label="VISA" color="bg-blue-700" />
              <CardLogo label="AliPay" color="bg-sky-500" />
              <CardLogo label="MC" color="bg-red-500" />
              <CardLogo label="JCB" color="bg-indigo-600" />
            </div>
          </div>

          {/* Bank transfer — banks above, account info card below */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              โอนเงินผ่านธนาคาร
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <BankCircle label="กรุงเทพ" short="กท" color="bg-blue-700" />
              <BankCircle label="ไทยพาณิชย์" short="SCB" color="bg-purple-700" />
              <BankCircle label="กสิกร" short="กส" color="bg-green-700" />
              <BankCircle label="กรุงไทย" short="KTB" color="bg-sky-500" />
              <BankCircle label="ทหารไทย" short="TMB" color="bg-yellow-500" />
            </div>

            {/* Account info — cleaner key/value pairs */}
            <div className="space-y-1.5 rounded-xl bg-gray-50 px-3 py-3 text-sm">
              <BankAccountRow label="บัญชี" value={bankAccount.name} />
              <BankAccountRow
                label="เลขที่"
                value={bankAccount.number}
                mono
              />
              <BankAccountRow label="ธนาคาร" value={bankAccount.bank} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CardLogo({ label, color }: { label: string; color: string }) {
  return (
    <div
      className={`flex h-9 min-w-14 items-center justify-center rounded-lg px-3 text-xs font-bold tracking-wide text-white shadow-sm ${color}`}
    >
      {label}
    </div>
  )
}

function BankCircle({
  label,
  short,
  color,
}: {
  label: string
  short: string
  color: string
}) {
  return (
    <div className="flex flex-col items-center gap-1" title={label}>
      <div
        className={`flex size-10 items-center justify-center rounded-full text-[10px] font-bold leading-none text-white shadow-sm ${color}`}
      >
        {short}
      </div>
      <span className="text-[10px] font-medium text-gray-600">{label}</span>
    </div>
  )
}

function BankAccountRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={mono ? 'font-mono text-sm font-semibold text-gray-900' : 'text-sm font-semibold text-gray-900'}>
        {value}
      </span>
    </div>
  )
}

// ─── Footer ────────────────────────────────────────────────────────────

// ─── Mobile bottom-bar — compact CTA for screens < lg ─────────────────

function MobileBookingBar({ pricePerNight }: { pricePerNight: number }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div>
          <span className="text-xs text-gray-500">ราคาต่อคืน</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-rose-600">
              ฿{pricePerNight.toLocaleString('en-US')}
            </span>
            <span className="text-xs text-gray-500">/คืน</span>
          </div>
        </div>
        <button
          type="button"
          className="h-11 flex-1 max-w-[200px] rounded-xl bg-brand-600 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
        >
          จอง
        </button>
      </div>
    </div>
  )
}

function DetailFooter() {
  return (
    <footer className="bg-white py-6 text-center text-xs text-gray-400">
      Copyright © 2026 PMS Pool Villa · All Rights Reserved
    </footer>
  )
}
