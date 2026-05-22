'use client'

import { use, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon, Input, Label, cn } from '@pms/ui'

type Params = Promise<{ slug: string; code: string }>

const tomorrow = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10) }
const dayAfter = () => { const d = new Date(); d.setUTCDate(d.getUTCDate() + 2); return d.toISOString().slice(0, 10) }

const fmtBaht = (n: number) => `฿${n.toLocaleString('th-TH')}`
const fmtDate = (s: string) =>
  new Date(s + 'T00:00:00.000Z').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })

export default function HotelSalePage({ params }: { params: Params }) {
  const { slug, code } = use(params)
  const router = useRouter()

  const { data: hotel, isPending } = trpc.public.hotelByCode.useQuery({ slug, code })
  const [checkin, setCheckin] = useState(tomorrow())
  const [checkout, setCheckout] = useState(dayAfter())
  const [guests, setGuests] = useState(2)

  const { data: availability, isFetching: availLoading } = trpc.public.hotelAvailability.useQuery(
    { slug, code, from: checkin, to: checkout },
    { enabled: !!hotel && checkout > checkin },
  )

  const [selectedRooms, setSelectedRooms] = useState<Record<string, number>>({})
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', note: '' })
  const [showBookingModal, setShowBookingModal] = useState(false)

  const roomsSectionRef = useRef<HTMLDivElement>(null)

  const nights = useMemo(() => {
    const a = new Date(checkin + 'T00:00:00.000Z').getTime()
    const b = new Date(checkout + 'T00:00:00.000Z').getTime()
    return Math.max(0, Math.round((b - a) / 86_400_000))
  }, [checkin, checkout])

  const minAvailable = useMemo(() => {
    const m = new Map<string, number>()
    if (!availability) return m
    for (const rt of availability) {
      m.set(rt.roomType.id, Math.min(...rt.days.map((d) => d.available)))
    }
    return m
  }, [availability])

  const submit = trpc.public.submitHotelBooking.useMutation({
    onSuccess: (res) => router.push(`/hotel/${slug}/${code}/confirm/${res.code}`),
    onError: (e) => alert(e.message),
  })

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">
          <Icon name="spinner" spin className="mr-2 size-4" /> กำลังโหลด...
        </div>
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <Icon name="error" className="mx-auto mb-3 size-8 text-red-500" />
          <h1 className="text-lg font-semibold">ไม่พบโรงแรม</h1>
        </div>
      </div>
    )
  }

  const hotelName = (hotel.name as { th?: string })?.th ?? hotel.code
  const lines = Object.entries(selectedRooms)
    .filter(([, qty]) => qty > 0)
    .map(([roomTypeId, qty]) => ({ roomTypeId, roomsReserved: qty }))
  const total = lines.reduce((sum, l) => {
    const rt = hotel.roomTypes.find((r) => r.id === l.roomTypeId)
    return rt ? sum + Number(rt.pricePerNight) * l.roomsReserved * nights : sum
  }, 0)
  const totalRooms = lines.reduce((s, l) => s + l.roomsReserved, 0)
  const canSubmit =
    lines.length > 0 && nights > 0 && !!customer.name.trim() && !!customer.phone.trim()
  const startingFrom = hotel.roomTypes.length > 0
    ? Math.min(...hotel.roomTypes.map((rt) => Number(rt.pricePerNight)))
    : 0

  function setQty(roomTypeId: string, qty: number, max: number) {
    setSelectedRooms((prev) => ({ ...prev, [roomTypeId]: Math.max(0, Math.min(qty, max)) }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    submit.mutate({
      slug,
      code,
      checkin,
      checkout,
      customerName: customer.name.trim(),
      customerPhone: customer.phone.trim(),
      customerEmail: customer.email.trim() || undefined,
      guestCount: guests,
      lines,
      message: customer.note.trim() || undefined,
    })
  }

  function scrollToRooms() {
    roomsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Get hotel type display label
  const typeLabel = ({
    BUDGET: 'โรงแรมประหยัด',
    MIDSCALE: 'โรงแรมระดับกลาง',
    LUXURY: 'โรงแรมหรู',
    RESORT: 'รีสอร์ท',
    BOUTIQUE: 'Boutique',
  } as Record<string, string>)[hotel.hotelType] ?? hotel.hotelType

  return (
    <div className="min-h-screen bg-gray-100 pb-32 lg:pb-0">
      {/* Top header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/explore" className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-brand-700">
            <Icon name="arrowLeft" className="size-4" /> กลับ
          </Link>
          <Link href={`/sale/${slug}`} className="text-xs text-gray-500 hover:text-brand-700">
            ดูที่พักอื่นของ <span className="font-semibold text-gray-700">{hotel.owner.name}</span>
          </Link>
        </div>
      </header>

      {/* ── HERO GALLERY ── */}
      <HeroGallery images={hotel.images} />


      {/* ── HOTEL INFO BAR ── */}
      <section className="bg-white pb-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant="brand">{typeLabel}</Badge>
                <Badge variant="success" dot>เปิดจอง</Badge>
                <span className="font-mono text-[11px] text-gray-500">#{hotel.code}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{hotelName}</h1>
              {hotel.address && (
                <p className="mt-1 flex items-start gap-1.5 text-sm text-gray-600">
                  <Icon name="pin" className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
                  <span>{hotel.address}</span>
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <Icon name="bed" className="size-3.5 text-gray-400" />
                  {hotel.roomTypes.length} ประเภทห้อง
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="home" className="size-3.5 text-gray-400" />
                  รวม {hotel.roomTypes.reduce((s, rt) => s + rt.totalInventory, 0)} ห้อง
                </span>
                {hotel.phone && (
                  <a href={`tel:${hotel.phone}`} className="inline-flex items-center gap-1 hover:text-brand-700">
                    <Icon name="phone" className="size-3.5 text-gray-400" />{hotel.phone}
                  </a>
                )}
                {hotel.email && (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="email" className="size-3.5 text-gray-400" />{hotel.email}
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-xl bg-brand-50 px-4 py-3 text-right ring-1 ring-inset ring-brand-200">
              <div className="text-[10.5px] uppercase tracking-wider text-brand-700">เริ่มต้น</div>
              <div className="text-2xl font-bold text-brand-900 tabular-nums">{fmtBaht(startingFrom)}</div>
              <div className="text-[10.5px] text-brand-700">ต่อคืน</div>
            </div>
          </div>
          {hotel.description && (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-700">{hotel.description}</p>
          )}
        </div>
      </section>

      {/* ── STICKY SEARCH BAR ── */}
      <section className="sticky top-14 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:gap-3">
            <div>
              <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
                <Icon name="calendarCheck" className="mr-1 size-3 text-brand-600" /> เช็คอิน
              </label>
              <input
                type="date"
                value={checkin}
                onChange={(e) => setCheckin(e.target.value)}
                className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-0"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
                <Icon name="calendarX" className="mr-1 size-3 text-brand-600" /> เช็คเอาท์
              </label>
              <input
                type="date"
                value={checkout}
                onChange={(e) => setCheckout(e.target.value)}
                className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-0"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
                <Icon name="users" className="mr-1 size-3 text-brand-600" /> ผู้เข้าพัก
              </label>
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="mt-0.5 w-full cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-0"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} ท่าน</option>
                ))}
              </select>
            </div>
            <Button type="button" size="lg" onClick={scrollToRooms} className="w-full sm:w-auto">
              <Icon name="search" className="size-4" />
              <span>ค้นหาห้อง</span>
            </Button>
          </div>
          {nights > 0 && (
            <div className="mt-1.5 text-[11px] text-gray-500">
              {nights} คืน · {fmtDate(checkin)} → {fmtDate(checkout)}
              {availLoading && (
                <span className="ml-2 inline-flex items-center gap-1 text-brand-700">
                  <Icon name="spinner" spin className="size-3" /> กำลังเช็คห้องว่าง...
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-3 lg:py-8">
        {/* ── ROOMS SECTION ── */}
        <div ref={roomsSectionRef} className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              ห้องพักที่เลือกได้
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({hotel.roomTypes.length} ประเภท)
              </span>
            </h2>
            {availLoading && <Icon name="spinner" spin className="size-4 text-gray-400" />}
          </div>

          {hotel.roomTypes.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
              <Icon name="bed" className="mx-auto mb-3 size-8 text-gray-300" />
              <p className="text-sm text-gray-500">โรงแรมนี้ยังไม่มีห้องเปิดจอง</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hotel.roomTypes.map((rt) => {
                const name = (rt.name as { th?: string })?.th ?? '—'
                const avail = minAvailable.get(rt.id) ?? rt.totalInventory
                const qty = selectedRooms[rt.id] ?? 0
                const price = Number(rt.pricePerNight)
                const isFull = avail === 0
                const subtotal = price * qty * nights
                return (
                  <div
                    key={rt.id}
                    className={cn(
                      'overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-all',
                      isFull ? 'opacity-60 ring-gray-200' : 'ring-gray-200 hover:shadow-md',
                      qty > 0 && 'ring-2 ring-brand-500',
                    )}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Image */}
                      <RoomImage images={rt.images} />


                      {/* Content */}
                      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
                        <div>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h3 className="text-base font-bold text-gray-900 sm:text-lg">{name}</h3>
                            {isFull ? (
                              <Badge variant="danger" dot>เต็ม</Badge>
                            ) : avail <= 3 ? (
                              <Badge variant="warning" dot>เหลือ {avail} ห้อง</Badge>
                            ) : (
                              <Badge variant="success" dot>ว่าง {avail} ห้อง</Badge>
                            )}
                          </div>

                          {/* Bed config + capacity */}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-600">
                            {rt.bedConfig && (
                              <span className="inline-flex items-center gap-1">
                                <Icon name="bed" className="size-3 text-gray-400" /> {rt.bedConfig}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Icon name="users" className="size-3 text-gray-400" /> สูงสุด {rt.maxGuests} ท่าน/ห้อง
                            </span>
                          </div>

                          {rt.description && (
                            <p className="mt-2 text-sm text-gray-600">{rt.description}</p>
                          )}

                          {/* Includes (Agoda-style perks) */}
                          <ul className="mt-3 space-y-1">
                            <li className="flex items-center gap-1.5 text-xs text-emerald-700">
                              <Icon name="check" className="size-3" /> ยกเลิกฟรีก่อนเช็คอิน
                            </li>
                            <li className="flex items-center gap-1.5 text-xs text-emerald-700">
                              <Icon name="check" className="size-3" /> ไม่ต้องชำระเงินล่วงหน้า
                            </li>
                            <li className="flex items-center gap-1.5 text-xs text-emerald-700">
                              <Icon name="check" className="size-3" /> ราคารวมภาษีและค่าบริการ
                            </li>
                          </ul>
                        </div>

                        {/* Footer: price + selector */}
                        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-gray-100 pt-3">
                          <div>
                            <div className="text-[10.5px] text-gray-500">ราคา/ห้อง/คืน</div>
                            <div className="text-2xl font-bold text-gray-900 tabular-nums">{fmtBaht(price)}</div>
                            {nights > 0 && qty > 0 && (
                              <div className="mt-0.5 text-[11px] text-gray-500">
                                รวม {nights} คืน × {qty} ห้อง = <span className="font-semibold text-brand-700">{fmtBaht(subtotal)}</span>
                              </div>
                            )}
                          </div>
                          {isFull ? (
                            <span className="text-xs text-rose-600">ห้องเต็ม</span>
                          ) : qty === 0 ? (
                            <Button type="button" size="sm" onClick={() => setQty(rt.id, 1, avail)}>
                              เลือกห้องนี้
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-2 py-1.5 ring-1 ring-inset ring-brand-200">
                              <button
                                type="button"
                                onClick={() => setQty(rt.id, qty - 1, avail)}
                                className="flex size-9 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-brand-100 hover:text-brand-700"
                              >
                                <Icon name="minus" className="size-3.5" />
                              </button>
                              <span className="w-10 text-center text-base font-bold tabular-nums text-brand-800">{qty}</span>
                              <button
                                type="button"
                                onClick={() => setQty(rt.id, qty + 1, avail)}
                                disabled={qty >= avail}
                                className="flex size-9 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-brand-100 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Icon name="plus" className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── FACILITIES SECTION (mock data — should come from hotel.facilities later) ── */}
          <section className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-gray-200">
            <h2 className="mb-4 text-lg font-bold text-gray-900">สิ่งอำนวยความสะดวก</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { icon: 'water' as const, label: 'สระว่ายน้ำ' },
                { icon: 'kitchen' as const, label: 'อาหารเช้า' },
                { icon: 'bolt' as const, label: 'WiFi ฟรี' },
                { icon: 'couch' as const, label: 'ห้องนั่งเล่น' },
                { icon: 'pet' as const, label: 'รับสัตว์เลี้ยง' },
                { icon: 'pingPong' as const, label: 'กิจกรรมในร่ม' },
                { icon: 'shield' as const, label: 'ปลอดภัย 24 ชม.' },
                { icon: 'phone' as const, label: 'รับ-ส่งสนามบิน' },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 text-sm text-gray-700">
                  <Icon name={f.icon} className="size-4 text-brand-600" />
                  {f.label}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-gray-400">
              💡 ตัวอย่าง — facilities ของจริงจะต่อกับ master data ในอนาคต
            </p>
          </section>

          {/* ── CONTACT SECTION ── */}
          <section className="mt-4 rounded-2xl bg-white p-6 ring-1 ring-gray-200">
            <h2 className="mb-3 text-lg font-bold text-gray-900">ติดต่อโรงแรม</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {hotel.phone && (
                <a href={`tel:${hotel.phone}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 transition-colors hover:border-brand-300 hover:bg-brand-50">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                    <Icon name="phone" className="size-4" />
                  </div>
                  <div>
                    <div className="text-[10.5px] uppercase tracking-wider text-gray-500">โทรศัพท์</div>
                    <div className="text-sm font-semibold text-gray-900">{hotel.phone}</div>
                  </div>
                </a>
              )}
              {hotel.email && (
                <a href={`mailto:${hotel.email}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 transition-colors hover:border-brand-300 hover:bg-brand-50">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                    <Icon name="email" className="size-4" />
                  </div>
                  <div>
                    <div className="text-[10.5px] uppercase tracking-wider text-gray-500">อีเมล</div>
                    <div className="text-sm font-semibold text-gray-900">{hotel.email}</div>
                  </div>
                </a>
              )}
              {hotel.address && (
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 sm:col-span-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                    <Icon name="pin" className="size-4" />
                  </div>
                  <div>
                    <div className="text-[10.5px] uppercase tracking-wider text-gray-500">ที่อยู่</div>
                    <div className="text-sm font-semibold text-gray-900">{hotel.address}</div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── SIDEBAR: BOOKING SUMMARY (desktop) ── */}
        <aside className="hidden lg:col-span-1 lg:block">
          <div className="sticky top-40">
            <BookingSummaryCard
              hotel={hotel}
              lines={lines}
              total={total}
              totalRooms={totalRooms}
              nights={nights}
              checkin={checkin}
              checkout={checkout}
              customer={customer}
              setCustomer={setCustomer}
              canSubmit={canSubmit}
              isPending={submit.isPending}
              onSubmit={onSubmit}
            />
          </div>
        </aside>
      </main>

      {/* ── MOBILE STICKY BAR ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white p-3 shadow-2xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10.5px] text-gray-500">{totalRooms > 0 ? `${totalRooms} ห้อง · ${nights} คืน` : `เริ่มต้น`}</div>
            <div className="text-lg font-bold text-gray-900 tabular-nums">{fmtBaht(total > 0 ? total : startingFrom)}</div>
            {total === 0 && <div className="text-[10.5px] text-gray-500">/คืน</div>}
          </div>
          <Button
            type="button"
            size="lg"
            disabled={lines.length === 0}
            onClick={() => setShowBookingModal(true)}
            className="px-6"
          >
            {lines.length === 0 ? 'เลือกห้องก่อน' : 'จองเลย'}
          </Button>
        </div>
      </div>

      {/* ── MOBILE BOOKING MODAL ── */}
      {showBookingModal && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setShowBookingModal(false)}
        >
          <div
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">สรุปการจอง</h2>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="flex size-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <Icon name="close" className="size-4" />
              </button>
            </div>
            <BookingSummaryCard
              hotel={hotel}
              lines={lines}
              total={total}
              totalRooms={totalRooms}
              nights={nights}
              checkin={checkin}
              checkout={checkout}
              customer={customer}
              setCustomer={setCustomer}
              canSubmit={canSubmit}
              isPending={submit.isPending}
              onSubmit={onSubmit}
              compact
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────
// Booking Summary Card (used in sidebar + mobile modal)
// ──────────────────────────────────────────

interface BookingSummaryProps {
  hotel: {
    roomTypes: Array<{ id: string; name: unknown; pricePerNight: unknown }>
  }
  lines: { roomTypeId: string; roomsReserved: number }[]
  total: number
  totalRooms: number
  nights: number
  checkin: string
  checkout: string
  customer: { name: string; phone: string; email: string; note: string }
  setCustomer: React.Dispatch<React.SetStateAction<{ name: string; phone: string; email: string; note: string }>>
  canSubmit: boolean
  isPending: boolean
  onSubmit: (e: React.FormEvent) => void
  compact?: boolean
}

function BookingSummaryCard({
  hotel, lines, total, totalRooms, nights, checkin, checkout,
  customer, setCustomer, canSubmit, isPending, onSubmit, compact,
}: BookingSummaryProps) {
  return (
    <form onSubmit={onSubmit} className={cn('rounded-2xl bg-white shadow-sm', !compact && 'p-5 ring-1 ring-gray-200')}>
      {!compact && <h2 className="mb-4 text-sm font-bold text-gray-900">สรุปการจอง</h2>}

      <div className="space-y-2 border-b border-gray-100 pb-3 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>เช็คอิน</span>
          <span className="font-medium text-gray-900">{fmtDate(checkin)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>เช็คเอาท์</span>
          <span className="font-medium text-gray-900">{fmtDate(checkout)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>จำนวนคืน</span>
          <span className="font-medium text-gray-900">{nights}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>ห้องที่จอง</span>
          <span className="font-medium text-gray-900">{totalRooms} ห้อง</span>
        </div>
      </div>

      {lines.length > 0 && (
        <div className="space-y-1 border-b border-gray-100 py-3 text-xs">
          {lines.map((l) => {
            const rt = hotel.roomTypes.find((r) => r.id === l.roomTypeId)
            if (!rt) return null
            const sub = Number(rt.pricePerNight) * l.roomsReserved * nights
            const name = (rt.name as { th?: string })?.th ?? '—'
            return (
              <div key={l.roomTypeId} className="flex justify-between text-gray-700">
                <span className="truncate pr-2">{name} × {l.roomsReserved}</span>
                <span className="shrink-0 tabular-nums">{fmtBaht(sub)}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-baseline justify-between py-3">
        <span className="text-sm font-medium text-gray-700">ยอดรวม</span>
        <span className="text-2xl font-bold text-brand-700 tabular-nums">{fmtBaht(total)}</span>
      </div>

      <div className="space-y-3 border-t border-gray-100 pt-4">
        <div>
          <Label required htmlFor="c-name">ชื่อ-นามสกุล</Label>
          <Input id="c-name" required value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
        </div>
        <div>
          <Label required htmlFor="c-phone">เบอร์โทร</Label>
          <Input id="c-phone" required value={customer.phone}
            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="c-email">อีเมล (optional)</Label>
          <Input id="c-email" type="email" value={customer.email}
            onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="c-note">หมายเหตุ</Label>
          <Input id="c-note" placeholder="เช่น มาเร็ว, มีเด็ก ฯลฯ" value={customer.note}
            onChange={(e) => setCustomer({ ...customer, note: e.target.value })} />
        </div>
      </div>

      <Button type="submit" size="lg" className="mt-4 w-full" disabled={!canSubmit || isPending}>
        {isPending ? (
          <><Icon name="spinner" spin className="size-4" /> กำลังจอง...</>
        ) : lines.length === 0 ? (
          'เลือกห้องก่อน'
        ) : !customer.name.trim() || !customer.phone.trim() ? (
          'กรอกข้อมูลผู้จอง'
        ) : (
          <>จองเลย — {fmtBaht(total)}</>
        )}
      </Button>

      <p className="mt-3 text-center text-[10.5px] text-gray-500">
        จอง = สถานะ <span className="font-semibold">รอยืนยัน</span> · โรงแรมจะติดต่อกลับ
      </p>
    </form>
  )
}

// ──────────────────────────────────────────
// Hero Gallery — uses real images with placeholder fallback
// ──────────────────────────────────────────

interface ImageItem { id: string; url: string; type?: string }

function HeroGallery({ images }: { images: ImageItem[] }) {
  // Sort: cover first, then gallery
  const sorted = [...images].sort((a, b) => (a.type === 'cover' ? -1 : b.type === 'cover' ? 1 : 0))
  const main = sorted[0]
  const thumbs = sorted.slice(1, 5)
  const totalCount = images.length

  const FALLBACK_GRADIENTS = [
    'from-brand-400 via-brand-600 to-brand-800',
    'from-blue-400 to-blue-600',
    'from-emerald-400 to-emerald-600',
    'from-amber-400 to-amber-600',
    'from-rose-400 to-rose-600',
  ]
  const FALLBACK_ICONS = ['bed', 'water', 'tree', 'couch', 'kitchen'] as const

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="relative grid grid-cols-4 gap-2 sm:h-80 lg:h-96">
          {/* Main image */}
          <div className="col-span-4 aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br sm:col-span-2 sm:aspect-auto sm:row-span-2">
            {main ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={main.url} alt="" className="size-full object-cover" />
            ) : (
              <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br text-white/30 ${FALLBACK_GRADIENTS[0]}`}>
                <Icon name="bed" className="size-24" />
              </div>
            )}
          </div>

          {/* Thumbnails (up to 4) */}
          {[0, 1, 2, 3].map((i) => {
            const img = thumbs[i]
            const hideMobile = i >= 2
            return (
              <div
                key={i}
                className={`col-span-2 aspect-[4/3] overflow-hidden rounded-xl sm:col-span-1 sm:aspect-auto ${hideMobile ? 'hidden sm:block' : ''}`}
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt="" className="size-full object-cover" />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br text-white/30 ${FALLBACK_GRADIENTS[i + 1] ?? FALLBACK_GRADIENTS[0]}`}>
                    <Icon name={FALLBACK_ICONS[i + 1] ?? 'bed'} className="size-12" />
                  </div>
                )}
              </div>
            )
          })}

          {/* "See all photos" pill */}
          {totalCount > 5 && (
            <div className="absolute bottom-3 right-3 hidden rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-md ring-1 ring-gray-200 backdrop-blur sm:block">
              <Icon name="images" className="mr-1 size-3" /> ดูทั้งหมด {totalCount} รูป
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function RoomImage({ images }: { images: ImageItem[] }) {
  const first = images[0]
  return (
    <div className="flex aspect-[16/10] w-full shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-100 to-brand-300 sm:aspect-auto sm:h-auto sm:w-56">
      {first ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={first.url} alt="" className="size-full object-cover" />
      ) : (
        <Icon name="bed" className="size-16 text-white/60" />
      )}
    </div>
  )
}
