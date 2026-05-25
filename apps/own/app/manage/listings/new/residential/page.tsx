'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Icon, cn, type IconName } from '@pms/ui'

/** Outline door icon (custom SVG) — used for the "ห้องส่วนตัว" option. */
const OutlineDoorIcon = ({ className }: { className?: string }) => (
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
    {/* Door frame — rounded rectangle */}
    <rect x="22" y="10" width="56" height="80" rx="3" />
    {/* Door knob (solid dot on the right side, mid-height) */}
    <circle cx="64" cy="54" r="4" fill="currentColor" stroke="none" />
  </svg>
)

type BookingMode = 'whole_unit' | 'private_room'

interface Option {
  key: BookingMode
  label: string
  description: string
  /** Either a FontAwesome icon name OR an inline SVG component */
  icon?: IconName
  iconSvg?: (props: { className?: string }) => ReactNode
}

const options: Option[] = [
  {
    key: 'whole_unit',
    label: 'ที่พักทั้งหลัง',
    description:
      'ลูกค้าจะได้ใช้ที่พักทั้งหมดโดยไม่ใช้ร่วมกับผู้เข้าพักหรือเจ้าของบ้านรายอื่น',
    icon: 'home',
  },
  {
    key: 'private_room',
    label: 'ได้ห้องส่วนตัว',
    description:
      'ลูกค้าจะมีเพียงห้องเดียวสำหรับเข้าพัก และอาจใช้พื้นที่ส่วนกลางร่วมกับผู้เข้าพักหรือเจ้าของบ้านรายอื่นด้วย',
    iconSvg: OutlineDoorIcon,
  },
]

/**
 * Step 2 (after picking the "ที่พักสไตล์ที่อยู่อาศัย" category): ask how customers can
 * book this property — the whole unit or just a private room. The answer is forwarded to
 * the form page as `?booking=...` for future property-config use.
 */
export default function ResidentialBookingTypePage() {
  const router = useRouter()
  const [picked, setPicked] = useState<BookingMode>('whole_unit')

  function handleContinue() {
    // Skip subtype step — go directly to step 3 (external sites). Default type=POOL_VILLA
    // since this flow is reached from the "บ้าน" tile.
    router.push(`/manage/listings/new/residential/listings?booking=${picked}&type=POOL_VILLA`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/manage/listings/new"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
      >
        <Icon name="chevronLeft" className="size-3.5" />
        กลับไปเลือกประเภท
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">ลูกค้าสามารถจองแบบไหนได้?</h1>
      </div>

      <div className="space-y-3">
        {options.map((opt) => {
          const active = picked === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setPicked(opt.key)}
              className={cn(
                'group relative flex w-full items-start gap-4 rounded-2xl border-2 bg-white p-4 text-left transition-all',
                active
                  ? 'border-brand-500 shadow-md shadow-brand-600/10 ring-2 ring-brand-500/20'
                  : 'border-gray-200 hover:border-brand-300 hover:shadow-sm',
              )}
              aria-pressed={active}
            >
              {/* Check indicator — top-right */}
              {active && (
                <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-brand-600 text-white shadow ring-2 ring-white">
                  <Icon name="check" className="size-3" />
                </span>
              )}

              <div
                className={cn(
                  'flex size-12 shrink-0 items-center justify-center rounded-xl',
                  active ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700',
                )}
              >
                {opt.iconSvg ? (
                  <opt.iconSvg className="size-6" />
                ) : (
                  <Icon name={opt.icon ?? 'home'} className="size-6" />
                )}
              </div>

              <div className="min-w-0 flex-1 pr-6">
                <div
                  className={cn(
                    'text-base font-bold',
                    active ? 'text-brand-700' : 'text-gray-900',
                  )}
                >
                  {opt.label}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">{opt.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-5">
        <Link href="/manage/listings/new">
          <Button variant="secondary" type="button">
            <Icon name="chevronLeft" className="size-3.5" />
          </Button>
        </Link>
        <Button onClick={handleContinue} className="flex-1 sm:flex-initial sm:px-10">
          ดำเนินการต่อ
        </Button>
      </div>
    </div>
  )
}
