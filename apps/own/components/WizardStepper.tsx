'use client'

import Link from 'next/link'
import { Icon, cn } from '@pms/ui'

/**
 * 10-step progress indicator for the new-listing onboarding wizard.
 *
 *   Pre-property (no id yet):
 *     1. ประเภทที่พัก   — /new
 *     2. ข้อมูลพื้นฐาน  — /new/form
 *
 *   Post-property (id exists):
 *     3. สิ่งอำนวยฯ    — /[id]/amenities
 *     4. รูปภาพ        — /[id]/photos
 *     5. เสริมคน       — /[id]/policies
 *     6. พื้นที่        — /[id]/area
 *     7. รายละเอียด    — /[id]/details
 *     8. จุดเด่น       — /[id]/highlights
 *     9. ปฏิทิน        — /[id]/ical
 *    10. กฎที่พัก       — /[id]/rules
 *
 * Design: a thin progress bar + a prominent current-step indicator + a clickable
 * trail of step circles below. Designed to stay readable at 10 steps without
 * cramming wrapped labels into narrow columns.
 */

export interface WizardStep {
  /** 1-indexed step number */
  num: number
  /** Label shown for this step */
  label: string
  /** Short identifier (matches the route segment for post-property steps). */
  slug: string
  /** Build the href for this step. Returns null if it isn't navigable yet. */
  href: (propertyId?: string) => string | null
}

// "สถานที่ใกล้เคียง" #4, "เสริมคนเข้าพัก" #5 — collect proximity + extra-guest
// pricing early so amenity/photo choices have full context.
export const WIZARD_STEPS: WizardStep[] = [
  { num: 1,  label: 'ประเภทบ้าน',       slug: 'new',         href: () => '/manage/listings/new' },
  { num: 2,  label: 'ชื่อที่พัก',        slug: 'name',        href: () => '/manage/listings/new/name' },
  { num: 3,  label: 'ข้อมูลพื้นฐาน',    slug: 'form',        href: () => '/manage/listings/new/form' },
  { num: 4,  label: 'สถานที่ใกล้เคียง',  slug: 'details',     href: (id) => (id ? `/manage/listings/${id}/details` : null) },
  { num: 5,  label: 'เสริมคนเข้าพัก',   slug: 'policies',    href: (id) => (id ? `/manage/listings/${id}/policies` : null) },
  { num: 6,  label: 'สิ่งอำนวยฯ',       slug: 'amenities',   href: (id) => (id ? `/manage/listings/${id}/amenities` : null) },
  { num: 7,  label: 'รูปภาพ',           slug: 'photos',      href: (id) => (id ? `/manage/listings/${id}/photos` : null) },
  { num: 8,  label: 'พื้นที่',           slug: 'area',        href: (id) => (id ? `/manage/listings/${id}/area` : null) },
  { num: 9,  label: 'เชื่อมต่อ OTA',    slug: 'ical',        href: (id) => (id ? `/manage/listings/${id}/ical` : null) },
  { num: 10, label: 'นโยบายที่พัก',     slug: 'rules',       href: (id) => (id ? `/manage/listings/${id}/rules` : null) },
]

const TOTAL_STEPS = WIZARD_STEPS.length

interface Props {
  /** Property id from the URL — required for post-property steps (3-10). */
  propertyId?: string
  /** Current step (1–10). */
  current: number
  /** Optional className for outer wrapper. */
  className?: string
}

export function WizardStepper({ propertyId, current, className }: Props) {
  const currentStep = WIZARD_STEPS.find((s) => s.num === current)
  const pct = Math.round(((current - 1) / (TOTAL_STEPS - 1)) * 100)
  return (
    <div className={cn('mb-6 rounded-2xl border border-gray-200 bg-white p-4', className)}>
      {/* Top row: prominent "ขั้นที่ X / N — label" + percent */}
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white">
            ขั้นที่ {current} / {TOTAL_STEPS}
          </span>
          <span className="truncate text-base font-bold text-gray-900">
            {currentStep?.label ?? ''}
          </span>
        </div>
        <span className="shrink-0 text-xs font-medium text-gray-500">{pct}%</span>
      </div>

      {/* Thin filled progress bar (per-segment so completed segments show clearly) */}
      <div className="mb-3 flex h-1.5 gap-0.5">
        {WIZARD_STEPS.map((step) => (
          <div
            key={step.num}
            className={cn(
              'flex-1 rounded-full transition-colors',
              step.num < current && 'bg-brand-500',
              step.num === current && 'bg-brand-600',
              step.num > current && 'bg-gray-200',
            )}
          />
        ))}
      </div>

      {/* Step trail — small clickable circles for jumping between steps.
          Post-property steps (4-10) are always clickable when propertyId exists, so
          editors can jump freely. Pre-property steps (1-3) only become clickable when
          already completed (sequential progression for the add-flow). */}
      <div className="-mx-1 flex items-center justify-between overflow-x-auto px-1 pb-1">
        {WIZARD_STEPS.map((step) => {
          const isDone = step.num < current
          const isActive = step.num === current
          const href = step.href(propertyId)
          const isPostPropertyEditable = step.num >= 4 && !!propertyId
          const linkable = href !== null && !isActive && (isDone || isPostPropertyEditable)
          const circle = (
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all',
                  isActive && 'bg-brand-600 text-white ring-4 ring-brand-100',
                  isDone && 'bg-brand-600 text-white',
                  !isActive && !isDone && 'border border-gray-300 bg-white text-gray-400',
                )}
              >
                {isDone ? <Icon name="check" className="size-3" /> : step.num}
              </div>
              {/* Only show label on the active step here to avoid cramming;
                  the top row already shows the active label prominently. */}
              <span
                className={cn(
                  'text-[10px] leading-tight',
                  isActive ? 'font-bold text-brand-700' : 'text-gray-400',
                )}
              >
                {isActive ? '' : step.num}
              </span>
            </div>
          )
          return (
            <div key={step.num} className="flex-1 min-w-[28px]">
              {linkable ? (
                <Link
                  href={href}
                  className="block transition-opacity hover:opacity-70"
                  title={`ย้อนกลับไป: ${step.label}`}
                >
                  {circle}
                </Link>
              ) : (
                <div title={step.label}>{circle}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
