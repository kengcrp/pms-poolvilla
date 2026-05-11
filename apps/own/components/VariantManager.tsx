'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Input, Label } from '@pms/ui'

interface Props {
  propertyId: string
  totalBedrooms: number
}

export function VariantManager({ propertyId, totalBedrooms }: Props) {
  const utils = trpc.useUtils()
  const { data: property } = trpc.property.byId.useQuery({ id: propertyId })
  const [newVariant, setNewVariant] = useState({ bedrooms: 1, maxGuests: 2 })

  const refetch = () => utils.property.byId.invalidate({ id: propertyId })

  const createVariant = trpc.variant.create.useMutation({ onSuccess: refetch })
  const updateVariant = trpc.variant.update.useMutation({ onSuccess: refetch })
  const deleteVariant = trpc.variant.delete.useMutation({ onSuccess: refetch })

  const variants = property?.variants ?? []

  function handleAdd() {
    if (newVariant.bedrooms >= totalBedrooms) {
      return alert(`แบบแบ่งห้องต้องน้อยกว่าจำนวนห้องนอนทั้งหมด (${totalBedrooms})`)
    }
    createVariant.mutate({
      propertyId,
      name: { th: `แบ่งเปิด ${newVariant.bedrooms} ห้องนอน` },
      bedrooms: newVariant.bedrooms,
      maxGuests: newVariant.maxGuests,
    })
    setNewVariant({ bedrooms: 1, maxGuests: 2 })
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-900">รูปแบบการเปิดขาย (Variants)</h4>
        <p className="mt-0.5 text-xs text-gray-500">
          เปิดทั้งหลังคือ default · เพิ่มแบบแบ่งห้องเพื่อให้ลูกค้าเลือกจองเฉพาะส่วน
        </p>
      </div>

      <div className="space-y-2">
        {variants.map((v) => {
          const name = (v.name as { th?: string })?.th ?? ''
          return (
            <div
              key={v.id}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <span className="text-sm font-semibold">{v.bedrooms}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-gray-900">{name}</span>
                  {v.isDefault && <Badge variant="brand">เปิดทั้งหลัง</Badge>}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  🛏 {v.bedrooms} ห้องนอน · 👥 รองรับสูงสุด {v.maxGuests} ท่าน
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={v.maxGuests}
                    onChange={(e) =>
                      updateVariant.mutate({ id: v.id, maxGuests: Number(e.target.value) })
                    }
                  />
                  <span className="text-xs text-gray-400">คน</span>
                </div>
                {!v.isDefault && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`ลบ ${name}?`)) deleteVariant.mutate({ id: v.id })
                    }}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" /></svg>
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-4">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
          เพิ่มแบบแบ่งห้อง
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="vBed">จำนวนห้องนอน</Label>
            <Input
              id="vBed"
              type="number"
              min={1}
              max={totalBedrooms - 1}
              value={newVariant.bedrooms}
              onChange={(e) => setNewVariant({ ...newVariant, bedrooms: Number(e.target.value) })}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="vMax">รองรับ (คน)</Label>
            <Input
              id="vMax"
              type="number"
              min={1}
              value={newVariant.maxGuests}
              onChange={(e) => setNewVariant({ ...newVariant, maxGuests: Number(e.target.value) })}
            />
          </div>
          <Button type="button" onClick={handleAdd} disabled={createVariant.isPending}>
            เพิ่ม
          </Button>
        </div>
      </div>
    </div>
  )
}
