'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button, cn, Icon, Input, type IconName } from '@pms/ui'
import { WizardStepper } from '@/components/WizardStepper'
import { LocationSection } from '@/components/sections/LocationSection'

/** Location-related amenities — moved here from the /amenities step so they
 *  sit alongside the map / coordinates / address. Shared with amenities page
 *  via the same sessionStorage key, but persisted separately to a tiny key
 *  so toggles here never overwrite the bigger amenity draft. */
const LOCATION_TILES: { code: string; label: string; icon: IconName }[] = [
  { code: 'sea_view',         label: 'วิวทะเล',     icon: 'beach' },
  { code: 'mountain_view',    label: 'วิวภูเขา',    icon: 'mountain' },
  { code: 'lake_view',        label: 'วิวทะเลสาบ',  icon: 'water' },
  { code: 'city_view',        label: 'วิวเมือง',    icon: 'building' },
  { code: 'stream_view',      label: 'วิวลำธาร',    icon: 'water' },
  { code: 'beach_access',     label: 'ติดชายหาด',   icon: 'beach' },
  { code: 'waterfall_access', label: 'ติดน้ำตก',    icon: 'water' },
  { code: 'river_access',     label: 'ติดแม่น้ำ',   icon: 'water' },
]
const LOCATION_AMENITIES_KEY = 'pms.newListing.locationAmenities'

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
  const [contactDirty, setContactDirty] = useState(false)
  // Location-related amenity toggles — hydrated from sessionStorage so the user
  // can come back to this step and see what they previously picked.
  const [locationAmenities, setLocationAmenities] = useState<Set<string>>(new Set())

  // Hydrate from existing property record + sessionStorage on mount.
  useEffect(() => {
    if (property?.contactInfo) setContactInfo(property.contactInfo)
  }, [property?.contactInfo])

  // Auto-save contact info — replaces the explicit "บันทึกข้อมูลติดต่อ" button.
  // Only fires after the user has edited the value (contactDirty) so the initial
  // hydration from the DB doesn't trigger a no-op write back. 800ms debounce.
  useEffect(() => {
    if (!contactDirty) return
    const t = setTimeout(() => {
      void updateProperty
        .mutateAsync({ id, contactInfo: contactInfo || null })
        .then(() => setContactSavedAt(new Date()))
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactInfo, contactDirty, id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem(LOCATION_AMENITIES_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as string[]
      if (Array.isArray(parsed)) setLocationAmenities(new Set(parsed))
    } catch {
      /* malformed — ignore */
    }
  }, [])

  function toggleLocation(code: string) {
    setLocationAmenities((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      // Persist immediately so refresh / back-nav keeps the selection.
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(LOCATION_AMENITIES_KEY, JSON.stringify([...next]))
      }
      return next
    })
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

      {/* Location-related amenity tiles — passed to LocationSection so they
          render right under the first "ที่ตั้ง" card (block 2 in the visual
          flow), above the พิกัด / ที่อยู่ cards. */}
      <LocationSection
        propertyId={id}
        afterFirstCard={
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
              <div className="text-sm font-bold text-gray-900">บรรยากาศที่พัก</div>
              <div className="mt-0.5 text-xs text-gray-500">
                เลือกวิวและพื้นที่ติดธรรมชาติที่บ้านของท่านมี
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {LOCATION_TILES.map((tile) => {
                const active = locationAmenities.has(tile.code)
                return (
                  <button
                    key={tile.code}
                    type="button"
                    onClick={() => toggleLocation(tile.code)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                      active
                        ? 'border-brand-500 bg-brand-50 shadow-sm shadow-brand-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg',
                        active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      <Icon name={tile.icon} className="size-4" />
                    </div>
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm',
                        active ? 'font-bold text-brand-700' : 'font-medium text-gray-800',
                      )}
                    >
                      {tile.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        }
      />

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
            onChange={(e) => {
              setContactInfo(e.target.value)
              setContactDirty(true)
            }}
            placeholder="ตัวอย่าง คุณแอม 08XXXXXXX , คุณเมย์ 08XXXXXXX"
          />
          <p className="flex items-center gap-1 text-[11px] text-gray-500">
            <Icon name="info" className="size-3" />
            กรุณากรอก ชื่อ เบอร์โทรศัพท์ ต่อด้วย ,
          </p>
          {/* บันทึกอัตโนมัติ — ไม่มีปุ่ม "บันทึกข้อมูลติดต่อ" แล้ว */}
          <div className="flex items-center justify-end text-xs text-gray-500">
            {updateProperty.isPending
              ? 'กำลังบันทึก...'
              : contactSavedAt
                ? `บันทึกล่าสุด ${contactSavedAt.toLocaleTimeString('th-TH')}`
                : ''}
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
