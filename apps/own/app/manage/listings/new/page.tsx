'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button, Card, Icon, Input, Label, cn, type IconName } from '@pms/ui'

export default function NewListingPage() {
  const router = useRouter()
  const { data: types } = trpc.property.types.useQuery()
  const [form, setForm] = useState({
    nameTh: '',
    type: '',
    totalBedrooms: 1,
    totalBathrooms: 1,
    defaultVariantMaxGuests: 2,
    areaSqwa: '',
    contactInfo: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-select first type when list loads
  useEffect(() => {
    if (types && types.length > 0 && !form.type) {
      setForm((f) => ({ ...f, type: types[0]!.code }))
    }
  }, [types, form.type])

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
    if (!form.type) return setError('กรุณาเลือกประเภทที่พัก')
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
      <Link
        href="/manage/listings"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
      >
        <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
        กลับ
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">เพิ่มที่พักใหม่</h1>
        <p className="mt-1 text-sm text-gray-600">กรอกข้อมูลเบื้องต้น — รายละเอียดอื่นแก้ภายหลังได้</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label required>ประเภทที่พัก</Label>
            {!types && (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 text-center text-sm text-gray-500">
                <Icon name="spinner" spin className="mr-2 size-4" /> กำลังโหลดประเภท...
              </div>
            )}
            {types && types.length === 0 && (
              <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
                ยังไม่มีประเภทที่พักในระบบ — กรุณาให้ Admin เพิ่มก่อน
              </div>
            )}
            {types && types.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {types.map((opt) => {
                  const active = form.type === opt.code
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setForm({ ...form, type: opt.code })}
                      className={cn(
                        'group relative flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-all',
                        active
                          ? 'border-brand-500 bg-brand-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300',
                      )}
                    >
                      <div
                        className={cn(
                          'flex size-10 items-center justify-center rounded-xl transition-colors',
                          active
                            ? 'bg-brand-600 text-white'
                            : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200',
                        )}
                      >
                        <Icon name={(opt.iconRef as IconName) ?? 'home'} className="size-4" />
                      </div>
                      <div>
                        <div
                          className={cn(
                            'text-sm font-semibold',
                            active ? 'text-brand-700' : 'text-gray-900',
                          )}
                        >
                          {opt.nameTh}
                        </div>
                        {opt.desc && (
                          <div className="mt-0.5 text-[10.5px] text-gray-500">{opt.desc}</div>
                        )}
                      </div>
                      {active && (
                        <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-brand-600 text-white">
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label required htmlFor="totalBedrooms">
                ห้องนอน
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
                ห้องน้ำ
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
            <div>
              <Label required htmlFor="maxGuests">
                คนสูงสุด
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
            </div>
          </div>

          <div className="rounded-lg bg-brand-50/50 px-3 py-2.5 text-xs text-brand-800 ring-1 ring-inset ring-brand-200/60">
            💡 ระบบจะสร้าง variant &quot;เปิดทั้งหลัง&quot; ให้อัตโนมัติ — เพิ่มแบบแบ่งห้องในหน้าแก้ไขภายหลังได้
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

          {error && (
            <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
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
