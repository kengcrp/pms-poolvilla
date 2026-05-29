'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Icon, type IconName, cn } from '@pms/ui'
import {
  KaraokeWarningModal,
  ParkingModal,
  PetPolicyModal,
  PoolModal,
  blankParking,
  blankPetPolicy,
  blankPool,
  type ParkingDetails,
  type PetPolicy,
  type PoolConfig,
} from '@/components/AmenityConfigModals'

interface Props {
  propertyId: string
}

interface Amenity {
  code: string
  label: string
  icon: IconName
}

interface Section {
  title: string
  amenities: Amenity[]
}

/** Mirrors the /amenities wizard step so /edit shows the same picker UI.
 *  Source of truth: keep this in sync with apps/own/app/manage/listings/[id]/amenities/page.tsx */
const SECTIONS: Section[] = [
  {
    title: 'สิ่งอำนวยความสะดวกที่พักมีอะไรบ้าง',
    amenities: [
      { code: 'wifi', label: 'Wi-Fi', icon: 'wifi' },
      { code: 'tv', label: 'ทีวี', icon: 'tv' },
      { code: 'kitchen', label: 'ห้องครัว', icon: 'kitchen' },
      { code: 'washer', label: 'เครื่องซักผ้า', icon: 'shirt' },
      { code: 'dryer', label: 'เครื่องอบผ้า', icon: 'wind' },
      { code: 'parking', label: 'ที่จอดรถฟรี', icon: 'parking' },
      { code: 'ac', label: 'เครื่องปรับอากาศ', icon: 'ac' },
      { code: 'workspace', label: 'พื้นที่ทำงาน', icon: 'briefcase' },
      { code: 'shower', label: 'เครื่องอาบน้ำ', icon: 'shower' },
      { code: 'karaoke', label: 'คาราโอเกะ', icon: 'microphone' },
      { code: 'smart_tv', label: 'Smart TV เชื่อมต่อลำโพง', icon: 'tv' },
    ],
  },
  {
    title: 'ฟังก์ชั่นจุดเด่นที่พัก',
    amenities: [
      { code: 'pool', label: 'สระว่ายน้ำ', icon: 'swimmer' },
      { code: 'hot_tub', label: 'อ่างน้ำร้อน', icon: 'hotTub' },
      { code: 'yard', label: 'ลานสนามหญ้า', icon: 'tree' },
      { code: 'bbq', label: 'เตาบาร์บีคิว', icon: 'fire' },
      { code: 'outdoor_dining', label: 'พื้นที่ทานข้าวกลางแจ้ง', icon: 'glassWater' },
      { code: 'fire_pit', label: 'เตาไฟกลางแจ้ง', icon: 'fire' },
      { code: 'pool_table', label: 'โต๊ะพูล', icon: 'pingPong' },
      { code: 'table_tennis', label: 'โต๊ะปิงปอง', icon: 'pingPong' },
      { code: 'snooker', label: 'โต๊ะสนุ๊ก', icon: 'pingPong' },
      { code: 'foosball', label: 'โต๊ะบอล', icon: 'ball' },
      { code: 'arcade', label: 'ตู้เกมส์', icon: 'gamepad' },
      { code: 'fireplace', label: 'เตาผิงในบ้าน', icon: 'fire' },
      { code: 'piano', label: 'เปียโน', icon: 'music' },
      { code: 'gym', label: 'อุปกรณ์ออกกำลังกาย', icon: 'dumbbell' },
      { code: 'sauna', label: 'ซาวน่า', icon: 'spa' },
      { code: 'lake_access', label: 'ติดทะเลสาบ/ทะเล', icon: 'water' },
      { code: 'beach_access', label: 'ติดชายหาด', icon: 'beach' },
      { code: 'waterfall_access', label: 'ติดน้ำตก', icon: 'water' },
      { code: 'river_access', label: 'ติดแม่น้ำ', icon: 'water' },
      { code: 'pet_friendly', label: 'รับสัตว์เลี้ยง', icon: 'pet' },
    ],
  },
  {
    title: 'มีอุปกรณ์ความปลอดภัยอะไรบ้าง',
    amenities: [
      { code: 'smoke_alarm', label: 'อุปกรณ์ตรวจจับควัน', icon: 'alert' },
      { code: 'co_alarm', label: 'เครื่องตรวจจับคาร์บอนมอนนอกไซด์', icon: 'alert' },
      { code: 'fire_ext', label: 'ถังดับเพลิง', icon: 'fireExt' },
      { code: 'first_aid', label: 'ชุดปฐมพยาบาล', icon: 'shelter' },
      { code: 'security_camera', label: 'กล้องวงจรปิด', icon: 'eye' },
      { code: 'lock', label: 'ล็อคห้องนอน', icon: 'lock' },
    ],
  },
]

/**
 * Amenity picker — full-feature picker matching the new-listing wizard step.
 * Selections save to PropertyAmenity via setAmenities.
 *
 * Special amenities open the same config modals used by the wizard:
 *  - pool         → PoolModal (size, system, features, shapes, multi-pool)
 *  - pet_friendly → PetPolicyModal (max pets, price, cats/dogs)
 *  - parking      → ParkingModal (indoor/outdoor/project slots + notes)
 *  - karaoke      → KaraokeWarningModal (copyright warning + Smart TV switch)
 */
export function AmenitySection({ propertyId }: Props) {
  const utils = trpc.useUtils()
  const { data: property } = trpc.property.byId.useQuery({ id: propertyId })
  const { data: amenityMaster } = trpc.propertyExtras.amenityMaster.useQuery()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState<null | 'pool' | 'pet' | 'parking' | 'karaoke'>(null)

  // Detail state for special amenities (UI-only — persistence would require
  // additional DB fields; right now we just tick the amenity after Save)
  const [pools, setPools] = useState<PoolConfig[]>([])
  const [petPolicy, setPetPolicy] = useState<PetPolicy>(blankPetPolicy())
  const [parking, setParking] = useState<ParkingDetails>(blankParking())

  // Hydrate selection from the property's existing amenities — match by master `code`
  useEffect(() => {
    if (!property?.amenities || !amenityMaster) return
    const masterCodes = new Map(amenityMaster.map((m) => [m.id, m.code]))
    const set = new Set<string>()
    for (const a of property.amenities) {
      const code = masterCodes.get(a.amenityMasterId)
      if (code) set.add(code)
    }
    setSelected(set)
  }, [property?.amenities, amenityMaster])

  const setAmenities = trpc.propertyExtras.setAmenities.useMutation({
    onSuccess: () => {
      utils.property.byId.invalidate({ id: propertyId })
      setSavedAt(new Date())
    },
    onError: (e) => setError(e.message),
  })

  function toggle(code: string) {
    // Special codes open a config modal before adding (if not already selected).
    // Already-selected codes just untick on click (no modal).
    if (!selected.has(code)) {
      if (code === 'pool') {
        if (pools.length === 0) setPools([blankPool()])
        return setModalOpen('pool')
      }
      if (code === 'pet_friendly') return setModalOpen('pet')
      if (code === 'parking') return setModalOpen('parking')
      if (code === 'karaoke') return setModalOpen('karaoke')
    }
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  function confirmAdd(code: string) {
    setSelected((prev) => new Set(prev).add(code))
    setModalOpen(null)
  }

  // Pool modal helpers
  function updatePool(idx: number, patch: Partial<PoolConfig>) {
    setPools((arr) => arr.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }
  function togglePoolFeature(idx: number, code: string) {
    setPools((arr) =>
      arr.map((p, i) =>
        i === idx
          ? {
              ...p,
              features: p.features.includes(code)
                ? p.features.filter((c) => c !== code)
                : [...p.features, code],
            }
          : p,
      ),
    )
  }
  function togglePoolShape(idx: number, code: string) {
    setPools((arr) =>
      arr.map((p, i) =>
        i === idx
          ? {
              ...p,
              shapes: p.shapes.includes(code)
                ? p.shapes.filter((c) => c !== code)
                : [...p.shapes, code],
            }
          : p,
      ),
    )
  }
  function addAnotherPool() {
    setPools((arr) => [...arr, blankPool()])
  }
  function removePool(idx: number) {
    setPools((arr) => arr.filter((_, i) => i !== idx))
  }

  function handleSave() {
    setError(null)
    if (!amenityMaster) return
    const codeToId = new Map(amenityMaster.map((m) => [m.code, m.id]))
    const ids: string[] = []
    for (const code of selected) {
      const id = codeToId.get(code)
      if (id) ids.push(id)
    }
    setAmenities.mutate({ propertyId, amenityMasterIds: ids })
  }

  const masterEmpty = amenityMaster && amenityMaster.length === 0

  return (
    <div className="space-y-6">
      {masterEmpty && (
        <div className="rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
          ⚠ ระบบยังไม่ได้เพิ่ม master amenities — admin ต้อง seed ก่อน
          การบันทึกจะไม่มีผลจนกว่าจะ seed ครบ
        </div>
      )}

      {SECTIONS.map((sec) => (
        <section key={sec.title}>
          <h3 className="mb-3 text-base font-bold text-gray-900">{sec.title}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {sec.amenities.map((a) => {
              const active = selected.has(a.code)
              return (
                <button
                  key={a.code}
                  type="button"
                  onClick={() => toggle(a.code)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border-2 bg-white px-3 py-3 text-left transition-all',
                    active
                      ? 'border-brand-500 bg-brand-50/40 shadow-sm'
                      : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50',
                  )}
                >
                  <Icon name={a.icon} className={cn('size-4 shrink-0', active ? 'text-brand-600' : 'text-gray-500')} />
                  <span
                    className={cn(
                      'min-w-0 flex-1 text-sm',
                      active ? 'font-semibold text-brand-700' : 'font-medium text-gray-700',
                    )}
                  >
                    {a.label}
                  </span>
                  {active && <Icon name="check" className="size-3.5 shrink-0 text-brand-600" />}
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {error && (
        <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      {/* Sticky save/cancel bar */}
      <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-3 shadow-[0_-4px_15px_rgba(0,0,0,0.04)]">
        <div className="text-xs text-gray-500">
          {savedAt
            ? `บันทึกล่าสุด ${savedAt.toLocaleTimeString('th-TH')}`
            : `เลือกแล้ว ${selected.size} รายการ`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              if (!property?.amenities || !amenityMaster) return
              const masterCodes = new Map(amenityMaster.map((m) => [m.id, m.code]))
              const set = new Set<string>()
              for (const a of property.amenities) {
                const code = masterCodes.get(a.amenityMasterId)
                if (code) set.add(code)
              }
              setSelected(set)
              setError(null)
            }}
            disabled={setAmenities.isPending}
          >
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={setAmenities.isPending}>
            {setAmenities.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </div>

      {/* Wizard-grade modals — same UX as the new-listing flow */}
      {modalOpen === 'pool' && (
        <PoolModal
          pools={pools}
          updatePool={updatePool}
          togglePoolFeature={togglePoolFeature}
          togglePoolShape={togglePoolShape}
          addAnotherPool={addAnotherPool}
          removePool={removePool}
          onCancel={() => setModalOpen(null)}
          onSave={() => confirmAdd('pool')}
        />
      )}

      {modalOpen === 'pet' && (
        <PetPolicyModal
          policy={petPolicy}
          updatePolicy={(patch) => setPetPolicy((p) => ({ ...p, ...patch }))}
          onCancel={() => setModalOpen(null)}
          onSave={() => confirmAdd('pet_friendly')}
        />
      )}

      {modalOpen === 'parking' && (
        <ParkingModal
          parking={parking}
          updateParking={(patch) => setParking((p) => ({ ...p, ...patch }))}
          onCancel={() => setModalOpen(null)}
          onSave={() => confirmAdd('parking')}
        />
      )}

      {modalOpen === 'karaoke' && (
        <KaraokeWarningModal
          onAcknowledge={() => confirmAdd('karaoke')}
          onSwitchToSmartTv={() => {
            // Switch suggestion: untick karaoke (if was about to be added) + tick smart_tv
            setSelected((prev) => {
              const next = new Set(prev)
              next.delete('karaoke')
              next.add('smart_tv')
              return next
            })
            setModalOpen(null)
          }}
        />
      )}
    </div>
  )
}
