'use client'

import { use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Badge } from '@pms/ui'

export default function SaleLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data, isPending, error } = trpc.public.ownerBySlug.useQuery({ slug })

  if (error?.data?.code === 'NOT_FOUND') notFound()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-gray-500">กำลังโหลด...</div>
      </div>
    )
  }
  if (!data) return null

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-base text-white shadow-sm shadow-brand-600/30">
              🏖️
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-gray-900">{data.owner.name}</div>
              <div className="text-[11px] text-gray-500">{data.properties.length} ที่พัก</div>
            </div>
          </div>
          {data.owner.phone && (
            <a
              href={`tel:${data.owner.phone}`}
              className="rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
            >
              📞 {data.owner.phone}
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            ที่พักของ {data.owner.name}
          </h1>
          <p className="mt-1 text-sm text-gray-600">เลือกที่พักที่คุณสนใจ ตรวจสอบวันว่าง และจองได้ทันที</p>
        </div>

        {data.properties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="mb-3 text-4xl">🏝️</div>
            <p className="text-sm text-gray-500">ยังไม่มีที่พักเปิดให้บริการในขณะนี้</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.properties.map((p) => {
              const name = (p.name as { th?: string })?.th ?? p.code
              const cover = p.images[0]?.url
              const variant = p.variants[0]
              const hasPool = p.pools.length > 0
              return (
                <Link
                  key={p.id}
                  href={`/sale/${slug}/${p.code}`}
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
                        🏠
                      </div>
                    )}
                    {p.location?.location && (
                      <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm backdrop-blur">
                        📍 {p.location.location.name}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-gray-900">{name}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <span>🛏 {p.totalBedrooms} ห้องนอน</span>
                      <span>🛁 {p.totalBathrooms} ห้องน้ำ</span>
                      {variant && <span>👥 {variant.maxGuests} ท่าน</span>}
                      {hasPool && <Badge variant="info">💧 มีสระ</Badge>}
                    </div>
                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 group-hover:gap-2 transition-all">
                      ดูรายละเอียดและจอง
                      <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} {data.owner.name} — ขับเคลื่อนโดย PMS Pool Villa
        </div>
      </footer>
    </>
  )
}
