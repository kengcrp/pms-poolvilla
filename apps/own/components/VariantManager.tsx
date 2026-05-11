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
          เปิดทั้งหลังคือ default. เพิ่มแบบแบ่งห้องเพื่อให้ลูกค้าเลือกจองแค่บางส่วน
        </p>
      </div>

      <div className="space-y-2">
        {variants.map((v) => {
          const name = (v.name as { th?: string })?.th ?? ''
          return (
            <div
              key={v.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{name}</span>
                  {v.isDefault && <Badge variant="info">เปิดทั้งหลัง</Badge>}
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  🛏 {v.bedrooms} ห้องนอน · 👥 สูงสุด {v.maxGuests} ท่าน
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  value={v.maxGuests}
                  onChange={(e) =>
                    updateVariant.mutate({ id: v.id, maxGuests: Number(e.target.value) })
                  }
                />
                <span className="text-xs text-gray-500">คน</span>
                {!v.isDefault && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`ลบ ${name}?`)) deleteVariant.mutate({ id: v.id })
                    }}
                    className="text-red-600 hover:bg-red-50"
                  >
                    🗑
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 p-4">
        <div className="mb-2 text-sm font-medium text-gray-900">+ เพิ่มแบบแบ่งห้อง</div>
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
