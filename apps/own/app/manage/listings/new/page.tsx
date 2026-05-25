'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Icon, type IconName, cn } from '@pms/ui'
import { WizardStepper } from '@/components/WizardStepper'

/** Custom outline-house SVG (matches the design mockup) — used by the "บ้าน" tile. */
const OutlineHouseIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth={6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {/* Chimney (solid block) on the right side of the roof */}
    <rect x="68" y="20" width="10" height="20" fill="currentColor" stroke="none" />
    {/* Roof — triangular peak */}
    <path d="M10 50 L 50 15 L 90 50" />
    {/* Walls — left/bottom/right */}
    <path d="M20 45 L 20 88 L 80 88 L 80 45" />
    {/* Door — centered, open top */}
    <path d="M40 88 L 40 60 L 60 60 L 60 88" />
  </svg>
)

/** Custom outline-bed SVG — used by the "ห้องพัก" tile so it visually matches the
 *  size + stroke weight of the other custom-outline icons (house, hotel, camp). */
const OutlineRoomIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth={5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {/* Headboard — tall vertical on the left */}
    <path d="M10 78 L 10 28 L 22 28 L 22 55" />
    {/* Mattress top edge (runs across to the footboard) */}
    <line x1="22" y1="55" x2="90" y2="55" />
    {/* Footboard — shorter post on the right */}
    <line x1="90" y1="55" x2="90" y2="78" />
    {/* Bed frame bottom edge */}
    <line x1="10" y1="78" x2="90" y2="78" />
    {/* Pillow at the head of the bed */}
    <rect x="30" y="44" width="24" height="11" />
    {/* Bed legs */}
    <line x1="14" y1="78" x2="14" y2="90" />
    <line x1="86" y1="78" x2="86" y2="90" />
  </svg>
)

/** Custom outline-tipi SVG (teepee/camp tent with crossed poles + triangular entrance). */
const OutlineCampIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth={5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {/* Two crossed poles sticking out at the very top */}
    <line x1="42" y1="12" x2="58" y2="22" />
    <line x1="58" y1="12" x2="42" y2="22" />
    {/* Main tipi outline — triangle from the crossing point to the ground */}
    <path d="M50 18 L 12 88 L 88 88 Z" />
    {/* Triangular entrance — smaller triangle centered at bottom */}
    <path d="M50 50 L 34 88 L 66 88 Z" />
    {/* Ground line */}
    <line x1="6" y1="88" x2="94" y2="88" />
  </svg>
)

/** Custom outline-hotel SVG (3-section building with HOTEL banner). */
const OutlineHotelIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth={5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {/* "HOTEL" banner on the roof */}
    <rect x="38" y="8" width="24" height="10" />
    {/* Underline inside banner — suggests text without rendering it */}
    <line x1="42" y1="14" x2="58" y2="14" strokeWidth={2.5} />
    {/* Main building outline */}
    <rect x="10" y="22" width="80" height="68" />
    {/* Vertical dividers — split into 3 visual sections */}
    <line x1="34" y1="22" x2="34" y2="90" />
    <line x1="66" y1="22" x2="66" y2="90" />
    {/* Left section: 2 windows */}
    <rect x="16" y="32" width="12" height="12" />
    <rect x="16" y="52" width="12" height="12" />
    {/* Center section: 2 windows + central door */}
    <rect x="40" y="32" width="8" height="12" />
    <rect x="52" y="32" width="8" height="12" />
    <path d="M44 90 L 44 70 L 56 70 L 56 90" />
    {/* Right section: 2 windows */}
    <rect x="72" y="32" width="12" height="12" />
    <rect x="72" y="52" width="12" height="12" />
    {/* Ground line */}
    <line x1="5" y1="90" x2="95" y2="90" />
  </svg>
)

interface PropertyType {
  key: string
  label: string
  icon?: IconName
  /** Inline SVG renderer — takes priority over `icon` when set. */
  iconSvg?: (props: { className?: string }) => ReactNode
  /** Maps to PropertyTypeMaster.code so the form preselects the closest match.
   *  Falls back to the first available type when null/unmatched. */
  formType: string
  /** Optional intermediate wizard route — e.g. residential opens the booking-mode
   *  question step before the form. */
  nextHref?: string
}

/** Curated list of property types shown as a compact icon grid. Each tile links to
 *  the form with an appropriate preset. */
const propertyTypes: PropertyType[] = [
  { key: 'house', label: 'บ้าน', iconSvg: OutlineHouseIcon, formType: 'POOL_VILLA', nextHref: '/manage/listings/new/residential' },
  { key: 'hotel', label: 'โรงแรม', iconSvg: OutlineHotelIcon, formType: 'BNB' },
  { key: 'camp', label: 'แคมป์', iconSvg: OutlineCampIcon, formType: 'LOFT' },
  { key: 'room', label: 'ห้องพัก', iconSvg: OutlineRoomIcon, formType: 'BNB' },
]

/**
 * Landing page shown BEFORE the property-creation form. Owner picks a specific
 * property type from a compact tile grid; selection forwards to the form (or a
 * wizard step) with an appropriate preset.
 */
/**
 * Step 1 — category selector. After picking a type, the user goes to step 2
 * (/new/name) to type the property name, then step 3 (/new/form) for the
 * remaining basic info.
 */
export default function NewListingTypePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/manage/listings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
      >
        <Icon name="chevronLeft" className="size-3.5" />
        กลับไปลิสติ้งที่พัก
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          ที่พักของท่านเป็นแบบใด
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          เลือกประเภทที่ตรงกับที่พักของท่านมากที่สุด — แล้วระบุชื่อในขั้นถัดไป
        </p>
      </div>

      <WizardStepper current={1} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {propertyTypes.map((t) => {
          // Category tile → name step (carries the chosen type via ?type=)
          const href = t.nextHref ?? `/manage/listings/new/name?type=${t.formType}`
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                'group flex aspect-square flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-center transition-all',
                'hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md hover:shadow-brand-600/10',
              )}
            >
              {t.iconSvg ? (
                <t.iconSvg className="size-20 text-gray-600 transition-colors group-hover:text-brand-700" />
              ) : (
                <Icon
                  name={t.icon!}
                  className="size-20 text-gray-600 transition-colors group-hover:text-brand-700"
                />
              )}
              <span className="line-clamp-2 text-lg font-semibold leading-tight text-gray-800 group-hover:text-brand-700">
                {t.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
