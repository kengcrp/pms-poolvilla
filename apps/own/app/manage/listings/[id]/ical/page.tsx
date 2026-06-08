'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button, Icon } from '@pms/ui'
import { WizardStepper } from '@/components/WizardStepper'
import { IcalSyncSection } from '@/components/sections/IcalSyncSection'

/**
 * Onboarding step 7 — iCal sync URLs from OTA platforms (Agoda / Booking /
 * Airbnb / Trip / Expedia). Reuses the existing IcalSyncSection component.
 *
 * All fields optional — owner can skip and configure later from /edit.
 */
export default function ListingIcalPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <Link
        href={`/manage/listings/${id}/area`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-brand-700"
      >
        <Icon name="chevronLeft" className="size-3.5" />
        ย้อนกลับ
      </Link>

      <h1 className="mb-1 text-2xl font-bold tracking-tight text-gray-900">
        เชื่อมต่อ OTA
      </h1>
      <p className="mb-5 text-sm text-gray-600">
        วาง URL ของไฟล์ .ics จาก OTA แต่ละเจ้า (Agoda / Booking / Airbnb / Trip / Expedia) เพื่อ sync ปฏิทินอัตโนมัติ — เว้นว่างไว้ก็ได้
      </p>

      <WizardStepper propertyId={id} current={9} />

      <IcalSyncSection propertyId={id} />

      {/* Sticky footer — standardized to match every other wizard step
          (max-w-3xl centered, justify-between, gap-3). */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Link href={`/manage/listings/${id}/area`}>
              <Button variant="secondary" type="button">
                <Icon name="chevronLeft" className="size-3.5" />
                ย้อนกลับ
              </Button>
            </Link>
            <Button
              type="button"
              onClick={() => router.push(`/manage/listings/${id}/rules`)}
            >
              ดำเนินการต่อ
              <Icon name="chevronRight" className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
