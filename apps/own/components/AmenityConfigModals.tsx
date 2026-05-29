'use client'

/**
 * Shared amenity-config modals — used by BOTH the new-listing wizard and
 * the in-place edit on /manage/listings/[id]/edit. Single source of truth
 * for parking / pool / pet-policy / karaoke UX.
 */

import { Button, Icon, Input, cn, type IconName } from '@pms/ui'

// ─── Parking ───────────────────────────────────────────────────────────

export interface ParkingDetails {
  /** Cars that can park inside the property (garage / inside the gate) */
  indoorSlots: number
  /** Cars that can park outside the property (on the street / driveway outside gate) */
  outdoorSlots: number
  /** Cars that can use the project / shared parking area */
  projectSlots: number
  /** Extra notes (e.g. "ที่จอดอยู่ฝั่งตรงข้าม") */
  notes: string
}

export function blankParking(): ParkingDetails {
  return { indoorSlots: 0, outdoorSlots: 0, projectSlots: 0, notes: '' }
}

// ─── Pet policy ────────────────────────────────────────────────────────

export interface PetPolicy {
  /** Max number of pets allowed per booking */
  maxPets: number
  /** Extra fee in THB per pet */
  pricePerPet: string
  /** Whether cats are allowed */
  acceptCats: boolean
  /** Whether dogs are allowed */
  acceptDogs: boolean
}

export function blankPetPolicy(): PetPolicy {
  return { maxPets: 0, pricePerPet: '', acceptCats: false, acceptDogs: false }
}

// ─── Pool ──────────────────────────────────────────────────────────────

export type PoolOwnership = 'SHARED' | 'PRIVATE'
export type PoolSystem = 'SALT' | 'CHLORINE' | 'SALT_WARM' | 'CHLORINE_WARM' | 'FRESH_WARM'

export const POOL_SYSTEM_OPTIONS: { code: PoolSystem; label: string }[] = [
  { code: 'SALT', label: 'ระบบน้ำเกลือ' },
  { code: 'CHLORINE', label: 'ระบบคลอรีน' },
  { code: 'FRESH_WARM', label: 'ระบบน้ำแร่' },
  { code: 'SALT_WARM', label: 'ระบบน้ำอุ่น' },
]

export const POOL_FEATURES: { code: string; label: string; emoji: string }[] = [
  { code: 'kid_pool', label: 'สระว่ายน้ำเด็ก', emoji: '👶' },
  { code: 'slider', label: 'สไลเดอร์', emoji: '🛝' },
  { code: 'sea_view', label: 'วิวทะเล', emoji: '🌊' },
  { code: 'bbq_area', label: 'ที่ปิ้งย่าง', emoji: '🍖' },
  { code: 'jacuzzi', label: 'จากุซซี่', emoji: '♨️' },
  { code: 'water_curtain', label: 'ม่านน้ำ', emoji: '💦' },
]

export const POOL_SHAPES: { code: string; label: string }[] = [
  { code: 'sloped', label: 'พื้นลาดเอียง (ตื้น → ลึก)' },
  { code: 'freeform', label: 'สระทรง Freeform' },
  { code: 'l_shape', label: 'สระทรงตัว L' },
  { code: 'jacuzzi_system', label: 'มีระบบจากุซซี่' },
]

export interface PoolConfig {
  ownership: PoolOwnership | null
  system: PoolSystem | null
  shapes: string[]
  widthM: string
  lengthM: string
  depthM: string
  features: string[]
}

export function blankPool(): PoolConfig {
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

// ─── Pool modal ────────────────────────────────────────────────────────

export interface PoolModalProps {
  pools: PoolConfig[]
  updatePool: (idx: number, patch: Partial<PoolConfig>) => void
  togglePoolFeature: (idx: number, code: string) => void
  togglePoolShape: (idx: number, code: string) => void
  addAnotherPool: () => void
  removePool: (idx: number) => void
  onSave: () => void
  onCancel: () => void
}

export function PoolModal({
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

        <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/40 px-6 py-5">
          {pools.map((p, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
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

              <div className="divide-y divide-gray-100">
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

          <button
            type="button"
            onClick={addAnotherPool}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-brand-400 hover:bg-brand-50/20 hover:text-brand-700"
          >
            <Icon name="plus" className="size-3.5" />
            เพิ่มสระว่ายน้ำอีก
          </button>
        </div>

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

// ─── Pet policy modal ──────────────────────────────────────────────────

export interface PetPolicyModalProps {
  policy: PetPolicy
  updatePolicy: (patch: Partial<PetPolicy>) => void
  onSave: () => void
  onCancel: () => void
}

export function PetPolicyModal({ policy, updatePolicy, onSave, onCancel }: PetPolicyModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
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

        <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/40 px-6 py-5">
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">จำนวนสัตว์เลี้ยงที่อนุญาต</div>
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

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-gray-900">ชนิดสัตว์เลี้ยงที่รับ</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PetTypeRow label="แมว" emoji="🐱" accepted={policy.acceptCats} onChange={(v) => updatePolicy({ acceptCats: v })} />
              <PetTypeRow label="สุนัข" emoji="🐶" accepted={policy.acceptDogs} onChange={(v) => updatePolicy({ acceptDogs: v })} />
            </div>
          </div>
        </div>

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
            accepted ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-gray-500 hover:bg-gray-50',
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
            !accepted ? 'bg-red-50 text-red-700' : 'bg-white text-gray-500 hover:bg-gray-50',
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

// ─── Parking modal ─────────────────────────────────────────────────────

export interface ParkingModalProps {
  parking: ParkingDetails
  updateParking: (patch: Partial<ParkingDetails>) => void
  onSave: () => void
  onCancel: () => void
}

export function ParkingModal({ parking, updateParking, onSave, onCancel }: ParkingModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="parking-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
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

// ─── Karaoke warning modal ─────────────────────────────────────────────

export function KaraokeWarningModal({
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

        <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/40 px-5 py-3">
          <Button variant="secondary" type="button" onClick={onAcknowledge} className="flex-1">
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
