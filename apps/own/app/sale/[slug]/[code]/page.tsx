'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Input, Label, Textarea } from '@pms/ui'
import { PublicCalendar } from '@/components/PublicCalendar'
import { formatBahtFull, ymd, ymdLocal } from '@/lib/date'

const POOL_OWNERSHIP_LABEL = { PRIVATE: 'ส่วนตัว', SHARED: 'ใช้ร่วม' } as const
const POOL_SYSTEM_LABEL: Record<string, string> = {
  SALT: 'น้ำเกลือ',
  CHLORINE: 'คลอรีน',
  SALT_WARM: 'น้ำเกลืออุ่น',
  CHLORINE_WARM: 'คลอรีนอุ่น',
  FRESH_WARM: 'น้ำจืดอุ่น',
}

export default function PropertyDetailPage({ params }: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = use(params)
  const { data: property, isPending, error } = trpc.public.propertyByCode.useQuery({ slug, code })

  const defaultVariant = property?.variants.find((v) => v.isDefault) ?? property?.variants[0]
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const variantId = selectedVariantId ?? defaultVariant?.id ?? ''

  const [range, setRange] = useState<{ from?: string; to?: string }>({})
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    guestCount: 2,
    message: '',
  })
  const [submitState, setSubmitState] = useState<{ ok: boolean; bookingId: string; total: number } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const submit = trpc.public.submitBooking.useMutation({
    onSuccess: (res) => {
      setSubmitState(res)
      setSubmitError(null)
    },
    onError: (e) => setSubmitError(e.message),
  })

  if (error?.data?.code === 'NOT_FOUND') notFound()

  if (isPending || !property) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-gray-500">กำลังโหลด...</div>
      </div>
    )
  }

  const name = (property.name as { th?: string })?.th ?? property.code
  const cover = property.images.find((i) => i.type === 'cover')
  const tours = property.images.filter((i) => i.type === 'tour')
  const tour360 = property.images.find((i) => i.type === 'tour_360')

  function onCellClick(date: Date) {
    const key = ymd(date)
    if (!range.from || (range.from && range.to)) {
      setRange({ from: key })
      setSubmitState(null)
    } else if (key < range.from) {
      setRange({ from: key })
    } else {
      // checkout = next morning of last clicked night
      const next = new Date(date)
      next.setUTCDate(next.getUTCDate() + 1)
      setRange({ from: range.from, to: ymd(next) })
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!range.from || !range.to) return setSubmitError('กรุณาเลือกวันที่เช็คอิน-เช็คเอาท์')
    if (!form.customerName.trim()) return setSubmitError('กรุณากรอกชื่อ')
    if (!form.customerPhone.trim()) return setSubmitError('กรุณากรอกเบอร์โทร')
    submit.mutate({
      slug,
      variantId,
      checkin: range.from,
      checkout: range.to,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      guestCount: form.guestCount,
      message: form.message.trim() || undefined,
    })
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href={`/sale/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
            กลับไปหน้าหลัก
          </Link>
          {property.owner.phone && (
            <a
              href={`tel:${property.owner.phone}`}
              className="rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
            >
              📞 {property.owner.phone}
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Hero */}
        <div className="mb-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden rounded-2xl bg-gray-100">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.url} alt={name} className="aspect-[16/10] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center text-7xl text-gray-300">🏠</div>
            )}
          </div>
          {tours.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {tours.slice(0, 4).map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  className="aspect-square w-full rounded-xl object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Left: details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                {property.location?.location && (
                  <Badge variant="brand" dot>
                    📍 {property.location.location.name}
                    {property.location.zone && ` · ${property.location.zone.name}`}
                  </Badge>
                )}
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[10.5px] font-mono text-gray-500">
                  {property.code}
                </code>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span>🛏 {property.totalBedrooms} ห้องนอน</span>
                <span>🛁 {property.totalBathrooms} ห้องน้ำ</span>
                {defaultVariant && <span>👥 รองรับ {defaultVariant.maxGuests} ท่าน</span>}
                {property.areaSqwa && <span>📐 {property.areaSqwa.toString()} ตร.ว.</span>}
              </div>
            </div>

            {property.pools.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">สระว่ายน้ำ</h3>
                <div className="space-y-2">
                  {property.pools.map((pool, idx) => (
                    <div key={pool.id} className="flex items-center gap-3 text-sm">
                      <span className="text-2xl">💧</span>
                      <div>
                        <div className="font-medium text-gray-800">สระที่ {idx + 1}</div>
                        <div className="text-xs text-gray-500">
                          {POOL_OWNERSHIP_LABEL[pool.ownership]} · {POOL_SYSTEM_LABEL[pool.system]}
                          {pool.widthM && pool.lengthM && ` · ${pool.widthM}×${pool.lengthM} ม.`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {property.amenities.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">สิ่งอำนวยความสะดวก</h3>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a) => (
                    <span
                      key={a.id}
                      className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                    >
                      ✓ {a.amenity.nameTh}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {property.policy && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">นโยบาย</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-gray-500">เช็คอิน</dt>
                    <dd className="text-gray-800">
                      {property.policy.checkinStart}
                      {property.policy.checkinEnd && ` – ${property.policy.checkinEnd}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">เช็คเอาท์</dt>
                    <dd className="text-gray-800">{property.policy.checkout}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">เงินมัดจำ</dt>
                    <dd className="text-gray-800">{formatBahtFull(Number(property.policy.deposit))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">รับสูงสุด</dt>
                    <dd className="text-gray-800">{property.policy.maxGuests} ท่าน</dd>
                  </div>
                </dl>
                {(property.policy.cancellationPolicy as { th?: string })?.th && (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <div className="mb-1 text-xs font-medium text-gray-700">นโยบายการยกเลิก</div>
                    <p className="whitespace-pre-line text-xs text-gray-600">
                      {(property.policy.cancellationPolicy as { th?: string }).th}
                    </p>
                  </div>
                )}
              </div>
            )}

            {tour360 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">ทัวร์ 3D / 360°</h3>
                <a
                  href={tour360.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
                >
                  เปิดดู virtual tour →
                </a>
              </div>
            )}
          </div>

          {/* Right: booking sidebar */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              {property.variants.length > 1 && (
                <div className="mb-3">
                  <Label>เลือกรูปแบบ</Label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {property.variants.map((v) => {
                      const vName = (v.name as { th?: string })?.th ?? `${v.bedrooms} ห้องนอน`
                      const active = v.id === variantId
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSelectedVariantId(v.id)
                            setRange({})
                          }}
                          className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${active ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          {vName}{' '}
                          <span className="text-xs text-gray-500">
                            · 👥 {v.maxGuests} · 🛏 {v.bedrooms}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <Label>เลือกวันเช็คอิน → เช็คเอาท์</Label>
              <PublicCalendar
                slug={slug}
                variantId={variantId}
                selectedRange={range.from && range.to ? { from: range.from, to: range.to } : undefined}
                onCellClick={onCellClick}
              />

              {(range.from || range.to) && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-xs">
                  <div>
                    <span className="font-semibold text-brand-800">
                      {range.from} {range.to && `→ ${range.to}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRange({})}
                    className="text-brand-700 hover:underline"
                  >
                    ล้าง
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                <div>
                  <Label required>ชื่อ-นามสกุล</Label>
                  <Input
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    placeholder="ชื่อจริง นามสกุล"
                  />
                </div>
                <div>
                  <Label required>เบอร์โทรศัพท์</Label>
                  <Input
                    type="tel"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    placeholder="0XX-XXX-XXXX"
                  />
                </div>
                <div>
                  <Label required>จำนวนผู้เข้าพัก</Label>
                  <Input
                    type="number"
                    min={1}
                    max={defaultVariant?.maxGuests ?? 100}
                    value={form.guestCount}
                    onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>ข้อความถึงเจ้าของ (ไม่บังคับ)</Label>
                  <Textarea
                    rows={2}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="เช่น ต้องการเตียงเสริม"
                  />
                </div>

                {submitError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-inset ring-red-200">
                    {submitError}
                  </div>
                )}

                {submitState?.ok ? (
                  <div className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
                    <div className="font-semibold">✓ ส่งคำขอจองเรียบร้อย</div>
                    <div className="mt-1 text-xs">
                      ราคารวม: {formatBahtFull(submitState.total ?? 0)} · เจ้าของจะติดต่อกลับภายใน 24 ชม.
                    </div>
                  </div>
                ) : (
                  <Button type="submit" size="lg" disabled={submit.isPending} className="w-full">
                    {submit.isPending ? 'กำลังส่ง...' : 'ขอจอง'}
                  </Button>
                )}

                <p className="text-center text-[10.5px] text-gray-400">
                  ระบบจะล็อควันที่เลือกชั่วคราว 24 ชม. — เจ้าของจะยืนยันการจอง
                </p>
              </form>
            </div>
          </aside>
        </div>
      </main>

      <footer className="mt-16 border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} {property.owner.name} — ขับเคลื่อนโดย PMS Pool Villa
        </div>
      </footer>
    </>
  )
}
