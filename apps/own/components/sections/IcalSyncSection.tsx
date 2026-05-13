'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Input, Label } from '@pms/ui'

interface Props {
  propertyId: string
}

const PLATFORMS = [
  { key: 'AGODA', label: 'Agoda', color: 'bg-red-500' },
  { key: 'BOOKING', label: 'Booking.com', color: 'bg-blue-600' },
  { key: 'AIRBNB', label: 'Airbnb', color: 'bg-rose-500' },
  { key: 'TRIP', label: 'Trip.com', color: 'bg-orange-500' },
  { key: 'EXPEDIA', label: 'Expedia', color: 'bg-yellow-500' },
] as const

type Platform = (typeof PLATFORMS)[number]['key']

export function IcalSyncSection({ propertyId }: Props) {
  const utils = trpc.useUtils()
  const { data: property } = trpc.property.byId.useQuery({ id: propertyId })
  const [urls, setUrls] = useState<Record<Platform, string>>({
    AGODA: '',
    BOOKING: '',
    AIRBNB: '',
    TRIP: '',
    EXPEDIA: '',
  })
  const [busy, setBusy] = useState<Platform | null>(null)

  useEffect(() => {
    if (!property?.icals) return
    const map: Record<Platform, string> = {
      AGODA: '',
      BOOKING: '',
      AIRBNB: '',
      TRIP: '',
      EXPEDIA: '',
    }
    for (const i of property.icals) {
      map[i.platform as Platform] = i.icalUrl
    }
    setUrls(map)
  }, [property?.icals])

  const upsert = trpc.propertyExtras.upsertIcal.useMutation({
    onSuccess: () => {
      utils.property.byId.invalidate({ id: propertyId })
      setBusy(null)
    },
    onError: () => setBusy(null),
  })

  function save(platform: Platform) {
    setBusy(platform)
    upsert.mutate({ propertyId, platform, icalUrl: urls[platform] })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        วาง URL ของไฟล์ <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">.ics</code> จาก OTA แต่ละเจ้า
        เพื่อ sync ปฏิทินอัตโนมัติทุก 30 นาที (Phase 5+)
      </p>

      <div className="space-y-3">
        {PLATFORMS.map((p) => {
          const original = property?.icals.find((i) => i.platform === p.key)?.icalUrl ?? ''
          const dirty = urls[p.key] !== original
          return (
            <div key={p.key} className="flex items-end gap-3 rounded-xl border border-gray-200 bg-white p-3">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${p.color} text-xs font-semibold text-white`}>
                {p.label.slice(0, 1)}
              </div>
              <div className="flex-1">
                <Label htmlFor={`ical-${p.key}`} className="mb-1">
                  {p.label}
                  {original && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10.5px] font-normal text-emerald-600">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      เชื่อมต่อแล้ว
                    </span>
                  )}
                </Label>
                <Input
                  id={`ical-${p.key}`}
                  value={urls[p.key]}
                  onChange={(e) => setUrls({ ...urls, [p.key]: e.target.value })}
                  placeholder={`https://...calendar.ics ของ ${p.label}`}
                />
              </div>
              <Button
                size="md"
                variant={dirty ? 'primary' : 'secondary'}
                onClick={() => save(p.key)}
                disabled={busy === p.key || !dirty}
              >
                {busy === p.key ? '...' : urls[p.key] ? 'บันทึก' : 'ลบ'}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
