'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon, Input, Label, Modal, ModalBody, ModalFooter, Select, cn } from '@pms/ui'
import { AvailabilityGrid } from './AvailabilityGrid'

type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

const TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'ทั้งหมด' },
  { key: 'PENDING', label: 'รอ confirm' },
  { key: 'CONFIRMED', label: 'ยืนยันแล้ว' },
  { key: 'COMPLETED', label: 'เสร็จสิ้น' },
  { key: 'CANCELLED', label: 'ยกเลิก' },
]

const statusBadge: Record<string, { label: string; variant: 'pending' | 'success' | 'info' | 'default' }> = {
  PENDING: { label: 'รอ confirm', variant: 'pending' },
  CONFIRMED: { label: 'ยืนยันแล้ว', variant: 'success' },
  COMPLETED: { label: 'เสร็จสิ้น', variant: 'info' },
  CANCELLED: { label: 'ยกเลิก', variant: 'default' },
}

interface LineForm {
  roomTypeId: string
  roomsReserved: number
}

interface BookingForm {
  customerName: string
  customerPhone: string
  customerEmail: string
  guestCount: number
  checkin: string // yyyy-mm-dd
  checkout: string
  lines: LineForm[]
  publicNote: string
}

function tomorrow(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function dayAfterTomorrow(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 2)
  return d.toISOString().slice(0, 10)
}

const emptyForm = (): BookingForm => ({
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  guestCount: 2,
  checkin: tomorrow(),
  checkout: dayAfterTomorrow(),
  lines: [{ roomTypeId: '', roomsReserved: 1 }],
  publicNote: '',
})

export function HotelBookingsManager({ hotelId }: { hotelId: string }) {
  const utils = trpc.useUtils()
  const { data: hotel } = trpc.admin.hotel.byId.useQuery({ id: hotelId })
  const { data: roomTypes } = trpc.admin.roomType.list.useQuery({ hotelId })
  const [tab, setTab] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')

  const { data: bookings, isPending } = trpc.admin.hotelBooking.list.useQuery({
    hotelId,
    status: tab === 'ALL' ? undefined : tab,
    search: search.trim() || undefined,
  })

  const refetch = () => {
    utils.admin.hotelBooking.list.invalidate()
    utils.admin.hotelBooking.availabilityByHotel.invalidate({ hotelId })
  }

  const create = trpc.admin.hotelBooking.create.useMutation({
    onSuccess: () => {
      refetch()
      setOpen(false)
      setForm(emptyForm())
    },
    onError: (e) => alert(e.message),
  })
  const confirmMut = trpc.admin.hotelBooking.confirm.useMutation({ onSuccess: refetch, onError: (e) => alert(e.message) })
  const cancelMut = trpc.admin.hotelBooking.cancel.useMutation({ onSuccess: refetch, onError: (e) => alert(e.message) })

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<BookingForm>(emptyForm)

  const activeRoomTypes = (roomTypes ?? []).filter((rt) => rt.isActive)
  const hotelName = (hotel?.name as { th?: string })?.th ?? hotel?.code ?? '...'
  const items = bookings ?? []

  function openCreate() {
    const f = emptyForm()
    if (activeRoomTypes[0]) f.lines = [{ roomTypeId: activeRoomTypes[0].id, roomsReserved: 1 }]
    setForm(f)
    setOpen(true)
  }

  function addLine() {
    setForm({ ...form, lines: [...form.lines, { roomTypeId: activeRoomTypes[0]?.id ?? '', roomsReserved: 1 }] })
  }
  function removeLine(i: number) {
    if (form.lines.length === 1) return
    setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) })
  }
  function setLine(i: number, patch: Partial<LineForm>) {
    setForm({ ...form, lines: form.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) })
  }

  const nights = (() => {
    const a = new Date(form.checkin + 'T00:00:00.000Z').getTime()
    const b = new Date(form.checkout + 'T00:00:00.000Z').getTime()
    return Math.max(0, Math.round((b - a) / 86_400_000))
  })()
  const estimatedTotal = form.lines.reduce((sum, l) => {
    const rt = activeRoomTypes.find((r) => r.id === l.roomTypeId)
    if (!rt) return sum
    return sum + Number(rt.pricePerNight) * l.roomsReserved * nights
  }, 0)

  return (
    <div className="space-y-6">
      <Link
        href="/manage-accommodation/hotels"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
      >
        <Icon name="arrowLeft" className="size-3.5" /> กลับ
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{hotelName}</h1>
          <p className="mt-1 text-sm text-gray-600">การจอง + ห้องว่าง</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/manage-accommodation/hotels/${hotelId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Icon name="edit" className="size-3.5" /> แก้ไขโรงแรม / ประเภทห้อง
          </Link>
          <Button type="button" onClick={openCreate} disabled={activeRoomTypes.length === 0}>
            <Icon name="plus" className="size-3.5" /> สร้างการจอง
          </Button>
        </div>
      </div>

      {/* Availability grid */}
      <AvailabilityGrid hotelId={hotelId} />

      {/* Bookings */}
      <div>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                  tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600 hover:text-gray-900',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative lg:max-w-xs lg:flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="ค้นหา code / ชื่อลูกค้า / เบอร์"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isPending && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            <Icon name="spinner" spin className="mr-2 size-4" /> กำลังโหลด...
          </div>
        )}

        {!isPending && items.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Icon name="bookings" className="size-5" />
            </div>
            <p className="text-sm text-gray-500">
              {tab === 'ALL' ? 'ยังไม่มีการจอง' : `ไม่มีการจองในสถานะ "${TABS.find((t) => t.key === tab)?.label}"`}
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Code / สถานะ</th>
                    <th className="px-4 py-3 text-left">ลูกค้า</th>
                    <th className="px-4 py-3 text-left">วันเข้าพัก</th>
                    <th className="px-4 py-3 text-left">ห้อง</th>
                    <th className="px-4 py-3 text-right">ยอด</th>
                    <th className="px-4 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((b) => {
                    const sb = statusBadge[b.status] ?? statusBadge.PENDING!
                    const nightsB = Math.max(
                      1,
                      Math.round(
                        (new Date(b.checkout).getTime() - new Date(b.checkin).getTime()) / 86_400_000,
                      ),
                    )
                    return (
                      <tr key={b.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 align-middle">
                          <div className="font-mono text-[11px] text-gray-700">{b.code}</div>
                          <Badge variant={sb.variant} dot>{sb.label}</Badge>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="font-medium text-gray-900">{b.customerName}</div>
                          <div className="text-[11px] text-gray-500">
                            {b.customerPhone ?? '—'}
                            {b.customerEmail && <> · {b.customerEmail}</>}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="text-gray-900">
                            {new Date(b.checkin).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                            <span className="mx-1.5 text-gray-300">→</span>
                            {new Date(b.checkout).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                          </div>
                          <div className="text-[11px] text-gray-500">{nightsB} คืน · {b.guestCount} ท่าน</div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="space-y-0.5">
                            {b.lines.map((l) => (
                              <div key={l.id} className="text-[11px]">
                                <span className="font-medium text-gray-700">{(l.roomType.name as { th?: string })?.th}</span>{' '}
                                <span className="text-gray-500">× {l.roomsReserved}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right align-middle font-semibold tabular-nums text-gray-900">
                          ฿{Number(b.totalAmount).toLocaleString('th-TH')}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center justify-end gap-1">
                            {b.status === 'PENDING' && (
                              <button
                                type="button"
                                title="ยืนยัน"
                                onClick={() => confirmMut.mutate({ id: b.id })}
                                className="flex size-8 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50"
                              >
                                <Icon name="check" className="size-4" />
                              </button>
                            )}
                            {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                              <button
                                type="button"
                                title="ยกเลิก"
                                onClick={() => {
                                  const reason = prompt(`ยกเลิกการจอง ${b.code}?\n(ระบุเหตุผล — optional)`)
                                  if (reason !== null) cancelMut.mutate({ id: b.id, reason: reason || undefined })
                                }}
                                className="flex size-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                              >
                                <Icon name="close" className="size-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 text-xs text-gray-500">
              ทั้งหมด {items.length} รายการ
            </div>
          </div>
        )}
      </div>

      {/* Create booking modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="สร้างการจอง" size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate({
              hotelId,
              customerName: form.customerName,
              customerPhone: form.customerPhone || undefined,
              customerEmail: form.customerEmail || undefined,
              guestCount: form.guestCount,
              checkin: new Date(form.checkin + 'T00:00:00.000Z'),
              checkout: new Date(form.checkout + 'T00:00:00.000Z'),
              lines: form.lines.filter((l) => l.roomTypeId && l.roomsReserved > 0),
              publicNote: form.publicNote || undefined,
            })
          }}
        >
          <ModalBody className="space-y-5">
            {/* Customer */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">ข้อมูลลูกค้า</div>
              <div className="space-y-3">
                <div>
                  <Label required htmlFor="b-name">ชื่อ-นามสกุล</Label>
                  <Input id="b-name" required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="b-phone">เบอร์โทร</Label>
                    <Input id="b-phone" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="b-email">อีเมล</Label>
                    <Input id="b-email" type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
                  </div>
                  <div>
                    <Label required htmlFor="b-guests">ผู้เข้าพัก</Label>
                    <Input id="b-guests" type="number" min={1} required value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })} />
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">วันที่</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required htmlFor="b-in">เช็คอิน</Label>
                  <Input id="b-in" type="date" required value={form.checkin} onChange={(e) => setForm({ ...form, checkin: e.target.value })} />
                </div>
                <div>
                  <Label required htmlFor="b-out">เช็คเอาท์</Label>
                  <Input id="b-out" type="date" required value={form.checkout} onChange={(e) => setForm({ ...form, checkout: e.target.value })} />
                </div>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">{nights} คืน</p>
            </div>

            {/* Lines */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">ห้องที่จอง</span>
                <Button type="button" size="sm" variant="outline" onClick={addLine}>
                  <Icon name="plus" className="size-3" /> เพิ่ม
                </Button>
              </div>
              <div className="space-y-2">
                {form.lines.map((line, i) => {
                  const rt = activeRoomTypes.find((r) => r.id === line.roomTypeId)
                  const lineSubtotal = rt ? Number(rt.pricePerNight) * line.roomsReserved * nights : 0
                  return (
                    <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={`l-rt-${i}`} className="text-[11px]">ประเภทห้อง</Label>
                        <Select
                          id={`l-rt-${i}`}
                          value={line.roomTypeId}
                          onChange={(e) => setLine(i, { roomTypeId: e.target.value })}
                        >
                          <option value="">-- เลือก --</option>
                          {activeRoomTypes.map((r) => {
                            const n = (r.name as { th?: string })?.th ?? r.id
                            return (
                              <option key={r.id} value={r.id}>
                                {n} (฿{Number(r.pricePerNight).toLocaleString('th-TH')}/คืน · มี {r.totalInventory} ห้อง)
                              </option>
                            )
                          })}
                        </Select>
                      </div>
                      <div className="w-24">
                        <Label htmlFor={`l-qty-${i}`} className="text-[11px]">จำนวน</Label>
                        <Input
                          id={`l-qty-${i}`}
                          type="number"
                          min={1}
                          value={line.roomsReserved}
                          onChange={(e) => setLine(i, { roomsReserved: Number(e.target.value) })}
                        />
                      </div>
                      <div className="w-28 text-right text-sm tabular-nums">
                        <div className="text-[10px] text-gray-500">รวมแถวนี้</div>
                        <div className="font-semibold text-gray-900">฿{lineSubtotal.toLocaleString('th-TH')}</div>
                      </div>
                      {form.lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          className="flex size-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                          title="ลบแถว"
                        >
                          <Icon name="trash" className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="b-note">หมายเหตุ</Label>
              <Input id="b-note" value={form.publicNote} onChange={(e) => setForm({ ...form, publicNote: e.target.value })} />
            </div>

            <div className="rounded-xl bg-brand-50 px-4 py-3 ring-1 ring-inset ring-brand-200">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-brand-800">ยอดรวมโดยประมาณ</span>
                <span className="text-xl font-bold text-brand-900 tabular-nums">
                  ฿{estimatedTotal.toLocaleString('th-TH')}
                </span>
              </div>
              <p className="mt-1 text-[10.5px] text-brand-700">
                ราคา snapshot ณ ตอนสร้าง booking — ราคาจริงจะเช็คตอน server validate
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Icon name="spinner" spin className="size-3.5" />}
              สร้าง (PENDING)
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
