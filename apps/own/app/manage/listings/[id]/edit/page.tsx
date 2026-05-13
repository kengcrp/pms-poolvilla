'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Input, Label, Select } from '@pms/ui'
import { Section } from '@/components/Section'
import { VariantManager } from '@/components/VariantManager'
import { LocationSection } from '@/components/sections/LocationSection'
import { PolicySection } from '@/components/sections/PolicySection'
import { AmenitySection } from '@/components/sections/AmenitySection'
import { IcalSyncSection } from '@/components/sections/IcalSyncSection'

const reviewStatusLabel: Record<string, { label: string; variant: 'pending' | 'success' | 'danger' | 'default' }> = {
  PENDING: { label: 'รอการตรวจสอบ', variant: 'pending' },
  ACTIVE: { label: 'เปิดใช้งาน', variant: 'success' },
  INACTIVE: { label: 'ปิดใช้งาน', variant: 'default' },
  REJECTED: { label: 'ปฏิเสธ', variant: 'danger' },
}

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const utils = trpc.useUtils()

  const { data: property, isPending, error } = trpc.property.byId.useQuery({ id })
  const update = trpc.property.update.useMutation({
    onSuccess: () => utils.property.byId.invalidate({ id }),
  })
  const toggleActive = trpc.property.toggleActive.useMutation({
    onSuccess: () => utils.property.byId.invalidate({ id }),
  })
  const remove = trpc.property.delete.useMutation({
    onSuccess: () => {
      router.push('/manage/listings')
      router.refresh()
    },
  })

  const [form, setForm] = useState({
    nameTh: '',
    type: 'POOL_VILLA',
    totalBedrooms: 0,
    totalBathrooms: 0,
    areaSqwa: '',
    contactInfo: '',
    partnerListing: false,
  })
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!property) return
    setForm({
      nameTh: (property.name as { th?: string })?.th ?? '',
      type: property.type,
      totalBedrooms: property.totalBedrooms,
      totalBathrooms: property.totalBathrooms,
      areaSqwa: property.areaSqwa?.toString() ?? '',
      contactInfo: property.contactInfo ?? '',
      partnerListing: property.partnerListing,
    })
  }, [property])

  if (isPending) {
    return <div className="text-sm text-gray-500">กำลังโหลด...</div>
  }
  if (error || !property) {
    return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-inset ring-red-200">ไม่พบที่พัก</div>
  }

  const status = reviewStatusLabel[property.reviewStatus] ?? reviewStatusLabel.PENDING!

  async function saveSection1() {
    setSaving(true)
    try {
      await update.mutateAsync({
        id,
        name: { th: form.nameTh },
        type: form.type as 'POOL_VILLA' | 'LOFT' | 'BNB',
        totalBedrooms: form.totalBedrooms,
        totalBathrooms: form.totalBathrooms,
        areaSqwa: form.areaSqwa ? Number(form.areaSqwa) : null,
        contactInfo: form.contactInfo || null,
        partnerListing: form.partnerListing,
      })
      setSavedAt(new Date())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/manage/listings"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
      >
        <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
        กลับ
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <Badge variant={status.variant} dot>
              {status.label}
            </Badge>
            {!property.isActive && <Badge variant="default">หยุดให้บริการ</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{form.nameTh || '—'}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px]">{property.code}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toggleActive.mutate({ id })}
            disabled={toggleActive.isPending}
          >
            {property.isActive ? 'หยุดให้บริการ' : 'เปิดให้บริการ'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm(`ลบ "${form.nameTh}" ออกจากระบบ?`)) remove.mutate({ id })
            }}
            disabled={remove.isPending}
          >
            ลบ
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Section num={1} title="ข้อมูลที่พัก" description="ข้อมูลเบื้องต้น + รูปแบบการเปิดขาย" defaultOpen>
          <div className="space-y-5">
            <div>
              <Label required htmlFor="nameTh">
                ชื่อที่พัก (ภาษาไทย)
              </Label>
              <Input
                id="nameTh"
                value={form.nameTh}
                onChange={(e) => setForm({ ...form, nameTh: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">ประเภทที่พัก</Label>
                <Select
                  id="type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="POOL_VILLA">พูลวิลล่า</option>
                  <option value="LOFT">ลอฟ</option>
                  <option value="BNB">B&B</option>
                </Select>
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
                />
              </div>
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
                  value={form.totalBedrooms}
                  onChange={(e) => setForm({ ...form, totalBedrooms: Number(e.target.value) })}
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
                  value={form.totalBathrooms}
                  onChange={(e) => setForm({ ...form, totalBathrooms: Number(e.target.value) })}
                />
              </div>
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

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.partnerListing}
                onChange={(e) => setForm({ ...form, partnerListing: e.target.checked })}
                className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">ต้องการลงประกาศกับพาทเนอร์</span>
            </label>

            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <div className="text-xs text-gray-500">
                {savedAt && `บันทึกล่าสุด ${savedAt.toLocaleTimeString('th-TH')}`}
              </div>
              <Button onClick={saveSection1} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลที่พัก'}
              </Button>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-5">
              <VariantManager propertyId={id} totalBedrooms={form.totalBedrooms} />
            </div>
          </div>
        </Section>

        <Section num={2} title="ข้อมูลประเภทที่พัก" description="คุณสมบัติเสริม (ลอฟ / มีอาหารเช้า ฯลฯ)">
          <PlaceholderUnderConstruction />
        </Section>

        <Section num={3} title="ข้อมูลรายละเอียดที่พัก" description="ข้อความหลายภาษา TH/EN/ZH">
          <PlaceholderUnderConstruction />
        </Section>

        <Section num={4} title="ข้อมูลพื้นที่" description="ที่ตั้ง + พิกัด + ระยะทาง">
          <LocationSection propertyId={id} />
        </Section>

        <Section num={5} title="จุดเด่น ฟังก์ชัน และสิ่งอำนวยความสะดวก">
          <AmenitySection propertyId={id} />
        </Section>

        <Section num={6} title="รูปภาพ" description="ปก + แกลเลอรี + 7 photo tours + 3D">
          <PlaceholderUnderConstruction />
        </Section>

        <Section num={7} title="ซิงค์ข้อมูลปฏิทิน" description="iCal URLs: Agoda / Booking / Airbnb / Trip / Expedia">
          <IcalSyncSection propertyId={id} />
        </Section>

        <Section num={8} title="กฎ และนโยบายที่พัก" description="เวลา check-in/out · นโยบายยกเลิก · แขกเพิ่ม · สัตว์เลี้ยง">
          <PolicySection propertyId={id} />
        </Section>
      </div>
    </div>
  )
}

function PlaceholderUnderConstruction() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
      <div className="text-2xl">🚧</div>
      <p className="mt-2 text-sm text-gray-500">ส่วนนี้กำลังพัฒนาใน Phase 1.x</p>
    </div>
  )
}
