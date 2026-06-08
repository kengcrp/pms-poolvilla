'use client'

import { useEffect, useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Input, Label, Select, Textarea } from '@pms/ui'

interface Props {
  propertyId: string
  /** Optional slot rendered between the first card (ที่ตั้ง) and the rest
   *  (พิกัด / ที่อยู่). Used by the wizard's area step to drop the location-
   *  amenity tiles right beneath the location/zone/province selector. */
  afterFirstCard?: React.ReactNode
}

export function LocationSection({ propertyId, afterFirstCard }: Props) {
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

  /** Visible feedback once the "ดึงพิกัด" button successfully sets the lat/lng. */
  const [gmapStatus, setGmapStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [gmapMessage, setGmapMessage] = useState<string | null>(null)

  // Server-side resolver — needed for shortlinks like maps.app.goo.gl/* because browsers
  // can't follow those redirects (CORS).
  const resolveGmap = trpc.propertyExtras.resolveGmapCoords.useMutation({
    onSuccess: (r) => {
      setForm((f) => ({ ...f, lat: String(r.lat), lng: String(r.lng) }))
      setError(null)
      setGmapStatus('ok')
      setGmapMessage(`ดึงพิกัดสำเร็จ (${r.lat.toFixed(5)}, ${r.lng.toFixed(5)})`)
    },
    onError: (e) => {
      setError(e.message)
      setGmapStatus('error')
      setGmapMessage(e.message)
    },
  })

  /**
   * Debounced auto-save — replaces the explicit "บันทึกข้อมูลพื้นที่" button.
   * Only fires once all required fields (โซน / พิกัด / ที่อยู่) are filled, so
   * partial edits are silently skipped. 800ms debounce keeps the mutation off
   * the keystroke path while still feeling responsive — the savedAt timestamp
   * updates as confirmation.
   */
  useEffect(() => {
    const ready =
      Boolean(form.locationId) && Boolean(form.lat) && Boolean(form.lng) && Boolean(form.address)
    if (!ready) return
    const t = setTimeout(() => {
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
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.locationId,
    form.zoneId,
    form.province,
    form.lat,
    form.lng,
    form.gmapUrl,
    form.address,
    form.distanceTargetType,
    form.distanceValue,
    form.distanceUnit,
  ])

  /** Apply lat/lng locally + report success to the user. */
  function applyCoords(lat: string, lng: string) {
    setForm((f) => ({ ...f, lat, lng }))
    setError(null)
    setGmapStatus('ok')
    setGmapMessage(`ดึงพิกัดสำเร็จ (${lat}, ${lng})`)
  }

  function detectFromGmap() {
    setError(null)
    setGmapStatus('idle')
    setGmapMessage(null)
    const url = form.gmapUrl.trim()
    if (!url) {
      setGmapStatus('error')
      setGmapMessage('กรุณาวาง Google Maps URL ก่อนกดดึงพิกัด')
      return
    }
    // Try multiple URL patterns — Google Maps URLs vary by format/version.
    // Most common matches:
    //   @lat,lng,zoom         /maps/@13.7563,100.5018,17z (browser URL bar)
    //   !3d{lat}!4d{lng}      embedded in /maps/place/.../data=...
    //   ?q=lat,lng            search-style /maps?q=...
    //   ?ll=lat,lng           place-link /maps?ll=...
    //   ?query=lat,lng        Maps API place links
    let m: RegExpMatchArray | null = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (!m) m = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (!m) m = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (!m) m = url.match(/[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (!m) {
      // !3d{lat}!4d{lng} pattern (place URLs)
      const lat3 = url.match(/!3d(-?\d+\.\d+)/)
      const lng4 = url.match(/!4d(-?\d+\.\d+)/)
      if (lat3 && lng4) {
        applyCoords(lat3[1]!, lng4[1]!)
        return
      }
    }
    if (m) {
      applyCoords(m[1]!, m[2]!)
      return
    }
    // Shortlink (maps.app.goo.gl / goo.gl/maps) — needs server resolver because the
    // redirect chain isn't accessible from the browser due to CORS.
    resolveGmap.mutate({ url })
  }

  return (
    <div className="space-y-3">
      {/* Card 1: location + province — zone removed per UX request. We still keep
          `zoneId` in form state (default '') and submit it as null so the backend
          schema stays satisfied without any owner input. */}
      <LocationCard title="ที่ตั้ง" desc="เลือกโซนที่ตรงกับที่พักของคุณ">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required>โซน</Label>
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
              <option value="">— เลือกโซน —</option>
              {locations?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.province})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label required>จังหวัด</Label>
            <Input
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
            />
          </div>
        </div>
      </LocationCard>

      {/* Optional slot — caller can drop extra content right under the first
          card (e.g. the area-step's location-amenity tile grid). */}
      {afterFirstCard}

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
            รองรับลิงก์ย่อจาก Google Maps (maps.app.goo.gl) — หากดึงไม่สำเร็จ
            กรอกละติจูด/ลองจิจูดเองได้ด้านล่าง
          </p>
          {/* Inline status — sits right under the URL input so users get
              instant feedback after clicking "ดึงพิกัด" instead of having
              to scroll to find an error banner. */}
          {gmapStatus === 'ok' && gmapMessage && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <span aria-hidden>✓</span>
              {gmapMessage}
            </div>
          )}
          {gmapStatus === 'error' && gmapMessage && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
              <span aria-hidden>⚠</span>
              {gmapMessage}
            </div>
          )}
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

      {/* บันทึกอัตโนมัติ — ไม่มีปุ่ม "บันทึกข้อมูลพื้นที่" แล้ว แต่ยังบอก
          สถานะให้เห็นว่าระบบกำลังบันทึก / บันทึกล่าสุดเมื่อไหร่ */}
      <div className="flex items-center justify-end pt-1 text-xs text-gray-500">
        {saving
          ? 'กำลังบันทึก...'
          : savedAt
            ? `บันทึกล่าสุด ${savedAt.toLocaleTimeString('th-TH')}`
            : ''}
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
