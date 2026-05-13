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
    // Try to extract lat/lng from a Google Maps URL like
    // https://www.google.com/maps/...@13.7563,100.5018,17z
    // or https://maps.google.com/?q=13.7563,100.5018
    const url = form.gmapUrl
    const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (m) {
      setForm((f) => ({ ...f, lat: m[1]!, lng: m[2]! }))
    } else {
      alert('ไม่พบพิกัดในลิงก์ — กรุณาใส่ในรูปแบบ @lat,lng หรือ ?q=lat,lng')
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
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

      <div>
        <Label>ลิงก์ Google Map</Label>
        <div className="flex gap-2">
          <Input
            value={form.gmapUrl}
            onChange={(e) => setForm({ ...form, gmapUrl: e.target.value })}
            placeholder="https://maps.google.com/..."
          />
          <Button type="button" variant="secondary" onClick={detectFromGmap} disabled={!form.gmapUrl}>
            ดึงพิกัด
          </Button>
        </div>
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

      <div>
        <Label required>ที่อยู่</Label>
        <Textarea
          rows={2}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="บ้านเลขที่, หมู่, ตำบล, อำเภอ..."
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <div className="mb-3 text-sm font-semibold text-gray-700">ระยะทางจากทะเล/น้ำตก (ไม่บังคับ)</div>
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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลพื้นที่'}
        </Button>
      </div>
    </div>
  )
}
