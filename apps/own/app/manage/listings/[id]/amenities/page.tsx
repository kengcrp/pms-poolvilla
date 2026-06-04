'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button, Icon, Input, type IconName, cn } from '@pms/ui'
import { WizardStepper } from '@/components/WizardStepper'

interface Amenity {
  code: string
  label: string
  icon: IconName
}

interface Section {
  title: string
  amenities: Amenity[]
}

/**
 * Onboarding amenities step — shown after the new-listing form. Lets the owner click
 * tiles to mark common amenities; selections are persisted in sessionStorage so the
 * edit page can pick them up. Continuing or skipping navigates to /photos.
 */
const sections: Section[] = [
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

/** SessionStorage keys */
const STORAGE_KEY = 'pms.newListing.amenities'
const POOLS_STORAGE_KEY = 'pms.newListing.pools'
const PET_POLICY_STORAGE_KEY = 'pms.newListing.petPolicy'
const PARKING_STORAGE_KEY = 'pms.newListing.parking'

// ─── Parking details types ─────────────────────────────────────────────
interface ParkingDetails {
  /** Cars that can park inside the property (garage / inside the gate) */
  indoorSlots: number
  /** Cars that can park outside the property (on the street / driveway outside gate) */
  outdoorSlots: number
  /** Cars that can use the project / shared parking area */
  projectSlots: number
  /** Extra notes (e.g. "ที่จอดอยู่ฝั่งตรงข้าม") */
  notes: string
}

function blankParking(): ParkingDetails {
  return { indoorSlots: 0, outdoorSlots: 0, projectSlots: 0, notes: '' }
}

// ─── Pet policy types ──────────────────────────────────────────────────
interface PetPolicy {
  /** Max number of pets allowed per booking */
  maxPets: number
  /** Extra fee in THB per pet */
  pricePerPet: string
  /** Whether cats are allowed */
  acceptCats: boolean
  /** Whether dogs are allowed */
  acceptDogs: boolean
}

function blankPetPolicy(): PetPolicy {
  return { maxPets: 0, pricePerPet: '', acceptCats: false, acceptDogs: false }
}

// ─── Pool configuration types ──────────────────────────────────────────
type PoolOwnership = 'SHARED' | 'PRIVATE'
type PoolSystem = 'SALT' | 'CHLORINE' | 'SALT_WARM' | 'CHLORINE_WARM' | 'FRESH_WARM'

const POOL_SYSTEM_OPTIONS: { code: PoolSystem; label: string }[] = [
  { code: 'SALT', label: 'ระบบน้ำเกลือ' },
  { code: 'CHLORINE', label: 'ระบบคลอรีน' },
  { code: 'FRESH_WARM', label: 'ระบบน้ำแร่' },
  { code: 'SALT_WARM', label: 'ระบบน้ำอุ่น' },
]

const POOL_FEATURES: { code: string; label: string; emoji: string }[] = [
  { code: 'kid_pool', label: 'สระว่ายน้ำเด็ก', emoji: '👶' },
  { code: 'slider', label: 'สไลเดอร์', emoji: '🛝' },
  { code: 'sea_view', label: 'วิวทะเล', emoji: '🌊' },
  { code: 'bbq_area', label: 'ที่ปิ้งย่าง', emoji: '🍖' },
  { code: 'jacuzzi', label: 'จากุซซี่', emoji: '♨️' },
  { code: 'water_curtain', label: 'ม่านน้ำ', emoji: '💦' },
]

/** Pool shape / style descriptors — multi-select describing what the pool looks like. */
const POOL_SHAPES: { code: string; label: string }[] = [
  { code: 'sloped', label: 'พื้นลาดเอียง (ตื้น → ลึก)' },
  { code: 'freeform', label: 'สระทรง Freeform' },
  { code: 'l_shape', label: 'สระทรงตัว L' },
  { code: 'jacuzzi_system', label: 'มีระบบจากุซซี่' },
]

interface PoolConfig {
  ownership: PoolOwnership | null
  system: PoolSystem | null
  /** Pool shape descriptors (multi-select): sloped, freeform, l_shape, ... */
  shapes: string[]
  widthM: string
  lengthM: string
  depthM: string
  features: string[]
}

function blankPool(): PoolConfig {
  return {
    ownership: null,
    system: null,
    shapes: [],
    widthM: '',
    lengthM: '',
    depthM: '',
    features: [],
  }
}

export default function ListingAmenitiesPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Pool details modal state — opened when user clicks the "สระว่ายน้ำ" tile.
  // Owner can configure multiple pools (e.g. an indoor + outdoor pool).
  const [poolModalOpen, setPoolModalOpen] = useState(false)
  const [pools, setPools] = useState<PoolConfig[]>([])

  // Pet policy modal state — opened when user clicks the "รับสัตว์เลี้ยง" tile
  const [petModalOpen, setPetModalOpen] = useState(false)
  const [petPolicy, setPetPolicy] = useState<PetPolicy>(blankPetPolicy())

  // Karaoke copyright warning — shown the first time the karaoke tile is ticked
  const [karaokeWarningOpen, setKaraokeWarningOpen] = useState(false)

  // Parking modal state — opened when user clicks the "ที่จอดรถฟรี" tile
  const [parkingModalOpen, setParkingModalOpen] = useState(false)
  const [parking, setParking] = useState<ParkingDetails>(blankParking())

  // Hydrate pool + pet policy details from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Pools
    const poolsRaw = sessionStorage.getItem(POOLS_STORAGE_KEY)
    if (poolsRaw) {
      try {
        const parsed = JSON.parse(poolsRaw) as (PoolConfig & { sloped?: boolean })[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migrate legacy `sloped: boolean` field → `shapes: ['sloped']`
          const migrated = parsed.map((p) => {
            const { sloped: legacySloped, shapes, ...rest } = p
            const finalShapes = shapes ?? (legacySloped ? ['sloped'] : [])
            return { ...rest, shapes: finalShapes } as PoolConfig
          })
          setPools(migrated)
        }
      } catch {
        /* malformed — ignore */
      }
    }
    // Pet policy
    const petRaw = sessionStorage.getItem(PET_POLICY_STORAGE_KEY)
    if (petRaw) {
      try {
        const parsed = JSON.parse(petRaw) as PetPolicy
        setPetPolicy({ ...blankPetPolicy(), ...parsed })
      } catch {
        /* malformed — ignore */
      }
    }
    // Parking
    const parkingRaw = sessionStorage.getItem(PARKING_STORAGE_KEY)
    if (parkingRaw) {
      try {
        const parsed = JSON.parse(parkingRaw) as ParkingDetails
        setParking({ ...blankParking(), ...parsed })
      } catch {
        /* malformed — ignore */
      }
    }
  }, [])

  function toggle(code: string) {
    // Pool — clicking opens the configuration modal. Tile "selects" only after save.
    if (code === 'pool') {
      if (!selected.has(code) && pools.length === 0) setPools([blankPool()])
      setPoolModalOpen(true)
      return
    }
    // Pet — clicking opens the pet policy modal. Tile "selects" only after save.
    if (code === 'pet_friendly') {
      setPetModalOpen(true)
      return
    }
    // Parking — clicking opens the parking details modal. Tile "selects" only after save.
    if (code === 'parking') {
      setParkingModalOpen(true)
      return
    }

    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
        // Karaoke → show copyright warning the moment it's ticked
        if (code === 'karaoke') setKaraokeWarningOpen(true)
      }
      return next
    })
  }

  function persistAndGoto(target: string) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selected)))
      // Only save pools if "pool" is selected; otherwise clear stale pool data
      if (selected.has('pool')) {
        sessionStorage.setItem(POOLS_STORAGE_KEY, JSON.stringify(pools))
      } else {
        sessionStorage.removeItem(POOLS_STORAGE_KEY)
      }
      // Only save pet policy if "pet_friendly" is selected
      if (selected.has('pet_friendly')) {
        sessionStorage.setItem(PET_POLICY_STORAGE_KEY, JSON.stringify(petPolicy))
      } else {
        sessionStorage.removeItem(PET_POLICY_STORAGE_KEY)
      }
      // Only save parking if "parking" is selected
      if (selected.has('parking')) {
        sessionStorage.setItem(PARKING_STORAGE_KEY, JSON.stringify(parking))
      } else {
        sessionStorage.removeItem(PARKING_STORAGE_KEY)
      }
    }
    router.push(target)
  }

  // ─── Pool modal handlers ─────────────────────────────────────────────
  function updatePool(idx: number, patch: Partial<PoolConfig>) {
    setPools((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }
  function togglePoolFeature(idx: number, code: string) {
    setPools((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p
        const has = p.features.includes(code)
        return { ...p, features: has ? p.features.filter((c) => c !== code) : [...p.features, code] }
      }),
    )
  }
  function togglePoolShape(idx: number, code: string) {
    setPools((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p
        const has = p.shapes.includes(code)
        return { ...p, shapes: has ? p.shapes.filter((c) => c !== code) : [...p.shapes, code] }
      }),
    )
  }
  function addAnotherPool() {
    setPools((prev) => [...prev, blankPool()])
  }
  function removePool(idx: number) {
    setPools((prev) => prev.filter((_, i) => i !== idx))
  }
  function savePools() {
    // Drop pools where the owner didn't set anything meaningful
    const cleaned = pools.filter(
      (p) =>
        p.ownership ||
        p.system ||
        p.widthM ||
        p.lengthM ||
        p.depthM ||
        p.shapes.length > 0 ||
        p.features.length > 0,
    )
    if (cleaned.length === 0) {
      // Nothing meaningful entered — treat as cancel (don't select the tile)
      setPoolModalOpen(false)
      return
    }
    setPools(cleaned)
    setSelected((prev) => new Set(prev).add('pool'))
    setPoolModalOpen(false)
  }
  function cancelPools() {
    // If we never added a pool (just opened then cancelled), don't keep an empty pool around
    if (!selected.has('pool')) setPools([])
    setPoolModalOpen(false)
  }

  // ─── Pet policy modal handlers ───────────────────────────────────────
  function updatePetPolicy(patch: Partial<PetPolicy>) {
    setPetPolicy((prev) => ({ ...prev, ...patch }))
  }
  function savePetPolicy() {
    // Need at least 1 pet allowed OR one species accepted to count as "pet friendly"
    const meaningful =
      petPolicy.maxPets > 0 || petPolicy.acceptCats || petPolicy.acceptDogs
    if (meaningful) {
      setSelected((prev) => new Set(prev).add('pet_friendly'))
    } else {
      // Owner didn't accept anything → un-select the tile (treat as "not pet friendly")
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete('pet_friendly')
        return next
      })
    }
    setPetModalOpen(false)
  }
  function cancelPetPolicy() {
    setPetModalOpen(false)
  }

  // ─── Parking modal handlers ──────────────────────────────────────────
  function updateParking(patch: Partial<ParkingDetails>) {
    setParking((prev) => ({ ...prev, ...patch }))
  }
  function saveParking() {
    // Meaningful if at least 1 slot or notes are provided
    const meaningful =
      parking.indoorSlots > 0 ||
      parking.outdoorSlots > 0 ||
      parking.projectSlots > 0 ||
      parking.notes.trim().length > 0
    if (meaningful) {
      setSelected((prev) => new Set(prev).add('parking'))
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete('parking')
        return next
      })
    }
    setParkingModalOpen(false)
  }
  function cancelParking() {
    setParkingModalOpen(false)
  }

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <Link
        href={`/manage/listings/${id}/policies`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-brand-700"
      >
        <Icon name="chevronLeft" className="size-3.5" />
        ย้อนกลับ
      </Link>

      <h1 className="mb-5 text-2xl font-bold tracking-tight text-gray-900">
        แจ้งลูกค้าทราบสิ่งที่ที่พักท่านมี
      </h1>

      <WizardStepper propertyId={id} current={6} />

      <div className="space-y-8">
        {sections.map((sec) => (
          <section key={sec.title}>
            <h2 className="mb-3 text-base font-bold text-gray-900">{sec.title}</h2>
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
                        ? 'border-brand-500 bg-brand-50/40 shadow-sm ring-1 ring-brand-500/20'
                        : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/20',
                    )}
                    aria-pressed={active}
                  >
                    <div
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-lg',
                        active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600',
                      )}
                    >
                      <Icon name={a.icon} className="size-4" />
                    </div>
                    <span className={cn('flex-1 text-sm font-medium', active ? 'text-brand-700' : 'text-gray-800')}>
                      {a.label}
                    </span>
                    {active && <Icon name="check" className="size-3.5 shrink-0 text-brand-600" />}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Footer actions — sticky to bottom; wrapper matches ManageShell main padding
          so inner max-w-4xl aligns with the page cards above. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => persistAndGoto(`/manage/listings/${id}/photos`)}
            >
              ข้าม
            </Button>
            <div className="text-sm text-gray-500">
              เลือกแล้ว {selected.size} รายการ
            </div>
            <Button
              type="button"
              onClick={() => persistAndGoto(`/manage/listings/${id}/photos`)}
            >
              ดำเนินการต่อ
            </Button>
          </div>
        </div>
      </div>

      {/* Pool details modal — opens when user clicks the สระว่ายน้ำ tile */}
      {poolModalOpen && (
        <PoolModal
          pools={pools}
          updatePool={updatePool}
          togglePoolFeature={togglePoolFeature}
          togglePoolShape={togglePoolShape}
          addAnotherPool={addAnotherPool}
          removePool={removePool}
          onSave={savePools}
          onCancel={cancelPools}
        />
      )}

      {/* Pet policy modal — opens when user clicks the รับสัตว์เลี้ยง tile */}
      {petModalOpen && (
        <PetPolicyModal
          policy={petPolicy}
          updatePolicy={updatePetPolicy}
          onSave={savePetPolicy}
          onCancel={cancelPetPolicy}
        />
      )}

      {/* Karaoke copyright warning — shown the first time karaoke is ticked */}
      {karaokeWarningOpen && (
        <KaraokeWarningModal
          onSwitchToSmartTv={() => {
            // Auto-swap selection: untick karaoke, tick smart_tv
            setSelected((prev) => {
              const next = new Set(prev)
              next.delete('karaoke')
              next.add('smart_tv')
              return next
            })
            setKaraokeWarningOpen(false)
          }}
          onAcknowledge={() => setKaraokeWarningOpen(false)}
        />
      )}

      {/* Parking details modal — opens when user clicks the ที่จอดรถฟรี tile */}
      {parkingModalOpen && (
        <ParkingModal
          parking={parking}
          updateParking={updateParking}
          onSave={saveParking}
          onCancel={cancelParking}
        />
      )}
    </div>
  )
}

// ─── Pool details modal ──────────────────────────────────────────────
interface PoolModalProps {
  pools: PoolConfig[]
  updatePool: (idx: number, patch: Partial<PoolConfig>) => void
  togglePoolFeature: (idx: number, code: string) => void
  togglePoolShape: (idx: number, code: string) => void
  addAnotherPool: () => void
  removePool: (idx: number) => void
  onSave: () => void
  onCancel: () => void
}

function PoolModal({
  pools,
  updatePool,
  togglePoolFeature,
  togglePoolShape,
  addAnotherPool,
  removePool,
  onSave,
  onCancel,
}: PoolModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pool-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header — clean, single-line title */}
        <div className="flex items-center justify-between gap-4 px-6 pb-3 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Icon name="swimmer" className="size-4" />
            </div>
            <h2 id="pool-modal-title" className="text-lg font-bold text-gray-900">
              รายละเอียดสระว่ายน้ำ
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="ปิด"
          >
            <Icon name="close" className="size-3.5" />
          </button>
        </div>

        {/* Scrollable body — each pool wrapped in its own subtle card with icon-led
            section labels for better visual scanning. */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/40 px-6 py-5">
          {pools.map((p, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              {/* Pool card header — pool number + delete */}
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-brand-50/50 px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {idx + 1}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">สระว่ายน้ำที่ {idx + 1}</h3>
                </div>
                {pools.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePool(idx)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Icon name="trash" className="size-3.5" />
                    ลบสระนี้
                  </button>
                )}
              </div>

              {/* Each section sits in its own divided panel so the modal scans like
                  a list of concrete decisions rather than one big form. */}
              <div className="divide-y divide-gray-100">
                {/* Ownership */}
                <PoolSection icon="lock" title="ประเภทสระ">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: 'PRIVATE' as PoolOwnership, label: 'สระส่วนตัว', icon: 'lock' as IconName },
                      { v: 'SHARED' as PoolOwnership, label: 'สระใช้ร่วมกับคนอื่น', icon: 'users' as IconName },
                    ].map((opt) => {
                      const active = p.ownership === opt.v
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => updatePool(idx, { ownership: active ? null : opt.v })}
                          className={cn(
                            'flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',
                            active
                              ? 'border-brand-500 bg-brand-50/60 text-brand-700 shadow-sm'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300',
                          )}
                          aria-pressed={active}
                        >
                          <Icon name={opt.icon} className="size-3.5" />
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </PoolSection>

                {/* Size — 3 inputs with labels above + unit suffix inside */}
                <PoolSection icon="area" title="ขนาด" suffix="(เมตร)">
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { key: 'widthM', label: 'กว้าง' },
                        { key: 'lengthM', label: 'ยาว' },
                        { key: 'depthM', label: 'ลึก' },
                      ] as const
                    ).map(({ key, label }) => (
                      <div key={key}>
                        <div className="mb-1 text-center text-[11px] font-medium uppercase text-gray-500">
                          {label}
                        </div>
                        <div className="relative">
                          <Input
                            id={`pool-${key}-${idx}`}
                            type="number"
                            min={0}
                            step="0.1"
                            inputMode="decimal"
                            value={p[key]}
                            onChange={(e) => updatePool(idx, { [key]: e.target.value })}
                            placeholder="0"
                            className="pr-8 text-center font-medium"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] font-medium text-gray-400">
                            ม.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </PoolSection>

                {/* System — pills (single select) */}
                <PoolSection icon="water" title="ระบบน้ำ">
                  <div className="flex flex-wrap gap-2">
                    {POOL_SYSTEM_OPTIONS.map((opt) => {
                      const active = p.system === opt.code
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => updatePool(idx, { system: active ? null : opt.code })}
                          className={cn(
                            'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all',
                            active
                              ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:text-brand-700',
                          )}
                          aria-pressed={active}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </PoolSection>

                {/* Pool shape — multi-select */}
                <PoolSection icon="star" title="สระว่ายน้ำคุณเป็นอย่างไร">
                  <div className="flex flex-wrap gap-2">
                    {POOL_SHAPES.map((s) => {
                      const active = p.shapes.includes(s.code)
                      return (
                        <button
                          key={s.code}
                          type="button"
                          onClick={() => togglePoolShape(idx, s.code)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                            active
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300',
                          )}
                          aria-pressed={active}
                        >
                          {active && <Icon name="check" className="size-3" />}
                          {s.label}
                        </button>
                      )
                    })}
                  </div>
                </PoolSection>

                {/* Features — emoji + toggle pills */}
                <PoolSection icon="spa" title="ฟังก์ชันรอบสระ">
                  <div className="flex flex-wrap gap-2">
                    {POOL_FEATURES.map((f) => {
                      const active = p.features.includes(f.code)
                      return (
                        <button
                          key={f.code}
                          type="button"
                          onClick={() => togglePoolFeature(idx, f.code)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                            active
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300',
                          )}
                          aria-pressed={active}
                        >
                          <span className="text-base leading-none">{f.emoji}</span>
                          {f.label}
                          {active && <Icon name="check" className="size-3" />}
                        </button>
                      )
                    })}
                  </div>
                </PoolSection>
              </div>
            </div>
          ))}

          {/* Add another pool — dashed outline, subtle */}
          <button
            type="button"
            onClick={addAnotherPool}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-brand-400 hover:bg-brand-50/20 hover:text-brand-700"
          >
            <Icon name="plus" className="size-3.5" />
            เพิ่มสระว่ายน้ำอีก
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/40 px-6 py-3">
          <Button variant="secondary" type="button" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={onSave}>
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Section row inside a pool card — icon-badge label + content area, separated
 *  from siblings by a hairline divider for clearer visual chunking. */
function PoolSection({
  icon,
  title,
  suffix,
  children,
}: {
  icon: IconName
  title: string
  suffix?: string
  children: React.ReactNode
}) {
  return (
    <div className="px-5 py-4">
      <div className="mb-2.5 flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md bg-brand-50 text-brand-700">
          <Icon name={icon} className="size-3" />
        </div>
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
      </div>
      {children}
    </div>
  )
}

// ─── Pet policy modal ────────────────────────────────────────────────
interface PetPolicyModalProps {
  policy: PetPolicy
  updatePolicy: (patch: Partial<PetPolicy>) => void
  onSave: () => void
  onCancel: () => void
}

function PetPolicyModal({ policy, updatePolicy, onSave, onCancel }: PetPolicyModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 pb-3 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Icon name="pet" className="size-4" />
            </div>
            <h2 id="pet-modal-title" className="text-lg font-bold text-gray-900">
              นโยบายเสริมสัตว์เลี้ยงเข้าพัก
              <span className="ml-2 text-xs font-normal text-gray-400">(ไม่บังคับ)</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="ปิด"
          >
            <Icon name="close" className="size-3.5" />
          </button>
        </div>

        {/* Body — card-style sections for clearer grouping */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/40 px-6 py-5">
          {/* Card 1: capacity + price */}
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  จำนวนสัตว์เลี้ยงที่อนุญาต
                </div>
                <div className="text-xs text-gray-500">สูงสุดต่อการเข้าพัก 1 ครั้ง</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updatePolicy({ maxPets: Math.max(0, policy.maxPets - 1) })}
                  className="flex size-9 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                  disabled={policy.maxPets <= 0}
                  aria-label="ลด"
                >
                  <Icon name="minus" className="size-3" />
                </button>
                <div className="flex min-w-[3.5rem] items-center justify-center rounded-md border border-gray-300 px-2 py-1.5 text-base font-bold text-gray-900">
                  {policy.maxPets}
                </div>
                <button
                  type="button"
                  onClick={() => updatePolicy({ maxPets: Math.min(20, policy.maxPets + 1) })}
                  className="flex size-9 items-center justify-center rounded-md border border-brand-400 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100"
                  aria-label="เพิ่ม"
                >
                  <Icon name="plus" className="size-3" />
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-gray-900">ราคาสัตว์เลี้ยง</span>
                <span className="text-xs text-gray-400">บาท / ตัว</span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step="50"
                  inputMode="numeric"
                  value={policy.pricePerPet}
                  onChange={(e) => updatePolicy({ pricePerPet: e.target.value })}
                  placeholder="0"
                  className="pr-12"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-gray-400">
                  บาท
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: pet types — toggle buttons grid */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-gray-900">ชนิดสัตว์เลี้ยงที่รับ</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PetTypeRow
                label="แมว"
                emoji="🐱"
                accepted={policy.acceptCats}
                onChange={(v) => updatePolicy({ acceptCats: v })}
              />
              <PetTypeRow
                label="สุนัข"
                emoji="🐶"
                accepted={policy.acceptDogs}
                onChange={(v) => updatePolicy({ acceptDogs: v })}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/40 px-6 py-3">
          <Button variant="secondary" type="button" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={onSave}>
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  )
}

function PetTypeRow({
  label,
  emoji,
  accepted,
  onChange,
}: {
  label: string
  emoji?: string
  accepted: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 bg-gray-50/60 px-3 py-2 text-sm font-bold text-gray-900">
        {emoji && <span className="text-lg leading-none">{emoji}</span>}
        Pet Friendly {label}
      </div>
      <div className="grid grid-cols-2 gap-0">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            'flex items-center justify-center gap-1.5 border-t border-gray-100 px-4 py-2.5 text-sm font-medium transition-colors',
            accepted
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-white text-gray-500 hover:bg-gray-50',
          )}
          aria-pressed={accepted}
        >
          {accepted && <Icon name="check" className="size-3.5" />}
          รับ
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            'flex items-center justify-center gap-1.5 border-l border-t border-gray-100 px-4 py-2.5 text-sm font-medium transition-colors',
            !accepted
              ? 'bg-red-50 text-red-700'
              : 'bg-white text-gray-500 hover:bg-gray-50',
          )}
          aria-pressed={!accepted}
        >
          {!accepted && <Icon name="check" className="size-3.5" />}
          ไม่รับ
        </button>
      </div>
    </div>
  )
}

// ─── Parking details modal ───────────────────────────────────────────
interface ParkingModalProps {
  parking: ParkingDetails
  updateParking: (patch: Partial<ParkingDetails>) => void
  onSave: () => void
  onCancel: () => void
}

function ParkingModal({ parking, updateParking, onSave, onCancel }: ParkingModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="parking-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 pb-3 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Icon name="parking" className="size-4" />
            </div>
            <h2 id="parking-modal-title" className="text-lg font-bold text-gray-900">
              รายละเอียดที่จอดรถ
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="ปิด"
          >
            <Icon name="close" className="size-3.5" />
          </button>
        </div>

        {/* Body — 3 counter rows + notes textarea */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
          <ParkingCounterRow
            label="ที่จอดรถภายในบ้าน"
            sublabel="ในรั้วบ้าน / โรงรถ"
            value={parking.indoorSlots}
            onChange={(v) => updateParking({ indoorSlots: v })}
          />
          <ParkingCounterRow
            label="ที่จอดรถภายนอกบ้าน"
            sublabel="หน้าบ้าน / ริมถนน"
            value={parking.outdoorSlots}
            onChange={(v) => updateParking({ outdoorSlots: v })}
          />
          <ParkingCounterRow
            label="ที่จอดรถโครงการ"
            sublabel="ส่วนกลางของโครงการ"
            value={parking.projectSlots}
            onChange={(v) => updateParking({ projectSlots: v })}
          />

          <div>
            <div className="mb-1.5 text-sm font-medium text-gray-800">หมายเหตุเพิ่มเติม</div>
            <textarea
              value={parking.notes}
              onChange={(e) => updateParking({ notes: e.target.value })}
              rows={3}
              placeholder="เช่น ที่จอดอยู่ฝั่งตรงข้าม, ที่จอดมีหลังคา, ค่าจอดเพิ่มเติม"
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/40 px-6 py-3">
          <Button variant="secondary" type="button" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={onSave}>
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  )
}

function ParkingCounterRow({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string
  sublabel?: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        {sublabel && <div className="text-xs text-gray-500">{sublabel}</div>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex size-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
          disabled={value <= 0}
          aria-label="ลด"
        >
          <Icon name="minus" className="size-3" />
        </button>
        <div className="flex min-w-[3rem] items-center justify-center rounded-md border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-900">
          {value}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(50, value + 1))}
          className="flex size-8 items-center justify-center rounded-md border border-brand-400 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100"
          aria-label="เพิ่ม"
        >
          <Icon name="plus" className="size-3" />
        </button>
        <span className="ml-1 text-xs text-gray-500">คัน</span>
      </div>
    </div>
  )
}

// ─── Karaoke copyright warning modal ─────────────────────────────────
/** Shown the first time the owner ticks the "คาราโอเกะ" amenity tile.
 *  Owner can either acknowledge the warning (keep karaoke) or auto-switch to
 *  "Smart TV เชื่อมต่อลำโพง" which avoids the music copyright issue. */
function KaraokeWarningModal({
  onAcknowledge,
  onSwitchToSmartTv,
}: {
  onAcknowledge: () => void
  onSwitchToSmartTv: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="karaoke-warning-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header — title + close (✕) */}
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Icon name="alert" className="size-4" />
            </div>
            <h2 id="karaoke-warning-title" className="text-base font-bold text-gray-900">
              แจ้งเตือนเรื่องลิขสิทธิ์เพลง
            </h2>
          </div>
          <button
            type="button"
            onClick={onAcknowledge}
            className="flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="ปิด"
          >
            <Icon name="close" className="size-3.5" />
          </button>
        </div>

        {/* Body — message */}
        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed text-gray-700">
            เนื่องจาก<span className="font-semibold">กฎหมายลิขสิทธิ์ด้านเพลง</span>
            {' '}บางครั้งมีเจ้าหน้าที่ค่ายเพลงเข้าไปสุ่มตรวจ —
            ถ้าท่านไม่ได้จ่ายเงินค่าลิขสิทธิ์คาราโอเกะ อาจมีความเสี่ยงทางกฎหมาย
          </p>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-red-600">
            แนะนำให้เลือกฟังก์ชันเป็น Smart TV เชื่อมต่อลำโพง แทนค่ะ
          </p>
        </div>

        {/* Footer — balanced buttons (equal width via flex-1) */}
        <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/40 px-5 py-3">
          <Button
            variant="secondary"
            type="button"
            onClick={onAcknowledge}
            className="flex-1"
          >
            ยังต้องการเลือกคาราโอเกะ
          </Button>
          <Button type="button" onClick={onSwitchToSmartTv} className="flex-1">
            เปลี่ยนเป็น Smart TV
          </Button>
        </div>
      </div>
    </div>
  )
}
