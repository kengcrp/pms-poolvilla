'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon, Input, Label, cn } from '@pms/ui'

interface Props {
  propertyId: string
  totalBedrooms: number
}

export function VariantManager({ propertyId, totalBedrooms }: Props) {
  const utils = trpc.useUtils()
  const { data: property } = trpc.property.byId.useQuery({ id: propertyId })
  const [newVariant, setNewVariant] = useState({ bedrooms: 1, maxGuests: 2 })
  // "ต้องการแบ่งเปิดห้องนอนด้วยไหม?" — controls visibility of split-variant UI.
  // Auto-defaults to ON if the property already has split variants saved.
  // null = not yet hydrated from server data; once hydrated this becomes boolean.
  const [splitEnabled, setSplitEnabled] = useState<boolean | null>(null)

  const refetch = () => utils.property.byId.invalidate({ id: propertyId })

  const createVariant = trpc.variant.create.useMutation({ onSuccess: refetch })
  const updateVariant = trpc.variant.update.useMutation({ onSuccess: refetch })
  const deleteVariant = trpc.variant.delete.useMutation({ onSuccess: refetch })

  const variants = property?.variants ?? []
  const splitVariants = variants.filter((v) => !v.isDefault)
  const defaultVariant = variants.find((v) => v.isDefault)
  const hasSplit = splitVariants.length > 0

  // Hydrate the toggle from server state once — auto-on if split variants exist.
  // Subsequent user toggles persist locally; saved variants are the source of truth on next mount.
  useEffect(() => {
    if (splitEnabled === null && property) {
      setSplitEnabled(hasSplit)
    }
  }, [property, hasSplit, splitEnabled])

  const showSplitUI = splitEnabled ?? hasSplit

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

  /** Renders one variant row (default OR split). Extracted to keep JSX DRY. */
  const renderVariantRow = (v: typeof variants[number]) => {
    const name = (v.name as { th?: string })?.th ?? ''
    const isDef = v.isDefault
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
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-900">รูปแบบการเปิดขาย (Variants)</h4>
        <p className="mt-0.5 text-xs text-gray-500">
          <span className="font-medium">เปิดทั้งหลัง</span> = ห้องนอนเท่ากับทั้งหลัง (sync อัตโนมัติ)
        </p>
      </div>

      {/* Always-shown default variant ("เปิดทั้งหลัง") */}
      {defaultVariant && <div className="space-y-2">{renderVariantRow(defaultVariant)}</div>}

      {/* ── "ท่านมีแบ่งเปิดห้องนอนด้วยไหม?" question + explanation ──
          Toggle controls whether split-variant UI is visible. When OFF and no split variants
          exist, nothing else is rendered. When OFF and existing split variants are saved, we
          still show them (they'd be invisible/abandoned otherwise) plus a hint. */}
      <div
        className={cn(
          'rounded-xl border-2 p-4 transition-colors',
          showSplitUI
            ? 'border-brand-200 bg-brand-50/40'
            : 'border-gray-200 bg-gray-50/40',
        )}
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={showSplitUI}
            onChange={(e) => setSplitEnabled(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900">
              ท่านมีแบ่งเปิดห้องนอนแบบเหมาหลังด้วยไหม?
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              <span className="font-medium text-brand-700">แบ่งเปิดห้องนอน</span>
              {' '}ช่วยเพิ่มโอกาสในการขายเมื่อลูกค้ามากรุ๊ปเล็กลง — ระบบจะให้ลูกค้าเลือกจองเฉพาะบางส่วนของบ้านได้
              เช่น บ้าน 5 ห้องนอน เปิดให้จองแบบ 2 / 3 / 4 ห้องนอนเพิ่มเติม
            </p>
          </div>
        </label>

        {/* Reveal split-variant management only when the toggle is ON */}
        {showSplitUI && (
          <div className="mt-4 space-y-3 border-t border-brand-200 pt-4">
            {/* Existing split variants */}
            {splitVariants.length > 0 && (
              <div className="space-y-2">{splitVariants.map(renderVariantRow)}</div>
            )}

            {/* Add-new form */}
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white/70 p-4">
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
                  💡 ที่พักนี้มี {totalBedrooms} ห้องนอน
                  (ต้องมีมากกว่า 2 ห้องนอนจึงจะแบ่งได้)
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
