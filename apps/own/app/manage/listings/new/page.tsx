'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button, Card, Input, Label, Select } from '@pms/ui'

export default function NewListingPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    nameTh: '',
    type: 'POOL_VILLA' as 'POOL_VILLA' | 'LOFT' | 'BNB',
    totalBedrooms: 1,
    totalBathrooms: 1,
    defaultVariantMaxGuests: 2,
    areaSqwa: '',
    contactInfo: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = trpc.property.create.useMutation({
    onSuccess: (created) => {
      router.push(`/manage/listings/${created.id}/edit`)
      router.refresh()
    },
    onError: (e) => {
      setError(e.message)
      setSubmitting(false)
    },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.nameTh.trim()) return setError('กรุณาใส่ชื่อที่พัก')
    setSubmitting(true)
    create.mutate({
      name: { th: form.nameTh.trim() },
      type: form.type,
      totalBedrooms: form.totalBedrooms,
      totalBathrooms: form.totalBathrooms,
      defaultVariantMaxGuests: form.defaultVariantMaxGuests,
      areaSqwa: form.areaSqwa ? Number(form.areaSqwa) : undefined,
      contactInfo: form.contactInfo.trim() || undefined,
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <Link href="/manage/listings" className="text-sm text-gray-600 hover:text-gray-900">
          ← กลับ
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">เพิ่มที่พักใหม่</h1>
      <p className="mt-1 text-sm text-gray-600">กรอกข้อมูลเบื้องต้น — รายละเอียดอื่นแก้ภายหลังได้</p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label required htmlFor="nameTh">
              ชื่อที่พัก (ภาษาไทย)
            </Label>
            <Input
              id="nameTh"
              value={form.nameTh}
              onChange={(e) => setForm({ ...form, nameTh: e.target.value })}
              placeholder="เช่น Sunset Pool Villa"
              required
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="type">ประเภทที่พัก</Label>
            <Select
              id="type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
            >
              <option value="POOL_VILLA">พูลวิลล่า</option>
              <option value="LOFT">ลอฟ</option>
              <option value="BNB">B&B</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required htmlFor="totalBedrooms">
                จำนวนห้องนอน
              </Label>
              <Input
                id="totalBedrooms"
                type="number"
                min={1}
                max={50}
                value={form.totalBedrooms}
                onChange={(e) => setForm({ ...form, totalBedrooms: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label required htmlFor="totalBathrooms">
                จำนวนห้องน้ำ
              </Label>
              <Input
                id="totalBathrooms"
                type="number"
                min={1}
                max={50}
                value={form.totalBathrooms}
                onChange={(e) => setForm({ ...form, totalBathrooms: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div>
            <Label required htmlFor="maxGuests">
              จำนวนผู้เข้าพักสูงสุด (เปิดทั้งหลัง)
            </Label>
            <Input
              id="maxGuests"
              type="number"
              min={1}
              max={100}
              value={form.defaultVariantMaxGuests}
              onChange={(e) => setForm({ ...form, defaultVariantMaxGuests: Number(e.target.value) })}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              ระบบจะสร้าง variant &quot;เปิดทั้งหลัง&quot; ให้อัตโนมัติ — ต่อมาสามารถเพิ่มแบบแบ่งห้องในหน้าแก้ไข
            </p>
          </div>

          <div>
            <Label htmlFor="areaSqwa">พื้นที่ใช้สอย (ตารางวา)</Label>
            <Input
              id="areaSqwa"
              type="number"
              min={0}
              step="0.01"
              value={form.areaSqwa}
              onChange={(e) => setForm({ ...form, areaSqwa: e.target.value })}
              placeholder="ไม่ระบุก็ได้"
            />
          </div>

          <div>
            <Label htmlFor="contactInfo">ข้อมูลติดต่อ/เช็คอิน</Label>
            <Input
              id="contactInfo"
              value={form.contactInfo}
              onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
              placeholder="ชื่อ, เบอร์โทร — เช่น สมชาย, 0987654321"
            />
          </div>

          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/manage/listings">
              <Button variant="secondary" type="button">
                ยกเลิก
              </Button>
            </Link>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : 'สร้างและไปแก้ไขรายละเอียด'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
