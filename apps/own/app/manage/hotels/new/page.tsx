'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button, Card, Icon, Input, Label, cn, type IconName } from '@pms/ui'

export default function NewHotelPage() {
  const router = useRouter()
  const { data: types } = trpc.hotel.types.useQuery()

  const [form, setForm] = useState({
    nameTh: '',
    hotelType: '',
    description: '',
    address: '',
    phone: '',
    email: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (types && types.length > 0 && !form.hotelType) {
      setForm((f) => ({ ...f, hotelType: types[0]!.code }))
    }
  }, [types, form.hotelType])

  const create = trpc.hotel.create.useMutation({
    onSuccess: (created) => {
      router.push(`/manage/hotels/${created.id}/edit`)
      router.refresh()
    },
    onError: (e) => setError(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.nameTh.trim()) return setError('กรุณาใส่ชื่อโรงแรม')
    if (!form.hotelType) return setError('กรุณาเลือกประเภทโรงแรม')
    create.mutate({
      name: { th: form.nameTh.trim() },
      hotelType: form.hotelType,
      description: form.description.trim() || undefined,
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/manage/hotels"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
      >
        <Icon name="arrowLeft" className="size-3.5" /> กลับ
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">เพิ่มโรงแรมใหม่</h1>
        <p className="mt-1 text-sm text-gray-600">
          กรอกข้อมูลเบื้องต้น — เพิ่มประเภทห้องและเริ่มรับจองได้หลังบันทึก
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label required>ประเภทโรงแรม</Label>
            {!types && (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 text-center text-sm text-gray-500">
                <Icon name="spinner" spin className="mr-2 size-4" /> กำลังโหลด...
              </div>
            )}
            {types && types.length === 0 && (
              <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
                ยังไม่มีประเภทโรงแรม — แจ้ง Admin ให้เพิ่มก่อน
              </div>
            )}
            {types && types.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {types.map((t) => {
                  const active = form.hotelType === t.code
                  return (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => setForm({ ...form, hotelType: t.code })}
                      className={cn(
                        'group relative flex flex-col items-center gap-2 rounded-xl border-2 px-2 py-3 text-center transition-all',
                        active
                          ? 'border-brand-500 bg-brand-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300',
                      )}
                    >
                      <div
                        className={cn(
                          'flex size-9 items-center justify-center rounded-xl transition-colors',
                          active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500',
                        )}
                      >
                        <Icon name={(t.iconRef as IconName) ?? 'bed'} className="size-4" />
                      </div>
                      <div>
                        <div className={cn('text-sm font-semibold', active ? 'text-brand-700' : 'text-gray-900')}>
                          {t.nameTh}
                        </div>
                        {t.desc && <div className="mt-0.5 text-[10px] text-gray-500">{t.desc}</div>}
                      </div>
                      {active && (
                        <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-brand-600 text-white">
                          <Icon name="check" className="size-2.5" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <Label required htmlFor="nameTh">ชื่อโรงแรม (ภาษาไทย)</Label>
            <Input
              id="nameTh"
              required
              autoFocus
              placeholder="เช่น Sunset Resort"
              value={form.nameTh}
              onChange={(e) => setForm({ ...form, nameTh: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">เบอร์โทร</Label>
              <Input
                id="phone"
                placeholder="02-123-4567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@hotel.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">ที่อยู่</Label>
            <Input
              id="address"
              placeholder="เลขที่ ถนน เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">คำอธิบาย</Label>
            <Input
              id="description"
              placeholder="โรงแรมริมหาด พร้อมสระว่ายน้ำ ฯลฯ"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="rounded-lg bg-brand-50/50 px-3 py-2.5 text-xs text-brand-800 ring-1 ring-inset ring-brand-200/60">
            💡 หลังบันทึก คุณจะไปที่หน้าแก้ไขเพื่อเพิ่ม &quot;ประเภทห้อง&quot; (เช่น Deluxe King, Suite)
            พร้อมกำหนดราคา + จำนวนห้องทั้งหมด
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
            <Link href="/manage/hotels">
              <Button variant="secondary" type="button">ยกเลิก</Button>
            </Link>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Icon name="spinner" spin className="size-3.5" />}
              สร้างและไปแก้ไขรายละเอียด
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
