'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon, Input, Label, Select } from '@pms/ui'
import { RoomTypeManager } from './RoomTypeManager'

const reviewBadge: Record<string, { label: string; variant: 'pending' | 'success' | 'danger' | 'default' }> = {
  PENDING: { label: 'รอตรวจสอบ', variant: 'pending' },
  ACTIVE: { label: 'อนุมัติแล้ว', variant: 'success' },
  INACTIVE: { label: 'ปิด', variant: 'default' },
  REJECTED: { label: 'ถูกปฏิเสธ', variant: 'danger' },
}

export function HotelEditor({ id }: { id: string }) {
  const utils = trpc.useUtils()
  const { data: hotel, isPending } = trpc.admin.hotel.byId.useQuery({ id })
  const { data: types } = trpc.admin.hotelType.list.useQuery()

  const [form, setForm] = useState({
    nameTh: '',
    hotelType: '',
    description: '',
    address: '',
    phone: '',
    email: '',
  })
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!hotel) return
    setForm({
      nameTh: (hotel.name as { th?: string })?.th ?? '',
      hotelType: hotel.hotelType,
      description: hotel.description ?? '',
      address: hotel.address ?? '',
      phone: hotel.phone ?? '',
      email: hotel.email ?? '',
    })
  }, [hotel])

  const update = trpc.admin.hotel.update.useMutation({
    onSuccess: () => {
      utils.admin.hotel.byId.invalidate({ id })
      setSavedAt(new Date())
    },
    onError: (e) => alert(e.message),
  })

  if (isPending || !hotel) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        กำลังโหลด...
      </div>
    )
  }

  const badge = reviewBadge[hotel.reviewStatus] ?? reviewBadge.PENDING!

  function save() {
    update.mutate({
      id,
      name: { th: form.nameTh },
      hotelType: form.hotelType,
      description: form.description || null,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
    })
  }

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
          <div className="mb-1.5 flex items-center gap-2">
            <Badge variant={badge.variant} dot>{badge.label}</Badge>
            {!hotel.isActive && <Badge variant="default">ปิด</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{form.nameTh || '—'}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px]">{hotel.code}</code>
            <span>·</span>
            <span>เจ้าของ: {hotel.owner.name}</span>
          </p>
        </div>
        <Link
          href={`/manage-accommodation/hotels/${id}/bookings`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <Icon name="bookings" className="size-4" />
          ดูการจอง + เช็คห้องว่าง
        </Link>
      </div>

      {/* Hotel info section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">ข้อมูลโรงแรม</h2>
        <div className="space-y-4">
          <div>
            <Label required htmlFor="h-name">ชื่อโรงแรม (ภาษาไทย)</Label>
            <Input
              id="h-name"
              required
              value={form.nameTh}
              onChange={(e) => setForm({ ...form, nameTh: e.target.value })}
            />
          </div>
          <div>
            <Label required htmlFor="h-type">ประเภทโรงแรม</Label>
            <Select
              id="h-type"
              value={form.hotelType}
              onChange={(e) => setForm({ ...form, hotelType: e.target.value })}
            >
              {(types ?? []).filter((t) => t.isActive || t.code === form.hotelType).map((t) => (
                <option key={t.code} value={t.code}>{t.nameTh}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="h-phone">เบอร์โทร</Label>
              <Input id="h-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="h-email">อีเมล</Label>
              <Input id="h-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="h-addr">ที่อยู่</Label>
            <Input id="h-addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="h-desc">คำอธิบาย</Label>
            <Input id="h-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div className="text-xs text-gray-500">
              {savedAt && `บันทึกล่าสุด ${savedAt.toLocaleTimeString('th-TH')}`}
            </div>
            <Button type="button" onClick={save} disabled={update.isPending}>
              {update.isPending && <Icon name="spinner" spin className="size-3.5" />}
              บันทึก
            </Button>
          </div>
        </div>
      </div>

      {/* Room types section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <RoomTypeManager hotelId={id} />
      </div>
    </div>
  )
}
