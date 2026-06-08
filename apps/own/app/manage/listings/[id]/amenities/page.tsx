'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
      { code: 'kitchen', label: 'ครัวไทย', icon: 'kitchen' },
      { code: 'western_kitchen', label: 'ครัวฝรั่ง', icon: 'kitchen' },
      { code: 'kitchen_equipment', label: 'อุปกรณ์ครัว', icon: 'toolbox' },
      { code: 'washer', label: 'เครื่องซักผ้า', icon: 'shirt' },
      { code: 'dryer', label: 'เครื่องอบผ้า', icon: 'wind' },
      { code: 'parking', label: 'ที่จอดรถ', icon: 'parking' },
      { code: 'ac', label: 'เครื่องปรับอากาศ', icon: 'ac' },
      { code: 'workspace', label: 'พื้นที่ทำงาน', icon: 'briefcase' },
      { code: 'shower', label: 'อุปกรณ์อาบน้ำ', icon: 'shower' },
      // Moved from "ฟังก์ชั่นจุดเด่น" per spec — treat as everyday utilities.
      { code: 'bbq', label: 'เตาบาร์บีคิว', icon: 'fire' },
      { code: 'gym', label: 'อุปกรณ์ออกกำลังกาย', icon: 'dumbbell' },
      // Newly added per spec — common hotel-style convenience items.
      { code: 'minibar', label: 'Minibar', icon: 'glassWater' },
      { code: 'refrigerator', label: 'ตู้เย็น', icon: 'snowflake' },
      { code: 'iron_board', label: 'เตารีด', icon: 'shirt' },
      { code: 'welcome_drink', label: 'Welcome Drink', icon: 'coffee' },
      { code: 'welcome_snack', label: 'Welcome Snack', icon: 'glassWater' },
      // Newly added per spec — accessibility / facility / charging amenities.
      // Icons are best-effort with the existing UI registry (no proper lift /
      // wheelchair glyphs yet — using close substitutes).
      { code: 'lift', label: 'ลิฟท์', icon: 'building' },
      { code: 'meeting_room', label: 'Meeting Room', icon: 'chalkboard' },
      { code: 'wheelchair_ramp', label: 'ทางลาดวีลแชร์', icon: 'users' },
      { code: 'ev_charger', label: 'ที่ชาร์จ EV', icon: 'bolt' },
      { code: 'jacuzzi', label: 'อ่างจากุซซี่', icon: 'hotTub' },
    ],
  },
  {
    title: 'ฟังก์ชั่นจุดเด่นที่พัก',
    amenities: [
      // Removed per spec: ลานสนามหญ้า / พื้นที่ทานข้าวกลางแจ้ง / เตาไฟกลางแจ้ง /
      // เตาผิงในบ้าน / อ่างน้ำร้อน / ติดทะเลสาบ-ทะเล.
      // Views + ติดชายหาด/น้ำตก/แม่น้ำ moved to the new "ข้อมูลที่ตั้ง" section below.
      { code: 'pool', label: 'สระว่ายน้ำ', icon: 'swimmer' },
      { code: 'breakfast', label: 'อาหารเช้า', icon: 'coffee' },
      // Kid / family entertainment ────────────────────────────────────────
      { code: 'kid_zone', label: 'Kid Zone', icon: 'gamepad' },
      { code: 'playground', label: 'สนามเด็กเล่น', icon: 'tents' },
      { code: 'outdoor_activity', label: 'ลานกิจกรรมกลางแจ้ง', icon: 'tree' },
      // Indoor games — all bundled into the "มุมสนุก/สันทนาการ" tile.
      // Clicking opens a modal with per-table counters (5 tables) plus
      // game consoles (Switch / PlayStation / Arcade) and notes.
      { code: 'activity_table', label: 'มุมสนุก/สันทนาการ', icon: 'chalkboard' },
      { code: 'piano', label: 'เปียโน', icon: 'music' },
      // Wellness ─────────────────────────────────────────────────────────
      { code: 'sauna', label: 'ซาวน่า', icon: 'spa' },
      { code: 'massage_spa', label: 'นวด/สปา', icon: 'spa' },
      { code: 'onsen', label: 'ออนเซ็น', icon: 'hotTub' },
      // Pets + entertainment add-ons moved from "สิ่งอำนวยความสะดวก" earlier.
      { code: 'pet_friendly', label: 'รับสัตว์เลี้ยง', icon: 'pet' },
      { code: 'karaoke', label: 'คาราโอเกะ', icon: 'microphone' },
      { code: 'smart_tv', label: 'Smart TV เชื่อมต่อลำโพง', icon: 'tv' },
    ],
  },
  // "ข้อมูลที่ตั้ง" section moved to /[id]/area page (step 8) per design —
  // views + nature adjacency belong with the map / coordinates / address card.
  {
    title: 'มีอุปกรณ์ความปลอดภัยอะไรบ้าง',
    amenities: [
      { code: 'smoke_alarm', label: 'อุปกรณ์ตรวจจับควัน', icon: 'alert' },
      { code: 'co_alarm', label: 'เครื่องตรวจจับคาร์บอนมอนนอกไซด์', icon: 'alert' },
      { code: 'fire_ext', label: 'ถังดับเพลิง', icon: 'fireExt' },
      { code: 'first_aid', label: 'ชุดปฐมพยาบาล', icon: 'shelter' },
      { code: 'security_camera', label: 'กล้องวงจรปิด', icon: 'eye' },
      // "ล็อคห้องนอน" (lock) removed per spec.
    ],
  },
]

/** SessionStorage keys */
const STORAGE_KEY = 'pms.newListing.amenities'
const POOLS_STORAGE_KEY = 'pms.newListing.pools'
const PET_POLICY_STORAGE_KEY = 'pms.newListing.petPolicy'
const PARKING_STORAGE_KEY = 'pms.newListing.parking'
const RECREATION_STORAGE_KEY = 'pms.newListing.recreation'
const KITCHEN_EQUIPMENT_STORAGE_KEY = 'pms.newListing.kitchenEquipment'
const SHOWER_AMENITIES_STORAGE_KEY = 'pms.newListing.showerAmenities'

// ─── Shower amenities checklist ──────────────────────────────────────
/** Items shown inside the "อุปกรณ์อาบน้ำ" modal. Owner ticks whichever the
 *  property provides. Tile lights up if at least one item is selected. */
const SHOWER_AMENITY_ITEMS: { code: string; label: string }[] = [
  { code: 'soap',       label: 'สบู่' },
  { code: 'shampoo',    label: 'แชมพู' },
  { code: 'lotion',     label: 'โลชั่น' },
  { code: 'body_towel', label: 'ผ้าเช็ดตัว' },
  { code: 'hair_towel', label: 'ผ้าเช็ดผม' },
  { code: 'bathrobe',   label: 'ชุดคลุมอาบน้ำ' },
]

// ─── Kitchen equipment checklist ─────────────────────────────────────
/** Items shown inside the "อุปกรณ์ครัว" modal. Owner ticks whichever the
 *  property provides. Tile lights up if at least one item is selected. */
const KITCHEN_EQUIPMENT_ITEMS: { code: string; label: string }[] = [
  { code: 'refrigerator',      label: 'ตู้เย็น' },
  { code: 'coffee_maker',      label: 'เครื่องชงกาแฟ' },
  { code: 'rice_cooker',       label: 'หม้อหุงข้าว' },
  { code: 'microwave',         label: 'ไมโครเวฟ' },
  { code: 'frying_pan',        label: 'กระทะ' },
  { code: 'electric_kettle',   label: 'กาต้มน้ำไฟฟ้า' },
  { code: 'toaster',           label: 'เครื่องปิ้งขนมปัง' },
  { code: 'convection_oven',   label: 'หม้ออบลมร้อน' },
  { code: 'oven',              label: 'ตู้อบ' },
  { code: 'air_fryer',         label: 'หม้อทอดไร้น้ำมัน' },
  { code: 'electric_stove',    label: 'เตาไฟฟ้า' },
  { code: 'gas_stove',         label: 'เตาแก๊ส' },
  { code: 'shabu_pot',         label: 'หม้อชาบู' },
  { code: 'charcoal_grill',    label: 'เตาปิ้งย่างถ่าน (เตาหมูกะทะ)' },
  { code: 'electric_grill',    label: 'เตาปิ้งย่างไฟฟ้า (เตาหมูกะทะ)' },
  { code: 'plates',            label: 'จาน' },
  { code: 'bowls',             label: 'ถ้วย' },
  { code: 'cutlery',           label: 'ช้อน ส้อม' },
  { code: 'knife_board',       label: 'มีด เขียง' },
  { code: 'mortar_pestle',     label: 'ครกสาก' },
  { code: 'spatula',           label: 'ตะหลิว' },
  { code: 'ladle_dipper',      label: 'กระบวย' },
  { code: 'rice_paddle',       label: 'ทัพพี' },
  { code: 'water_glass',       label: 'แก้วน้ำดื่ม' },
  { code: 'wine_glass',        label: 'แก้วไวน์' },
  { code: 'shot_glass',        label: 'แก้วชอต' },
  { code: 'coffee_mug',        label: 'แก้วกาแฟ' },
  { code: 'fruit_knife',       label: 'มีดปอกผลไม้' },
  { code: 'steamer',           label: 'หม้อนึ่ง' },
]

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

// ─── Recreation (มุมสนุก/สันทนาการ) types ─────────────────────────────
/** Count of each indoor game / console / arcade the property offers. Each row
 *  is opt-in: 0 = not provided, ≥1 = number of units. Mirrors the parking
 *  counter pattern. */
interface RecreationCounts {
  poolTable: number
  tableTennis: number
  snooker: number
  foosball: number
  airHockey: number
  nintendoSwitch: number
  playstation: number
  arcade: number
  simracing: number
}

function blankRecreation(): RecreationCounts {
  return {
    poolTable: 0,
    tableTennis: 0,
    snooker: 0,
    foosball: 0,
    airHockey: 0,
    nintendoSwitch: 0,
    playstation: 0,
    arcade: 0,
    simracing: 0,
  }
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
  { code: 'sea_view_lookout', label: 'มวยทะเล', emoji: '🌊' },
  { code: 'bbq_area', label: 'ที่ปิ้งย่าง', emoji: '🍖' },
  { code: 'jacuzzi', label: 'จากุซซี่', emoji: '♨️' },
]

/** Pool shape / style descriptors — multi-select describing what the pool looks like. */
const POOL_SHAPES: { code: string; label: string }[] = [
  { code: 'sloped', label: 'พื้นสโลบ (ตื้น → ลึก)' },
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
  /** Optional per-feature details — only a few features render extra inputs.
   *  - kid_pool: dimensions of the kids' pool (width / length / depth in m)
   *  - slider:   slide length (m) + weight limit (kg)
   *  All fields are strings so empty input doesn't coerce to 0. */
  kidPool?: { widthM: string; lengthM: string; depthM: string }
  slider?: { lengthM: string; maxLoadKg: string }
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
    kidPool: { widthM: '', lengthM: '', depthM: '' },
    slider: { lengthM: '', maxLoadKg: '' },
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

  // Recreation modal state — opened when user clicks the "มุมสนุก/สันทนาการ" tile
  const [recreationModalOpen, setRecreationModalOpen] = useState(false)
  const [recreation, setRecreation] = useState<RecreationCounts>(blankRecreation())

  // Kitchen-equipment modal state — opened when user clicks the "อุปกรณ์ครัว" tile
  const [kitchenEquipmentModalOpen, setKitchenEquipmentModalOpen] = useState(false)
  const [kitchenEquipment, setKitchenEquipment] = useState<Set<string>>(new Set())

  // Shower amenities modal state — opened when user clicks the "อุปกรณ์อาบน้ำ" tile
  const [showerModalOpen, setShowerModalOpen] = useState(false)
  const [showerAmenities, setShowerAmenities] = useState<Set<string>>(new Set())

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
    // Recreation
    const recRaw = sessionStorage.getItem(RECREATION_STORAGE_KEY)
    if (recRaw) {
      try {
        const parsed = JSON.parse(recRaw) as RecreationCounts
        setRecreation({ ...blankRecreation(), ...parsed })
      } catch {
        /* malformed — ignore */
      }
    }
    // Kitchen equipment
    const keRaw = sessionStorage.getItem(KITCHEN_EQUIPMENT_STORAGE_KEY)
    if (keRaw) {
      try {
        const parsed = JSON.parse(keRaw) as string[]
        if (Array.isArray(parsed)) setKitchenEquipment(new Set(parsed))
      } catch {
        /* malformed — ignore */
      }
    }
    // Shower amenities
    const saRaw = sessionStorage.getItem(SHOWER_AMENITIES_STORAGE_KEY)
    if (saRaw) {
      try {
        const parsed = JSON.parse(saRaw) as string[]
        if (Array.isArray(parsed)) setShowerAmenities(new Set(parsed))
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
    // Recreation corner — clicking opens a modal with per-table counters
    // (pool / table tennis / snooker / foosball / air hockey). The tile is
    // "selected" only if at least one count is > 0 (saved on modal close).
    if (code === 'activity_table') {
      setRecreationModalOpen(true)
      return
    }
    // Kitchen equipment — checklist modal. Tile selects when ≥1 item ticked.
    if (code === 'kitchen_equipment') {
      setKitchenEquipmentModalOpen(true)
      return
    }
    // Shower amenities — checklist modal (soap / shampoo / lotion / towels / robe).
    if (code === 'shower') {
      setShowerModalOpen(true)
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
      // Only save recreation if "activity_table" is selected
      if (selected.has('activity_table')) {
        sessionStorage.setItem(RECREATION_STORAGE_KEY, JSON.stringify(recreation))
      } else {
        sessionStorage.removeItem(RECREATION_STORAGE_KEY)
      }
      // Only save kitchen equipment list if "kitchen_equipment" is selected
      if (selected.has('kitchen_equipment')) {
        sessionStorage.setItem(
          KITCHEN_EQUIPMENT_STORAGE_KEY,
          JSON.stringify([...kitchenEquipment]),
        )
      } else {
        sessionStorage.removeItem(KITCHEN_EQUIPMENT_STORAGE_KEY)
      }
      // Only save shower amenities list if "shower" is selected
      if (selected.has('shower')) {
        sessionStorage.setItem(
          SHOWER_AMENITIES_STORAGE_KEY,
          JSON.stringify([...showerAmenities]),
        )
      } else {
        sessionStorage.removeItem(SHOWER_AMENITIES_STORAGE_KEY)
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

  // ─── Recreation handlers ────────────────────────────────────────────
  function updateRecreation(patch: Partial<RecreationCounts>) {
    setRecreation((prev) => ({ ...prev, ...patch }))
  }
  function saveRecreation() {
    // Meaningful if any table/console/arcade count > 0 or notes provided.
    const meaningful =
      recreation.poolTable > 0 ||
      recreation.tableTennis > 0 ||
      recreation.snooker > 0 ||
      recreation.foosball > 0 ||
      recreation.airHockey > 0 ||
      recreation.nintendoSwitch > 0 ||
      recreation.playstation > 0 ||
      recreation.arcade > 0 ||
      recreation.simracing > 0
    if (meaningful) {
      setSelected((prev) => new Set(prev).add('activity_table'))
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete('activity_table')
        return next
      })
    }
    setRecreationModalOpen(false)
  }
  function cancelRecreation() {
    setRecreationModalOpen(false)
  }

  // ─── Kitchen-equipment handlers ─────────────────────────────────────
  function toggleKitchenItem(code: string) {
    setKitchenEquipment((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }
  function saveKitchenEquipment() {
    // Tile active iff at least one item is ticked.
    if (kitchenEquipment.size > 0) {
      setSelected((prev) => new Set(prev).add('kitchen_equipment'))
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete('kitchen_equipment')
        return next
      })
    }
    setKitchenEquipmentModalOpen(false)
  }
  function cancelKitchenEquipment() {
    setKitchenEquipmentModalOpen(false)
  }

  // ─── Shower amenities handlers ──────────────────────────────────────
  function toggleShowerItem(code: string) {
    setShowerAmenities((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }
  function saveShower() {
    if (showerAmenities.size > 0) {
      setSelected((prev) => new Set(prev).add('shower'))
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete('shower')
        return next
      })
    }
    setShowerModalOpen(false)
  }
  function cancelShower() {
    setShowerModalOpen(false)
  }

  return (
    <div className="mx-auto max-w-4xl pb-24">
      {/* Top "ย้อนกลับ" breadcrumb removed per UX request — the sticky footer
          back button is the canonical back action. */}

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
          {/* ย้อนกลับ + ดำเนินการต่อ — both buttons present per UX request
              (every wizard step 1-10 should expose both controls). */}
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Link href={`/manage/listings/${id}/details`}>
              <Button variant="secondary" type="button">
                <Icon name="chevronLeft" className="size-3.5" />
                ย้อนกลับ
              </Button>
            </Link>
            <Button
              type="button"
              onClick={() => persistAndGoto(`/manage/listings/${id}/photos`)}
            >
              ดำเนินการต่อ
              <Icon name="chevronRight" className="size-3.5" />
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

      {/* Recreation (มุมสนุก/สันทนาการ) modal — per-table count picker */}
      {recreationModalOpen && (
        <RecreationModal
          recreation={recreation}
          updateRecreation={updateRecreation}
          onSave={saveRecreation}
          onCancel={cancelRecreation}
        />
      )}

      {/* Kitchen equipment modal — multi-checkbox picker */}
      {kitchenEquipmentModalOpen && (
        <ChecklistModal
          title="อุปกรณ์ครัว"
          icon="toolbox"
          items={KITCHEN_EQUIPMENT_ITEMS}
          selected={kitchenEquipment}
          onToggle={toggleKitchenItem}
          onSave={saveKitchenEquipment}
          onCancel={cancelKitchenEquipment}
          subtitle="ติ๊กรายการอุปกรณ์ที่บ้านของท่านมี — เลือกได้หลายรายการพร้อมกัน"
        />
      )}

      {/* Shower amenities modal — multi-checkbox picker */}
      {showerModalOpen && (
        <ChecklistModal
          title="อุปกรณ์อาบน้ำ"
          icon="shower"
          items={SHOWER_AMENITY_ITEMS}
          selected={showerAmenities}
          onToggle={toggleShowerItem}
          onSave={saveShower}
          onCancel={cancelShower}
          subtitle="ติ๊กของใช้ในห้องน้ำที่ที่พักของท่านจัดให้ — เลือกได้หลายรายการพร้อมกัน"
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

                {/* Features — emoji + toggle pills. Two features (kid_pool +
                    slider) render a small inline detail form when selected so
                    the owner can capture dimensions / weight limit. */}
                <PoolSection icon="spa" title="ฟังก์ชั่นสระ">
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

                  {/* kid_pool dimensions sub-form */}
                  {p.features.includes('kid_pool') && (
                    <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3">
                      <div className="mb-2 text-xs font-semibold text-brand-800">
                        👶 ขนาดสระว่ายน้ำเด็ก
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            { key: 'widthM', label: 'กว้าง (ม.)' },
                            { key: 'lengthM', label: 'ยาว (ม.)' },
                            { key: 'depthM', label: 'ลึก (ม.)' },
                          ] as const
                        ).map(({ key, label }) => (
                          <div key={key}>
                            <div className="mb-1 text-[10.5px] text-gray-500">{label}</div>
                            <Input
                              type="number"
                              min={0}
                              step="0.1"
                              value={p.kidPool?.[key] ?? ''}
                              onChange={(e) =>
                                updatePool(idx, {
                                  kidPool: {
                                    widthM: p.kidPool?.widthM ?? '',
                                    lengthM: p.kidPool?.lengthM ?? '',
                                    depthM: p.kidPool?.depthM ?? '',
                                    [key]: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* slider details sub-form */}
                  {p.features.includes('slider') && (
                    <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3">
                      <div className="mb-2 text-xs font-semibold text-brand-800">
                        🛝 รายละเอียดสไลเดอร์
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="mb-1 text-[10.5px] text-gray-500">ความยาว (ม.)</div>
                          <Input
                            type="number"
                            min={0}
                            step="0.1"
                            value={p.slider?.lengthM ?? ''}
                            onChange={(e) =>
                              updatePool(idx, {
                                slider: {
                                  lengthM: e.target.value,
                                  maxLoadKg: p.slider?.maxLoadKg ?? '',
                                },
                              })
                            }
                          />
                        </div>
                        <div>
                          <div className="mb-1 text-[10.5px] text-gray-500">
                            จำกัดน้ำหนัก (กก.)
                          </div>
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            value={p.slider?.maxLoadKg ?? ''}
                            onChange={(e) =>
                              updatePool(idx, {
                                slider: {
                                  lengthM: p.slider?.lengthM ?? '',
                                  maxLoadKg: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
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
        {/* Header — icon removed per UX request */}
        <div className="flex items-center justify-between gap-4 px-6 pb-3 pt-5">
          <h2 id="parking-modal-title" className="text-lg font-bold text-gray-900">
            รายละเอียดที่จอดรถ
          </h2>
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

// ─── Recreation (มุมสนุก/สันทนาการ) modal ────────────────────────────
/** Modal opened when owner clicks the "มุมสนุก/สันทนาการ" tile.
 *  Lets them pick how many of each game table they have — pool, table tennis,
 *  snooker, foosball, air hockey — plus free-text notes. Mirrors ParkingModal. */
interface RecreationModalProps {
  recreation: RecreationCounts
  updateRecreation: (patch: Partial<RecreationCounts>) => void
  onSave: () => void
  onCancel: () => void
}

function RecreationModal({
  recreation,
  updateRecreation,
  onSave,
  onCancel,
}: RecreationModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rec-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 pb-3 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Icon name="chalkboard" className="size-4" />
            </div>
            <h2 id="rec-modal-title" className="text-lg font-bold text-gray-900">
              มุมสนุก / สันทนาการ
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

        {/* Body — counter row per game table + free-text notes */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
          <p className="text-xs text-gray-500">
            ระบุจำนวนของแต่ละโต๊ะ/เครื่อง (ปล่อย 0 = ไม่มี). เลือกได้หลายรายการพร้อมกัน.
          </p>

          <RecreationCounterRow
            label="โต๊ะพูล"
            value={recreation.poolTable}
            onChange={(v) => updateRecreation({ poolTable: v })}
          />
          <RecreationCounterRow
            label="โต๊ะปิงปอง"
            value={recreation.tableTennis}
            onChange={(v) => updateRecreation({ tableTennis: v })}
          />
          <RecreationCounterRow
            label="โต๊ะสนุ๊ก"
            value={recreation.snooker}
            onChange={(v) => updateRecreation({ snooker: v })}
          />
          <RecreationCounterRow
            label="โต๊ะบอล (โต๊ะฟุตซอลมือ)"
            value={recreation.foosball}
            onChange={(v) => updateRecreation({ foosball: v })}
          />
          <RecreationCounterRow
            label="โต๊ะฮอกกี้"
            value={recreation.airHockey}
            onChange={(v) => updateRecreation({ airHockey: v })}
          />

          {/* Consoles + arcade — use "เครื่อง"/"ตู้" unit instead of "โต๊ะ" */}
          <RecreationCounterRow
            label="Nintendo Switch"
            value={recreation.nintendoSwitch}
            onChange={(v) => updateRecreation({ nintendoSwitch: v })}
            unit="เครื่อง"
          />
          <RecreationCounterRow
            label="Play Station"
            value={recreation.playstation}
            onChange={(v) => updateRecreation({ playstation: v })}
            unit="เครื่อง"
          />
          <RecreationCounterRow
            label="ตู้เกมส์ Arcade"
            value={recreation.arcade}
            onChange={(v) => updateRecreation({ arcade: v })}
            unit="ตู้"
          />
          <RecreationCounterRow
            label="Simracing (เกมส์แข่งรถ)"
            value={recreation.simracing}
            onChange={(v) => updateRecreation({ simracing: v })}
            unit="ชุด"
          />
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

/** Single counter row for a recreation item — shared shape with ParkingCounterRow.
 *  `unit` defaults to "โต๊ะ" (suits the game-table rows); pass "เครื่อง" for
 *  consoles + arcade so the trailing word is contextually correct. */
function RecreationCounterRow({
  label,
  value,
  onChange,
  unit = 'โต๊ะ',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
}) {
  // 3-col grid keeps the counter cluster + unit text aligned across rows
  // regardless of label length or unit word width — label flexes, counter
  // column is auto-sized to its contents, unit column has a fixed width.
  return (
    <div className="grid grid-cols-[1fr_auto_3rem] items-center gap-3">
      <div className="text-sm font-medium text-gray-800">{label}</div>
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
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isNaN(n)) return
            onChange(Math.max(0, Math.floor(n)))
          }}
          className="w-12 rounded-md border border-gray-300 px-2 py-1 text-center text-sm tabular-nums focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex size-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50"
          aria-label="เพิ่ม"
        >
          <Icon name="plus" className="size-3" />
        </button>
      </div>
      <span className="text-xs text-gray-500">{unit}</span>
    </div>
  )
}

// ─── Generic checklist modal ────────────────────────────────────────
/** Reusable modal that shows a list of checkboxes — used by both the kitchen
 *  equipment tile and the shower amenities tile. The outer tile lights up if
 *  at least one item is checked. */
interface ChecklistModalProps {
  title: string
  icon: IconName
  subtitle?: string
  items: { code: string; label: string }[]
  selected: Set<string>
  onToggle: (code: string) => void
  onSave: () => void
  onCancel: () => void
}

function ChecklistModal({
  title,
  icon,
  subtitle,
  items,
  selected,
  onToggle,
  onSave,
  onCancel,
}: ChecklistModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 pb-3 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Icon name={icon} className="size-4" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
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

        {/* Body — 2-col checklist grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {subtitle && (
            <p className="mb-3 text-xs text-gray-500">{subtitle}</p>
          )}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {items.map((item) => {
              const active = selected.has(item.code)
              return (
                <label
                  key={item.code}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors',
                    active
                      ? 'border-brand-400 bg-brand-50/60'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onToggle(item.code)}
                    className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span
                    className={cn(
                      'text-sm',
                      active ? 'font-semibold text-brand-700' : 'text-gray-800',
                    )}
                  >
                    {item.label}
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/40 px-6 py-3">
          <div className="text-xs text-gray-500">
            เลือกแล้ว <span className="font-bold text-brand-700">{selected.size}</span> / {items.length} รายการ
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={onCancel}>
              ยกเลิก
            </Button>
            <Button type="button" onClick={onSave}>
              บันทึก
            </Button>
          </div>
        </div>
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
  // Portal to document.body so `position: fixed` is relative to the viewport
  // even when an ancestor has `transform`/`filter` (which would otherwise turn
  // it into a positioning context and trap the modal at the top of the page).
  if (typeof window === 'undefined') return null
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-black/50 p-4"
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
    </div>,
    document.body,
  )
}
