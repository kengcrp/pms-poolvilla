'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon, Input, Label, Modal, ModalBody, ModalFooter } from '@pms/ui'

interface Form {
  id?: string
  nameTh: string
  description: string
  pricePerNight: string
  totalInventory: string
  maxGuests: string
  bedConfig: string
  isActive: boolean
}

const empty: Form = {
  nameTh: '',
  description: '',
  pricePerNight: '1500',
  totalInventory: '1',
  maxGuests: '2',
  bedConfig: '',
  isActive: true,
}

export function RoomTypeManager({ hotelId }: { hotelId: string }) {
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.admin.roomType.list.useQuery({ hotelId })
  const refetch = () => utils.admin.roomType.list.invalidate({ hotelId })

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(empty)

  const create = trpc.admin.roomType.create.useMutation({
    onSuccess: () => {
      refetch()
      setOpen(false)
    },
    onError: (e) => alert(e.message),
  })
  const update = trpc.admin.roomType.update.useMutation({
    onSuccess: () => {
      refetch()
      setOpen(false)
    },
    onError: (e) => alert(e.message),
  })
  const del = trpc.admin.roomType.delete.useMutation({
    onSuccess: refetch,
    onError: (e) => alert(e.message),
  })

  const items = data ?? []

  function openCreate() {
    setForm(empty)
    setOpen(true)
  }

  function openEdit(rt: (typeof items)[number]) {
    setForm({
      id: rt.id,
      nameTh: (rt.name as { th?: string })?.th ?? '',
      description: rt.description ?? '',
      pricePerNight: String(rt.pricePerNight),
      totalInventory: String(rt.totalInventory),
      maxGuests: String(rt.maxGuests),
      bedConfig: rt.bedConfig ?? '',
      isActive: rt.isActive,
    })
    setOpen(true)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">ประเภทห้อง</h3>
        <Button type="button" size="sm" onClick={openCreate}>
          <Icon name="plus" className="size-3" /> เพิ่มประเภทห้อง
        </Button>
      </div>

      {isPending && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          กำลังโหลด...
        </div>
      )}

      {!isPending && items.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          ยังไม่มีประเภทห้อง — กดปุ่ม &quot;เพิ่มประเภทห้อง&quot;
        </div>
      )}

      <div className="space-y-2">
        {items.map((rt) => {
          const name = (rt.name as { th?: string })?.th ?? '—'
          return (
            <div
              key={rt.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-gray-300"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon name="bed" className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">{name}</span>
                  <Badge variant="brand">{rt.totalInventory} ห้อง</Badge>
                  {!rt.isActive && <Badge variant="default" dot>ปิด</Badge>}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                  <span>
                    <Icon name="cash" className="mr-0.5 size-3" />฿{Number(rt.pricePerNight).toLocaleString('th-TH')}/คืน
                  </span>
                  <span><Icon name="users" className="mr-0.5 size-3" />สูงสุด {rt.maxGuests} ท่าน</span>
                  {rt.bedConfig && <span><Icon name="bed" className="mr-0.5 size-3" />{rt.bedConfig}</span>}
                  {rt._count.bookingLines > 0 && (
                    <span className="text-brand-700">📌 ถูกจอง {rt._count.bookingLines} รายการ</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" size="icon" variant="outline" title="แก้ไข" onClick={() => openEdit(rt)}>
                  <Icon name="edit" className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="danger"
                  title="ลบ"
                  disabled={rt._count.bookingLines > 0}
                  onClick={() => {
                    if (confirm(`ลบ "${name}" ?`)) del.mutate({ id: rt.id })
                  }}
                >
                  <Icon name="trash" className="size-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'แก้ไขประเภทห้อง' : 'เพิ่มประเภทห้อง'}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const payload = {
              name: { th: form.nameTh },
              description: form.description || undefined,
              pricePerNight: Number(form.pricePerNight),
              totalInventory: Number(form.totalInventory),
              maxGuests: Number(form.maxGuests),
              bedConfig: form.bedConfig || undefined,
              isActive: form.isActive,
            }
            if (form.id) update.mutate({ id: form.id, ...payload })
            else create.mutate({ hotelId, ...payload, sortOrder: 0 })
          }}
        >
          <ModalBody className="space-y-4">
            <div>
              <Label required htmlFor="rt-name">ชื่อประเภทห้อง</Label>
              <Input
                id="rt-name"
                required
                placeholder="Deluxe King / Standard Twin / Suite ..."
                value={form.nameTh}
                onChange={(e) => setForm({ ...form, nameTh: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label required htmlFor="rt-price">ราคา/คืน (฿)</Label>
                <Input
                  id="rt-price"
                  type="number"
                  min={0}
                  required
                  value={form.pricePerNight}
                  onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
                />
              </div>
              <div>
                <Label required htmlFor="rt-inv">จำนวนห้อง</Label>
                <Input
                  id="rt-inv"
                  type="number"
                  min={1}
                  required
                  value={form.totalInventory}
                  onChange={(e) => setForm({ ...form, totalInventory: e.target.value })}
                />
              </div>
              <div>
                <Label required htmlFor="rt-max">สูงสุด/ห้อง</Label>
                <Input
                  id="rt-max"
                  type="number"
                  min={1}
                  required
                  value={form.maxGuests}
                  onChange={(e) => setForm({ ...form, maxGuests: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="rt-bed">รูปแบบเตียง</Label>
              <Input
                id="rt-bed"
                placeholder="เช่น 1 King, 2 Queen"
                value={form.bedConfig}
                onChange={(e) => setForm({ ...form, bedConfig: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="rt-desc">คำอธิบาย</Label>
              <Input
                id="rt-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="size-4 rounded border-gray-300 text-brand-600"
              />
              <span className="text-sm text-gray-700">เปิดขายอยู่</span>
            </label>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {form.id ? 'บันทึก' : 'สร้าง'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
