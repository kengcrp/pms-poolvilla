'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Icon, Input, Label, Select } from '@pms/ui'
import { RoomTypeManager } from './RoomTypeManager'
import { HotelImagesSection } from './HotelImagesSection'

const reviewBadge: Record<string, { label: string; variant: 'pending' | 'success' | 'danger' | 'default' }> = {
  PENDING: { label: 'รอตรวจสอบ', variant: 'pending' },
  ACTIVE: { label: 'เปิดใช้งาน', variant: 'success' },
  INACTIVE: { label: 'ปิด', variant: 'default' },
  REJECTED: { label: 'ถูกปฏิเสธ', variant: 'danger' },
}

export function HotelEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const utils = trpc.useUtils()
  const { data: hotel, isPending } = trpc.hotel.byId.useQuery({ id })
  const { data: types } = trpc.hotel.types.useQuery()

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

  const update = trpc.hotel.update.useMutation({
    onSuccess: () => {
      utils.hotel.byId.invalidate({ id })
      setSavedAt(new Date())
    },
    onError: (e) => alert(e.message),
  })
  const toggleActive = trpc.hotel.setActive.useMutation({
    onSuccess: () => utils.hotel.byId.invalidate({ id }),
  })
  const remove = trpc.hotel.delete.useMutation({
    onSuccess: () => {
      router.push('/manage/hotels')
      router.refresh()
    },
  })

  if (isPending || !hotel) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          กำลังโหลด...
        </div>
      </div>
    )
  }

  const badge = reviewBadge[hotel.reviewStatus] ?? reviewBadge.PENDING!

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/manage/hotels" className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
        <Icon name="arrowLeft" className="size-3.5" /> กลับ
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <Badge variant={badge.variant} dot>{badge.label}</Badge>
            {!hotel.isActive && <Badge variant="default">หยุดให้บริการ</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{form.nameTh || '—'}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px]">{hotel.code}</code>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/manage/hotels/${id}/bookings`}>
            <Button>
              <Icon name="bookings" className="size-3.5" /> ดูการจอง + ห้องว่าง
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => toggleActive.mutate({ id, isActive: !hotel.isActive })} disabled={toggleActive.isPending}>
            {hotel.isActive ? 'หยุดให้บริการ' : 'เปิดให้บริการ'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={remove.isPending}
            onClick={() => {
              if (confirm(`ลบ "${form.nameTh}" ออกจากระบบ?`)) remove.mutate({ id })
            }}
          >
            <Icon name="trash" className="size-3.5" />
            ลบโรงแรม
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">ข้อมูลโรงแรม</h2>
          <div className="space-y-4">
            <div>
              <Label required htmlFor="h-name">ชื่อโรงแรม (ภาษาไทย)</Label>
              <Input id="h-name" required value={form.nameTh} onChange={(e) => setForm({ ...form, nameTh: e.target.value })} />
            </div>
            <div>
              <Label required htmlFor="h-type">ประเภทโรงแรม</Label>
              <Select id="h-type" value={form.hotelType} onChange={(e) => setForm({ ...form, hotelType: e.target.value })}>
                {(types ?? []).map((t) => <option key={t.code} value={t.code}>{t.nameTh}</option>)}
                {form.hotelType && !types?.some((t) => t.code === form.hotelType) && (
                  <option value={form.hotelType}>{form.hotelType} (ปิดใช้)</option>
                )}
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
              <Button type="button" onClick={() => update.mutate({
                id,
                name: { th: form.nameTh },
                hotelType: form.hotelType,
                description: form.description || null,
                address: form.address || null,
                phone: form.phone || null,
                email: form.email || null,
              })} disabled={update.isPending}>
                {update.isPending && <Icon name="spinner" spin className="size-3.5" />}
                บันทึกข้อมูลโรงแรม
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <HotelImagesSection hotelId={id} />
        </Card>

        <Card className="p-6">
          <RoomTypeManager hotelId={id} />
        </Card>
      </div>
    </div>
  )
}
