'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon, Input, Label } from '@pms/ui'

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
          <span className="font-medium">เปิดทั้งหลัง</span> = ห้องนอนเท่ากับทั้งหลัง (sync อัตโนมัติ)
          · เพิ่ม <span className="font-medium">แบ่งห้อง</span> ให้ลูกค้าเลือกจองบางส่วน
        </p>
      </div>

      <div className="space-y-2">
        {variants.map((v) => {
          const name = (v.name as { th?: string })?.th ?? ''
          const isDef = v.isDefault
          // For default variant, always show property's totalBedrooms (source of truth)
          const displayBedrooms = isDef ? totalBedrooms : v.bedrooms
          return (
            <div
              key={v.id}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <span className="text-sm font-semibold">{displayBedrooms}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-gray-900">
                    {isDef ? `เปิดทั้งหลัง (${totalBedrooms} ห้องนอน)` : name}
                  </span>
                  {isDef && <Badge variant="brand">default</Badge>}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="bed" className="size-3" /> {displayBedrooms} ห้องนอน
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="users" className="size-3" /> สูงสุด {v.maxGuests} ท่าน
                  </span>
                  {isDef && (
                    <span className="text-[10.5px] text-gray-400">
                      🔒 ห้องนอน sync กับ field ด้านบน
                    </span>
                  )}
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
                {!isDef && (
                  <Button
                    type="button"
                    variant="danger"
                    size="icon"
                    onClick={() => {
                      if (confirm(`ลบ ${name}?`)) deleteVariant.mutate({ id: v.id })
                    }}
                    title="ลบ variant"
                  >
                    <Icon name="trash" className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-4">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Icon name="plus" className="size-3.5" />
          เพิ่มแบบแบ่งห้อง
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="vBed">จำนวนห้องนอน</Label>
            <Input
              id="vBed"
              type="number"
              min={1}
              max={Math.max(1, totalBedrooms - 1)}
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
        {totalBedrooms <= 1 && (
          <p className="mt-2 text-xs text-amber-700">
            💡 ที่พักนี้มี {totalBedrooms} ห้องนอน — เพิ่ม variant ไม่ได้
            (ต้องมี ≥ 2 ห้องนอนจึงจะแบ่งได้)
          </p>
        )}
      </div>
    </div>
  )
}
