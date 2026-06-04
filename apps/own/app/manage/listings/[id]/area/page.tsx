'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button, Icon, Input } from '@pms/ui'
import { WizardStepper } from '@/components/WizardStepper'
import { LocationSection } from '@/components/sections/LocationSection'

/**
 * Onboarding step 6 — area / location / coordinates / distance + on-arrival
 * contact info. Contact field was moved here from the (now renamed) /details
 * step so the owner provides location-related touchpoints in one place.
 */
export default function ListingAreaPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const utils = trpc.useUtils()
  const { data: property } = trpc.property.byId.useQuery({ id })
  const updateProperty = trpc.property.update.useMutation({
    onSuccess: () => utils.property.byId.invalidate({ id }),
  })

  const [contactInfo, setContactInfo] = useState('')
  const [contactSavedAt, setContactSavedAt] = useState<Date | null>(null)

  // Hydrate from existing property record
  useEffect(() => {
    if (property?.contactInfo) setContactInfo(property.contactInfo)
  }, [property?.contactInfo])

  async function saveContact() {
    await updateProperty.mutateAsync({ id, contactInfo: contactInfo || null })
    setContactSavedAt(new Date())
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <Link
        href={`/manage/listings/${id}/photos`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-brand-700"
      >
        <Icon name="chevronLeft" className="size-3.5" />
        ย้อนกลับ
      </Link>

      <h1 className="mb-5 text-2xl font-bold tracking-tight text-gray-900">
        ข้อมูลพื้นที่
      </h1>

      <WizardStepper propertyId={id} current={8} />

      <LocationSection propertyId={id} />

      {/* Contact info — moved from /details step. Lives in its own card so it
          matches the card-based layout of LocationSection. */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
          <div className="text-sm font-bold text-gray-900">
            วันเข้าพักติดต่อ <span className="ml-0.5 text-red-500">*</span>
          </div>
          <div className="mt-0.5 text-xs text-gray-500">
            ข้อมูลผู้ติดต่อสำหรับวันเข้าพัก — แขกจะเห็นเมื่อยืนยันการจอง
          </div>
        </div>
        <div className="space-y-3 p-5">
          <Input
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="ตัวอย่าง คุณแอม 08XXXXXXX , คุณเมย์ 08XXXXXXX"
          />
          <p className="flex items-center gap-1 text-[11px] text-gray-500">
            <Icon name="info" className="size-3" />
            กรุณากรอก ชื่อ เบอร์โทรศัพท์ ต่อด้วย ,
          </p>
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <div className="text-xs text-gray-500">
              {contactSavedAt && `บันทึกล่าสุด ${contactSavedAt.toLocaleTimeString('th-TH')}`}
            </div>
            <Button
              type="button"
              onClick={saveContact}
              disabled={updateProperty.isPending}
            >
              {updateProperty.isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูลติดต่อ'}
            </Button>
          </div>
        </div>
      </div>

      {/* Sticky footer — padding wrapper matches ManageShell main so inner max-w-3xl
          aligns with the page cards above. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href={`/manage/listings/${id}/photos`}>
            <Button variant="secondary" type="button">
              <Icon name="chevronLeft" className="size-3.5" />
              ย้อนกลับ
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => router.push(`/manage/listings/${id}/ical`)}
            >
              ข้าม
            </Button>
            <Button
              type="button"
              onClick={() => router.push(`/manage/listings/${id}/ical`)}
            >
              ดำเนินการต่อ
              <Icon name="chevronRight" className="size-3.5" />
            </Button>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
