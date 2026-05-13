'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Input, Label, Select, cn } from '@pms/ui'

interface Props {
  propertyId: string
}

const POOL_OWNERSHIP = [
  { value: 'PRIVATE', label: 'ส่วนตัว' },
  { value: 'SHARED', label: 'ใช้ร่วม' },
] as const

const POOL_SYSTEM = [
  { value: 'SALT', label: 'น้ำเกลือ' },
  { value: 'CHLORINE', label: 'คลอรีน' },
  { value: 'SALT_WARM', label: 'น้ำเกลืออุ่น' },
  { value: 'CHLORINE_WARM', label: 'คลอรีนอุ่น' },
  { value: 'FRESH_WARM', label: 'น้ำจืดอุ่น' },
] as const

const POOL_FEATURES = [
  { key: 'kid_pool', label: 'สระเด็ก' },
  { key: 'slider', label: 'สไลเดอร์' },
  { key: 'sea_view', label: 'วิวทะเล' },
  { key: 'mountain_view', label: 'วิวภูเขา' },
  { key: 'jacuzzi', label: 'จากุซซี่' },
  { key: 'infinity', label: 'อินฟินิตี้' },
] as const

export function AmenitySection({ propertyId }: Props) {
  const utils = trpc.useUtils()
  const { data: property } = trpc.property.byId.useQuery({ id: propertyId })
  const { data: amenityMaster } = trpc.propertyExtras.amenityMaster.useQuery()

  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set())
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [newPool, setNewPool] = useState({
    ownership: 'PRIVATE' as 'PRIVATE' | 'SHARED',
    system: 'SALT' as 'SALT' | 'CHLORINE' | 'SALT_WARM' | 'CHLORINE_WARM' | 'FRESH_WARM',
    widthM: '',
    lengthM: '',
    depthM: '',
    features: [] as string[],
  })

  useEffect(() => {
    if (!property?.amenities) return
    setSelectedAmenities(new Set(property.amenities.map((a) => a.amenityMasterId)))
  }, [property?.amenities])

  const setAmenities = trpc.propertyExtras.setAmenities.useMutation({
    onSuccess: () => {
      utils.property.byId.invalidate({ id: propertyId })
      setSavedAt(new Date())
    },
    onError: (e) => setError(e.message),
  })
  const upsertPool = trpc.propertyExtras.upsertPool.useMutation({
    onSuccess: () => {
      utils.property.byId.invalidate({ id: propertyId })
      setNewPool({ ownership: 'PRIVATE', system: 'SALT', widthM: '', lengthM: '', depthM: '', features: [] })
    },
    onError: (e) => setError(e.message),
  })
  const deletePool = trpc.propertyExtras.deletePool.useMutation({
    onSuccess: () => utils.property.byId.invalidate({ id: propertyId }),
  })

  function toggleAmenity(id: string) {
    setSelectedAmenities((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSaveAmenities() {
    setError(null)
    setAmenities.mutate({ propertyId, amenityMasterIds: Array.from(selectedAmenities) })
  }

  function handleAddPool() {
    setError(null)
    upsertPool.mutate({
      propertyId,
      ownership: newPool.ownership,
      system: newPool.system,
      widthM: newPool.widthM ? Number(newPool.widthM) : null,
      lengthM: newPool.lengthM ? Number(newPool.lengthM) : null,
      depthM: newPool.depthM ? Number(newPool.depthM) : null,
      features: newPool.features,
    })
  }

  function toggleNewFeature(key: string) {
    setNewPool((p) => ({
      ...p,
      features: p.features.includes(key) ? p.features.filter((f) => f !== key) : [...p.features, key],
    }))
  }

  const facilityList = amenityMaster?.filter((a) => a.category === 'facility') ?? []
  const functionList = amenityMaster?.filter((a) => a.category === 'function') ?? []

  return (
    <div className="space-y-6">
      {/* Pools */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-900">สระว่ายน้ำ</h4>
        <div className="space-y-2">
          {property?.pools.map((pool, idx) => (
            <div
              key={pool.id}
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                💧
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900">สระที่ {idx + 1}</span>
                  <Badge variant="info">
                    {POOL_OWNERSHIP.find((o) => o.value === pool.ownership)?.label}
                  </Badge>
                  <Badge variant="default">{POOL_SYSTEM.find((s) => s.value === pool.system)?.label}</Badge>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {pool.widthM && pool.lengthM
                    ? `${pool.widthM}×${pool.lengthM}${pool.depthM ? `×${pool.depthM}` : ''} เมตร`
                    : 'ไม่ระบุขนาด'}
                </div>
                {Array.isArray(pool.features) && pool.features.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(pool.features as string[]).map((f) => {
                      const feat = POOL_FEATURES.find((p) => p.key === f)
                      return feat ? (
                        <span
                          key={f}
                          className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10.5px] text-gray-700"
                        >
                          {feat.label}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:bg-red-50"
                onClick={() => {
                  if (confirm(`ลบสระที่ ${idx + 1}?`)) deletePool.mutate({ id: pool.id })
                }}
              >
                <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5z" clipRule="evenodd" /></svg>
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-4">
          <div className="mb-3 text-sm font-medium text-gray-700">+ เพิ่มสระว่ายน้ำ</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ประเภทสระ</Label>
              <Select
                value={newPool.ownership}
                onChange={(e) => setNewPool({ ...newPool, ownership: e.target.value as typeof newPool.ownership })}
              >
                {POOL_OWNERSHIP.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>ระบบน้ำ</Label>
              <Select
                value={newPool.system}
                onChange={(e) => setNewPool({ ...newPool, system: e.target.value as typeof newPool.system })}
              >
                {POOL_SYSTEM.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>กว้าง (ม.)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={newPool.widthM}
                onChange={(e) => setNewPool({ ...newPool, widthM: e.target.value })}
              />
            </div>
            <div>
              <Label>ยาว (ม.)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={newPool.lengthM}
                onChange={(e) => setNewPool({ ...newPool, lengthM: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>ลึก (ม.)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={newPool.depthM}
                onChange={(e) => setNewPool({ ...newPool, depthM: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>คุณสมบัติ</Label>
              <div className="flex flex-wrap gap-1.5">
                {POOL_FEATURES.map((f) => {
                  const active = newPool.features.includes(f.key)
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => toggleNewFeature(f.key)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                      )}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={handleAddPool} disabled={upsertPool.isPending}>
              เพิ่มสระ
            </Button>
          </div>
        </div>
      </div>

      {/* Amenities (master) */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-900">ฟังก์ชัน + สิ่งอำนวยความสะดวก</h4>
        {amenityMaster && amenityMaster.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
            ยังไม่มี master amenities ในระบบ — admin จะต้องเพิ่ม
          </div>
        ) : (
          <>
            {functionList.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  ฟังก์ชัน
                </div>
                <div className="flex flex-wrap gap-2">
                  {functionList.map((a) => {
                    const active = selectedAmenities.has(a.id)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAmenity(a.id)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                          active
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                        )}
                      >
                        {a.nameTh}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {facilityList.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  สิ่งอำนวยความสะดวก
                </div>
                <div className="flex flex-wrap gap-2">
                  {facilityList.map((a) => {
                    const active = selectedAmenities.has(a.id)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAmenity(a.id)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                          active
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                        )}
                      >
                        {a.nameTh}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <div className="text-xs text-gray-500">
          {savedAt && `บันทึกล่าสุด ${savedAt.toLocaleTimeString('th-TH')}`}
        </div>
        <Button onClick={handleSaveAmenities} disabled={setAmenities.isPending}>
          {setAmenities.isPending ? 'กำลังบันทึก...' : 'บันทึก amenities'}
        </Button>
      </div>
    </div>
  )
}
