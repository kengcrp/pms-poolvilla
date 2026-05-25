'use client'

import { useEffect, useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Input, Label, Select, Textarea } from '@pms/ui'

interface Props {
  propertyId: string
}

export function LocationSection({ propertyId }: Props) {
  const utils = trpc.useUtils()
  const { data: property } = trpc.property.byId.useQuery({ id: propertyId })
  const { data: locations } = trpc.location.list.useQuery()

  const [form, setForm] = useState({
    locationId: '',
    zoneId: '',
    province: '',
    lat: '',
    lng: '',
    gmapUrl: '',
    address: '',
    distanceTargetType: '' as '' | 'SEA' | 'WATERFALL',
    distanceValue: '',
    distanceUnit: 'METER' as 'METER' | 'KILOMETER',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    const loc = property?.location
    if (!loc) return
    setForm({
      locationId: loc.locationId,
      zoneId: loc.zoneId ?? '',
      province: loc.province,
      lat: loc.lat.toString(),
      lng: loc.lng.toString(),
      gmapUrl: loc.gmapUrl ?? '',
      address: loc.address,
      distanceTargetType: (loc.distanceTargetType ?? '') as '' | 'SEA' | 'WATERFALL',
      distanceValue: loc.distanceValue?.toString() ?? '',
      distanceUnit: (loc.distanceUnit ?? 'METER') as 'METER' | 'KILOMETER',
    })
  }, [property?.location])

  // Auto-fill province when location selected
  const selectedLocation = useMemo(
    () => locations?.find((l) => l.id === form.locationId),
    [locations, form.locationId],
  )
  useEffect(() => {
    if (selectedLocation && !form.province) {
      setForm((f) => ({ ...f, province: selectedLocation.province }))
    }
  }, [selectedLocation, form.province])

  const upsert = trpc.propertyExtras.upsertLocation.useMutation({
    onSuccess: () => {
      utils.property.byId.invalidate({ id: propertyId })
      setSavedAt(new Date())
      setSaving(false)
    },
    onError: (e) => {
      setError(e.message)
      setSaving(false)
    },
  })

  // Server-side resolver — needed for shortlinks like maps.app.goo.gl/* because browsers
  // can't follow those redirects (CORS).
  const resolveGmap = trpc.propertyExtras.resolveGmapCoords.useMutation({
    onSuccess: (r) => {
      setForm((f) => ({ ...f, lat: String(r.lat), lng: String(r.lng) }))
      setError(null)
    },
    onError: (e) => setError(e.message),
  })

  function handleSave() {
    setError(null)
    if (!form.locationId) return setError('กรุณาเลือกพื้นที่')
    if (!form.lat || !form.lng) return setError('กรุณาระบุพิกัด')
    if (!form.address) return setError('กรุณาระบุที่อยู่')
    setSaving(true)
    upsert.mutate({
      propertyId,
      locationId: form.locationId,
      zoneId: form.zoneId || null,
      province: form.province,
      lat: Number(form.lat),
      lng: Number(form.lng),
      gmapUrl: form.gmapUrl || null,
      address: form.address,
      distanceTargetType: form.distanceTargetType || null,
      distanceValue: form.distanceValue ? Number(form.distanceValue) : null,
      distanceUnit: form.distanceUnit,
    })
  }

  function detectFromGmap() {
    setError(null)
    const url = form.gmapUrl.trim()
    if (!url) return
    // Quick local match for direct /maps URLs (handles ?q=, @, !3d/!4d, ?ll=, ?query=)
    let m: RegExpMatchArray | null = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (!m) m = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (!m) m = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (!m) m = url.match(/[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (!m) {
      const lat3 = url.match(/!3d(-?\d+\.\d+)/)
      const lng4 = url.match(/!4d(-?\d+\.\d+)/)
      if (lat3 && lng4) {
        setForm((f) => ({ ...f, lat: lat3[1]!, lng: lng4[1]! }))
        return
      }
    }
    if (m) {
      setForm((f) => ({ ...f, lat: m![1]!, lng: m![2]! }))
      return
    }
    // Shortlink (maps.app.goo.gl / goo.gl/maps) — needs server resolver because the redirect
    // chain isn't accessible from the browser due to CORS.
    resolveGmap.mutate({ url })
  }

  return (
    <div className="space-y-3">
      {/* Card 1: location + zone + province */}
      <LocationCard title="ที่ตั้ง" desc="เลือกพื้นที่และโซนที่ตรงกับที่พักของคุณ">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required>พื้นที่</Label>
            <Select
              value={form.locationId}
              onChange={(e) => {
                const newLocId = e.target.value
                const newLoc = locations?.find((l) => l.id === newLocId)
                setForm((f) => ({
                  ...f,
                  locationId: newLocId,
                  zoneId: '',
                  province: newLoc?.province ?? f.province,
                }))
              }}
            >
              <option value="">— เลือกพื้นที่ —</option>
              {locations?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.province})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>โซน</Label>
            <Select
              value={form.zoneId}
              onChange={(e) => setForm({ ...form, zoneId: e.target.value })}
              disabled={!selectedLocation || selectedLocation.zones.length === 0}
            >
              <option value="">— ไม่ระบุ —</option>
              {selectedLocation?.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label required>จังหวัด</Label>
          <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
        </div>
      </LocationCard>

      {/* Card 2: Google Maps + coordinates */}
      <LocationCard title="พิกัด" desc="วางลิงก์ Google Maps แล้วระบบจะดึงพิกัดให้อัตโนมัติ">
        <div>
          <Label>ลิงก์ Google Map</Label>
          <div className="flex gap-2">
            <Input
              value={form.gmapUrl}
              onChange={(e) => setForm({ ...form, gmapUrl: e.target.value })}
              placeholder="https://maps.app.goo.gl/... หรือ https://maps.google.com/..."
            />
            <Button
              type="button"
              variant="secondary"
              onClick={detectFromGmap}
              disabled={!form.gmapUrl || resolveGmap.isPending}
            >
              {resolveGmap.isPending ? 'กำลังดึง...' : 'ดึงพิกัด'}
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            รองรับลิงก์ย่อจาก Google Maps (maps.app.goo.gl)
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>ละติจูด</Label>
            <Input
              type="number"
              step="0.0000001"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              placeholder="13.7563"
            />
          </div>
          <div>
            <Label required>ลองจิจูด</Label>
            <Input
              type="number"
              step="0.0000001"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              placeholder="100.5018"
            />
          </div>
        </div>
      </LocationCard>

      {/* Card 3: address */}
      <LocationCard title="ที่อยู่" desc="ที่อยู่จัดส่ง / ที่อยู่เต็มของที่พัก">
        <div>
          <Label required>ที่อยู่</Label>
          <Textarea
            rows={3}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="บ้านเลขที่, หมู่, ตำบล, อำเภอ..."
          />
        </div>
      </LocationCard>

      {/* Card 4: distance (optional) */}
      <LocationCard
        title="ระยะทางจากทะเล/น้ำตก"
        desc="ระบุระยะทางจากแหล่งน้ำเด่น เพื่อให้แขกเห็นจุดขาย"
        optional
      >
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>ประเภท</Label>
            <Select
              value={form.distanceTargetType}
              onChange={(e) =>
                setForm({ ...form, distanceTargetType: e.target.value as typeof form.distanceTargetType })
              }
            >
              <option value="">— ไม่ระบุ —</option>
              <option value="SEA">ทะเล</option>
              <option value="WATERFALL">น้ำตก</option>
            </Select>
          </div>
          <div>
            <Label>ระยะทาง</Label>
            <Input
              type="number"
              min={0}
              value={form.distanceValue}
              onChange={(e) => setForm({ ...form, distanceValue: e.target.value })}
            />
          </div>
          <div>
            <Label>หน่วย</Label>
            <Select
              value={form.distanceUnit}
              onChange={(e) => setForm({ ...form, distanceUnit: e.target.value as typeof form.distanceUnit })}
            >
              <option value="METER">เมตร</option>
              <option value="KILOMETER">กิโลเมตร</option>
            </Select>
          </div>
        </div>
      </LocationCard>

      {error && (
        <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-gray-500">
          {savedAt && `บันทึกล่าสุด ${savedAt.toLocaleTimeString('th-TH')}`}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลพื้นที่'}
        </Button>
      </div>
    </div>
  )
}

/** Card wrapper for grouped fields inside LocationSection. */
function LocationCard({
  title,
  desc,
  optional,
  children,
}: {
  title: string
  desc: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
        <div className="flex items-baseline gap-2">
          <div className="text-sm font-bold text-gray-900">{title}</div>
          {optional && <span className="text-xs text-gray-400">(ไม่บังคับ)</span>}
        </div>
        <div className="mt-0.5 text-xs text-gray-500">{desc}</div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  )
}
