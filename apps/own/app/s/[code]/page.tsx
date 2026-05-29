'use client'

/**
 * Multi-property sale page (Owner-level "shop") — public, no auth needed.
 *
 * URL: /s/[code]   where [code] = owner's saleSlug
 *
 * Fetches real properties via trpc.public.ownerBySlug. Falls back to a small
 * mock dataset when the slug doesn't match any owner (e.g. /s/demo without a
 * matching saleSlug) so the page still renders something useful in dev.
 */

import { use } from 'react'
import Link from 'next/link'
import { Icon } from '@pms/ui'
import { trpc } from '@/lib/trpc'

// ─── Mock fallback (used when slug isn't bound to a real owner) ────────

interface DisplayProperty {
  slug: string
  code: string
  name: string
  cover: string
  pricePerNight: number
  bedrooms: number
  maxGuests: number
  poolType: string
  location: string
}

const MOCK_PROPERTIES: DisplayProperty[] = [
  {
    slug: 'sunrise-pool-villa',
    code: 'CITY-018',
    name: 'The Sunrise Pool Villa',
    cover: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
    pricePerNight: 24000,
    bedrooms: 3,
    maxGuests: 8,
    poolType: 'สระว่ายน้ำส่วนตัว',
    location: 'หัวหิน',
  },
  {
    slug: 'sunset-pool-villa',
    code: 'CITY-019',
    name: 'The Sunset Pool Villa',
    cover: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
    pricePerNight: 24000,
    bedrooms: 4,
    maxGuests: 10,
    poolType: 'สระว่ายน้ำส่วนตัว',
    location: 'หัวหิน',
  },
]

const MOCK_BANK_ACCOUNT = {
  name: 'นายตัวอย่าง รับเงิน',
  number: '123-4-56789-0',
  bank: 'ธนาคารกรุงเทพ',
}

// ─── Page ──────────────────────────────────────────────────────────────

export default function SalePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)

  // Primary: try owner-specific lookup by saleSlug
  const ownerQuery = trpc.public.ownerBySlug.useQuery(
    { slug: code },
    { retry: false, refetchOnWindowFocus: false, throwOnError: false },
  )

  // Fallback: when slug doesn't match any owner (e.g. /s/demo), show ALL
  // properties marked showOnSalePage:true across all owners — keeps the demo
  // showcase populated with real owner-toggled data instead of dead mocks.
  const fallbackQuery = trpc.public.exploreAll.useQuery(
    { limit: 24 },
    {
      enabled: !ownerQuery.data && !ownerQuery.isPending,
      retry: false,
      refetchOnWindowFocus: false,
      throwOnError: false,
    },
  )

  const isPending = ownerQuery.isPending || fallbackQuery.isPending

  // Resolve display data — owner-specific > fallback explore > mock
  const realFromOwner = ownerQuery.data?.properties.map((p) => ({
    slug: p.code,
    code: p.code,
    name: (p.name as { th?: string })?.th ?? p.code,
    cover: p.images[0]?.url ?? MOCK_PROPERTIES[0]!.cover,
    pricePerNight: 24000,
    bedrooms: p.variants[0]?.bedrooms ?? p.totalBedrooms,
    maxGuests: p.variants[0]?.maxGuests ?? 0,
    poolType: p.pools.length > 0 ? 'สระว่ายน้ำส่วนตัว' : 'ไม่มีสระ',
    location: p.location?.location?.name ?? '',
  }))
  const realFromExplore = fallbackQuery.data?.items.map((p) => ({
    slug: p.code,
    code: p.code,
    name: (p.name as { th?: string })?.th ?? p.code,
    cover: p.images[0]?.url ?? MOCK_PROPERTIES[0]!.cover,
    pricePerNight: 24000,
    bedrooms: p.variants[0]?.bedrooms ?? p.totalBedrooms,
    maxGuests: p.variants[0]?.maxGuests ?? 0,
    poolType: p.pools.length > 0 ? 'สระว่ายน้ำส่วนตัว' : 'ไม่มีสระ',
    location: p.location?.location?.name ?? '',
  }))

  const displayProperties: DisplayProperty[] =
    realFromOwner && realFromOwner.length > 0
      ? realFromOwner
      : realFromExplore && realFromExplore.length > 0
        ? realFromExplore
        : MOCK_PROPERTIES

  const ownerName =
    ownerQuery.data?.owner.name ??
    (realFromExplore && realFromExplore.length > 0 ? 'PMS Villa' : 'Logoipsum')

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900">
      <ShopHeader logoText={ownerName} />
      <HeroBanner cover={displayProperties[0]?.cover ?? MOCK_PROPERTIES[0]!.cover} />
      <SearchCard />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">ค้นหาโดน</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {isPending
              ? 'กำลังโหลด...'
              : `ผลการค้นหา ${displayProperties.length} รายการ`}
          </p>
        </div>

        {displayProperties.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              ยังไม่มีที่พักในระบบ — เพิ่มที่พักในเมนู "ลิสติ้งที่พัก"
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayProperties.map((p) => (
              <PropertyCard key={p.slug} property={p} code={code} />
            ))}
          </div>
        )}
      </main>

      <PaymentChannelsSection bankAccount={MOCK_BANK_ACCOUNT} />
      <ShopFooter />
    </div>
  )
}

// ─── Header ────────────────────────────────────────────────────────────

function ShopHeader({ logoText }: { logoText: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded bg-brand-600 text-white">
            <Icon name="beach" className="size-4" />
          </div>
          <span className="text-base font-bold text-gray-900">{logoText}</span>
        </div>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-full border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <span>🇹🇭</span>
          <Icon name="chevronDown" className="size-3 text-gray-400" />
        </button>
      </div>
    </header>
  )
}

// ─── Hero banner ───────────────────────────────────────────────────────

function HeroBanner({ cover }: { cover: string }) {
  return (
    <div className="relative h-56 w-full overflow-hidden sm:h-72 md:h-80">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover} alt="banner" className="size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
    </div>
  )
}

// ─── Floating search card ──────────────────────────────────────────────

function SearchCard() {
  return (
    <div className="relative mx-auto -mt-12 max-w-4xl px-4">
      <div className="rounded-2xl bg-white p-3 shadow-[0_10px_40px_rgba(0,0,0,0.08)] sm:p-4">
        <p className="mb-3 text-center text-sm font-semibold text-gray-700 sm:text-base">
          ค้นหาและจองที่พักได้ทันที
        </p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:gap-3">
          <SearchField icon="calendar" placeholder="วันเช็คอิน" />
          <SearchField icon="calendar" placeholder="วันเช็คเอาท์" />
          <SearchField icon="users" placeholder="จำนวนผู้เข้าพัก" />
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            ค้นหา
          </button>
        </div>
      </div>
    </div>
  )
}

function SearchField({ icon, placeholder }: { icon: 'calendar' | 'users'; placeholder: string }) {
  return (
    <div className="flex h-12 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 transition hover:border-brand-300 hover:bg-white">
      <Icon name={icon} className="size-4 text-gray-400" />
      <span>{placeholder}</span>
    </div>
  )
}

// ─── Property card ─────────────────────────────────────────────────────

function PropertyCard({ property, code }: { property: DisplayProperty; code: string }) {
  return (
    <Link
      href={`/s/${code}/${property.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)]"
    >
      <div className="relative h-44 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={property.cover}
          alt={property.name}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-base font-bold leading-snug text-gray-900">{property.name}</h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
          <SpecChip icon="bed" label={`${property.bedrooms} ห้องนอน`} />
          <SpecChip icon="users" label={`${property.maxGuests} ท่าน`} />
        </div>

        <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
          <Icon name="swimmer" className="size-3" />
          {property.poolType}
        </p>

        <div className="mt-3 flex items-baseline justify-end gap-1 border-t border-gray-100 pt-2">
          <span className="text-lg font-bold text-rose-600">
            ฿{property.pricePerNight.toLocaleString('en-US')}
          </span>
          <span className="text-xs text-gray-500">/ คืน</span>
        </div>
      </div>
    </Link>
  )
}

function SpecChip({ icon, label }: { icon: 'bed' | 'users'; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon name={icon} className="size-3 text-gray-500" />
      {label}
    </span>
  )
}

// ─── Payment channels ──────────────────────────────────────────────────

function PaymentChannelsSection({
  bankAccount,
}: {
  bankAccount: { name: string; number: string; bank: string }
}) {
  return (
    <section className="border-t border-gray-200 bg-white py-10">
      <div className="mx-auto max-w-6xl px-4">
        <h3 className="mb-4 text-xl font-semibold text-gray-900">ช่องทางที่รับชำระ</h3>

        <div className="mb-6">
          <p className="mb-2 text-sm text-gray-600">บัตรเครดิต บัตรเดบิต และผ่อนชำระ</p>
          <div className="flex flex-wrap items-center gap-2">
            <CardLogo label="VISA" color="bg-blue-700" />
            <CardLogo label="AliPay" color="bg-sky-500" />
            <CardLogo label="MC" color="bg-red-500" />
            <CardLogo label="JCB" color="bg-indigo-600" />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-gray-600">โอนเงิน</p>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <BankCircle label="กรุงเทพ" color="bg-blue-700" />
            <BankCircle label="ไทยพาณิชย์" color="bg-purple-700" />
            <BankCircle label="กสิกร" color="bg-green-700" />
            <BankCircle label="กรุงไทย" color="bg-sky-500" />
            <BankCircle label="ทหารไทย" color="bg-yellow-500" />
          </div>
          <div className="space-y-0.5 text-sm text-gray-700">
            <p>
              <span className="text-gray-500">ชื่อบัญชี:</span>{' '}
              <span className="font-medium">{bankAccount.name}</span>
            </p>
            <p>
              <span className="text-gray-500">เลขที่บัญชี:</span>{' '}
              <span className="font-mono font-medium">{bankAccount.number}</span>
            </p>
            <p>
              <span className="text-gray-500">ธนาคาร:</span>{' '}
              <span className="font-medium">{bankAccount.bank}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function CardLogo({ label, color }: { label: string; color: string }) {
  return (
    <div
      className={`flex h-7 min-w-12 items-center justify-center rounded px-2 text-xs font-bold text-white ${color}`}
    >
      {label}
    </div>
  )
}

function BankCircle({ label, color }: { label: string; color: string }) {
  return (
    <div
      className={`flex size-9 items-center justify-center rounded-full text-[9px] font-bold leading-tight text-white shadow-sm ${color}`}
      title={label}
    >
      {label.slice(0, 2)}
    </div>
  )
}

// ─── Footer ────────────────────────────────────────────────────────────

function ShopFooter() {
  return (
    <footer className="bg-white py-6 text-center text-xs text-gray-400">
      Copyright © 2026 PMS Pool Villa · All Rights Reserved
    </footer>
  )
}
