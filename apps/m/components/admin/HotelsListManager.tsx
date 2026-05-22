'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon, Input, Label, Modal, ModalBody, ModalFooter, Select } from '@pms/ui'

interface Form {
  ownerId: string
  nameTh: string
  hotelType: string
  description: string
  address: string
  phone: string
  email: string
}

const empty: Form = { ownerId: '', nameTh: '', hotelType: '', description: '', address: '', phone: '', email: '' }

export function HotelsListManager() {
  const utils = trpc.useUtils()
  const { data: hotels, isPending } = trpc.admin.hotel.list.useQuery()
  const { data: owners } = trpc.admin.user.listOwners.useQuery({})
  const { data: types } = trpc.admin.hotelType.list.useQuery()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(empty)

  const create = trpc.admin.hotel.create.useMutation({
    onSuccess: () => {
      utils.admin.hotel.list.invalidate()
      setOpen(false)
      setForm(empty)
    },
    onError: (e) => alert(e.message),
  })
  const setActive = trpc.admin.hotel.setActive.useMutation({
    onSuccess: () => utils.admin.hotel.list.invalidate(),
    onError: (e) => alert(e.message),
  })
  const del = trpc.admin.hotel.delete.useMutation({
    onSuccess: () => utils.admin.hotel.list.invalidate(),
    onError: (e) => alert(e.message),
  })

  const activeTypes = (types ?? []).filter((t) => t.isActive)
  const items = hotels ?? []

  function openCreate() {
    setForm({
      ...empty,
      hotelType: activeTypes[0]?.code ?? '',
      ownerId: (owners ?? [])[0]?.id ?? '',
    })
    setOpen(true)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-500">{items.length} โรงแรม</div>
        <Button type="button" onClick={openCreate}>
          <Icon name="plus" className="size-3.5" /> เพิ่มโรงแรม
        </Button>
      </div>

      {isPending && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          กำลังโหลด...
        </div>
      )}

      {!isPending && items.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon name="bed" className="size-5" />
          </div>
          <p className="text-sm text-gray-500">ยังไม่มีโรงแรมในระบบ</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">โรงแรม</th>
                  <th className="px-4 py-3 text-left">เจ้าของ</th>
                  <th className="px-4 py-3 text-center">ประเภทห้อง</th>
                  <th className="px-4 py-3 text-center">การจอง</th>
                  <th className="px-4 py-3 text-left">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((h) => {
                  const name = (h.name as { th?: string })?.th ?? h.code
                  const typeLabel = activeTypes.find((t) => t.code === h.hotelType)?.nameTh ?? h.hotelType
                  return (
                    <tr key={h.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                            <Icon name="bed" className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/manage-accommodation/hotels/${h.id}/edit`}
                              className="truncate font-medium text-gray-900 hover:text-brand-700"
                            >
                              {name}
                            </Link>
                            <div className="text-[11px] text-gray-500">
                              <code className="rounded bg-gray-100 px-1 py-0.5">{h.code}</code> · {typeLabel}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="text-gray-900">{h.owner.name}</div>
                        <div className="text-[11px] text-gray-500">{h.owner.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center align-middle">{h._count.roomTypes}</td>
                      <td className="px-4 py-3 text-center align-middle">{h._count.bookings}</td>
                      <td className="px-4 py-3 align-middle">
                        {h.isActive ? (
                          <Badge variant="success" dot>เปิดขาย</Badge>
                        ) : (
                          <Badge variant="default" dot>ปิด</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/manage-accommodation/hotels/${h.id}/bookings`}
                            className="flex size-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
                            title="ดูการจอง"
                          >
                            <Icon name="bookings" className="size-4" />
                          </Link>
                          <Link
                            href={`/manage-accommodation/hotels/${h.id}/edit`}
                            className="flex size-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
                            title="แก้ไข + จัดการห้อง"
                          >
                            <Icon name="edit" className="size-4" />
                          </Link>
                          <button
                            type="button"
                            title={h.isActive ? 'ปิดขาย' : 'เปิดขาย'}
                            onClick={() => setActive.mutate({ id: h.id, isActive: !h.isActive })}
                            className="flex size-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100"
                          >
                            <Icon name={h.isActive ? 'eye' : 'eye'} className="size-4" />
                          </button>
                          <button
                            type="button"
                            title="ลบ"
                            onClick={() => {
                              if (confirm(`ลบ "${name}" ?`)) del.mutate({ id: h.id })
                            }}
                            className="flex size-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Icon name="trash" className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="เพิ่มโรงแรมใหม่" size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate({
              ownerId: form.ownerId,
              name: { th: form.nameTh },
              hotelType: form.hotelType,
              description: form.description || undefined,
              address: form.address || undefined,
              phone: form.phone || undefined,
              email: form.email || undefined,
            })
          }}
        >
          <ModalBody className="space-y-4">
            <div>
              <Label required htmlFor="h-owner">เจ้าของ</Label>
              <Select
                id="h-owner"
                required
                value={form.ownerId}
                onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
              >
                <option value="">-- เลือกเจ้าของ --</option>
                {(owners ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.email})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label required htmlFor="h-name">ชื่อโรงแรม (ภาษาไทย)</Label>
              <Input
                id="h-name"
                required
                placeholder="เช่น Sunset Resort"
                value={form.nameTh}
                onChange={(e) => setForm({ ...form, nameTh: e.target.value })}
              />
            </div>
            <div>
              <Label required htmlFor="h-type">ประเภทโรงแรม</Label>
              <Select
                id="h-type"
                required
                value={form.hotelType}
                onChange={(e) => setForm({ ...form, hotelType: e.target.value })}
              >
                <option value="">-- เลือกประเภท --</option>
                {activeTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.nameTh}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="h-phone">เบอร์โทร</Label>
                <Input id="h-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="h-email">อีเมล</Label>
                <Input id="h-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="h-addr">ที่อยู่</Label>
              <Input id="h-addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={create.isPending}>สร้าง</Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
