'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button, Icon } from '@pms/ui'
import { WizardStepper } from '@/components/WizardStepper'
import { PolicySection } from '@/components/sections/PolicySection'

/**
 * Onboarding step 8 (final) — check-in/out times, deposit, cancellation /
 * postpone / house rules. Reuses the existing PolicySection.
 *
 * After this step, the wizard hands off to /edit for any remaining fine-tuning.
 */
export default function ListingRulesPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <Link
        href={`/manage/listings/${id}/ical`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-brand-700"
      >
        <Icon name="chevronLeft" className="size-3.5" />
        ย้อนกลับ
      </Link>

      <h1 className="mb-1 text-2xl font-bold tracking-tight text-gray-900">
        นโยบายที่พัก
      </h1>
      <p className="mb-5 text-sm text-gray-600">
        เวลา check-in/out · เงินมัดจำ · นโยบายยกเลิก · กฎบ้าน
      </p>

      <WizardStepper propertyId={id} current={10} />

      <PolicySection propertyId={id} />

      {/* Sticky footer — back / skip / done. Both sides use Button components for
          equal visual weight (avoids the lopsided "text-link vs. solid-button" feel). */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Link href={`/manage/listings/${id}/ical`}>
              <Button variant="secondary" type="button">
                <Icon name="chevronLeft" className="size-3.5" />
                ย้อนกลับ
              </Button>
            </Link>
            <Button
              type="button"
              onClick={() => router.push(`/manage/listings/${id}/edit`)}
            >
              ไปแก้ไขแบบละเอียด
              <Icon name="chevronRight" className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
