'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Icon, Input, Select, cn } from '@pms/ui'

type Sort = 'newest' | 'bedroomDesc' | 'bedroomAsc'

const PROP_TYPE_LABEL: Record<string, string> = {
  POOL_VILLA: 'พูลวิลล่า',
  LOFT: 'ลอฟ',
  BNB: 'B&B',
}

export default function ExplorePage() {
  const [search, setSearch] = useState('')
  const [locationId, setLocationId] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [minBed, setMinBed] = useState(0)
  const [propertyType, setPropertyType] = useState<'' | 'POOL_VILLA' | 'LOFT' | 'BNB'>('')
  const [hasPool, setHasPool] = useState(false)
  const [sort, setSort] = useState<Sort>('newest')

  const { data: locations } = trpc.public.locations.useQuery()
  const { data, isPending } = trpc.public.exploreAll.useQuery({
    search: search.trim() || undefined,
    locationId: locationId || undefined,
    zoneId: zoneId || undefined,
    minBed: minBed || undefined,
    propertyType: propertyType || undefined,
    hasPool: hasPool || undefined,
    sort,
    limit: 24,
    offset: 0,
  })

  const zonesOfLocation = useMemo(
    () => locations?.find((l) => l.id === locationId)?.zones ?? [],
    [locations, locationId],
  )

  const hasFilter = !!(search || locationId || zoneId || minBed || hasPool || propertyType)

  function clearFilters() {
    setSearch('')
    setLocationId('')
    setZoneId('')
    setMinBed(0)
    setHasPool(false)
    setPropertyType('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
              <Icon name="beach" className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">ค้นหาที่พัก</h1>
              <p className="mt-1 text-sm text-gray-600">
                เลือกจากที่พักทุกหลังในระบบ PMS Pool Villa
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Filter bar */}
        <Card className="mb-6 p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <div className="relative">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
                />
                <Input
                  placeholder="ค้นหาชื่อที่พัก..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="lg:col-span-2">
              <Select
                value={locationId}
                onChange={(e) => {
                  setLocationId(e.target.value)
                  setZoneId('')
                }}
              >
                <option value="">ทุกพื้นที่</option>
                {locations?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                disabled={!locationId || zonesOfLocation.length === 0}
              >
                <option value="">ทุกโซน</option>
                {zonesOfLocation.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Select value={String(minBed)} onChange={(e) => setMinBed(Number(e.target.value))}>
                <option value="0">ห้องนอนทุกขนาด</option>
                <option value="1">1+ ห้องนอน</option>
                <option value="2">2+ ห้องนอน</option>
                <option value="3">3+ ห้องนอน</option>
                <option value="4">4+ ห้องนอน</option>
                <option value="5">5+ ห้องนอน</option>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Select
                value={propertyType}
                onChange={(e) =>
                  setPropertyType(e.target.value as '' | 'POOL_VILLA' | 'LOFT' | 'BNB')
                }
              >
                <option value="">ทุกประเภท</option>
                <option value="POOL_VILLA">พูลวิลล่า</option>
                <option value="LOFT">ลอฟ</option>
                <option value="BNB">B&B</option>
              </Select>
            </div>
            <div className="lg:col-span-1">
              <label className="flex h-full cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 transition-colors hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={hasPool}
                  onChange={(e) => setHasPool(e.target.checked)}
                  className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <Icon name="water" className="size-3.5 text-blue-500" />
                <span className="text-xs text-gray-700">สระ</span>
              </label>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span>
                {isPending ? 'กำลังโหลด...' : `พบ ${data?.total ?? 0} ที่พัก`}
              </span>
              {hasFilter && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-brand-700 hover:underline"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Icon name="sort" className="size-3 text-gray-400" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="cursor-pointer border-0 bg-transparent text-xs text-gray-700 focus:outline-none focus:ring-0"
              >
                <option value="newest">ใหม่ล่าสุด</option>
                <option value="bedroomDesc">ห้องนอน มาก → น้อย</option>
                <option value="bedroomAsc">ห้องนอน น้อย → มาก</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Results */}
        {isPending ? (
          <div className="text-center text-sm text-gray-500">กำลังโหลด...</div>
        ) : !data?.items.length ? (
          <Card className="flex flex-col items-center p-12 text-center">
            <Icon name="search" className="mb-3 text-4xl text-gray-300" />
            <p className="text-sm text-gray-500">
              {hasFilter ? 'ไม่พบที่พักตามเงื่อนไข — ลองปรับตัวกรอง' : 'ยังไม่มีที่พักในระบบ'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((p) => {
              const name = (p.name as { th?: string })?.th ?? p.code
              const cover = p.images[0]?.url
              const variant = p.variants[0]
              const hasPoolP = p.pools.length > 0
              const href = p.owner.saleSlug ? `/sale/${p.owner.saleSlug}/${p.code}` : '#'
              return (
                <Link
                  key={p.id}
                  href={href}
                  className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:ring-brand-300"
                >
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={name}
                        className="size-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-5xl text-gray-300">
                        <Icon name="home" />
                      </div>
                    )}
                    {p.location?.location && (
                      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm backdrop-blur">
                        <Icon name="pin" className="size-3 text-brand-600" />
                        {p.location.location.name}
                      </div>
                    )}
                    {hasPoolP && (
                      <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-blue-500/90 px-2.5 py-1 text-xs font-medium text-white shadow-sm backdrop-blur">
                        <Icon name="water" className="size-3" /> สระ
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 text-base font-semibold text-gray-900">{name}</h3>
                      <Badge variant="default" className="shrink-0">
                        {PROP_TYPE_LABEL[p.type] ?? p.type}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      โดย {p.owner.name}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="bed" className="size-3 text-gray-400" /> {p.totalBedrooms}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Icon name="bath" className="size-3 text-gray-400" /> {p.totalBathrooms}
                      </span>
                      {variant && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="users" className="size-3 text-gray-400" /> {variant.maxGuests}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 transition-all group-hover:gap-2.5">
                      ดูรายละเอียด
                      <Icon name="chevronRight" className="size-3" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} PMS Pool Villa — Marketplace
        </div>
      </footer>
    </div>
  )
}
