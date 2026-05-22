'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon, Input, Label, Modal, ModalBody, ModalFooter, type IconName } from '@pms/ui'

interface Form {
  id?: string
  code: string
  nameTh: string
  nameEn: string
  desc: string
  iconRef: string
  sortOrder: number
  isActive: boolean
}

const empty: Form = { code: '', nameTh: '', nameEn: '', desc: '', iconRef: 'bed', sortOrder: 0, isActive: true }

const ICONS: IconName[] = ['bed', 'home', 'star', 'tree', 'mountain', 'beach', 'water', 'fire', 'bolt', 'shield', 'shop', 'tags']

export function HotelTypeManager() {
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.admin.hotelType.list.useQuery()
  const refetch = () => utils.admin.hotelType.list.invalidate()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(empty)

  const create = trpc.admin.hotelType.create.useMutation({ onSuccess: () => { refetch(); setOpen(false) }, onError: (e) => alert(e.message) })
  const update = trpc.admin.hotelType.update.useMutation({ onSuccess: () => { refetch(); setOpen(false) }, onError: (e) => alert(e.message) })
  const setActive = trpc.admin.hotelType.setActive.useMutation({ onSuccess: refetch, onError: (e) => alert(e.message) })
  const del = trpc.admin.hotelType.delete.useMutation({ onSuccess: refetch, onError: (e) => alert(e.message) })

  const items = data ?? []

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-500">{items.length} ประเภท</div>
        <Button type="button" onClick={() => { setForm(empty); setOpen(true) }}>
          <Icon name="plus" className="size-3.5" /> เพิ่มประเภท
        </Button>
      </div>

      {isPending && <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">กำลังโหลด...</div>}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {items.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-gray-50">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon name={(t.iconRef as IconName) ?? 'bed'} className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{t.nameTh}</span>
                  {!t.isActive && <Badge variant="default" dot>ปิด</Badge>}
                  {t.usageCount > 0 && (
                    <span className="text-[11px] text-gray-500"><Icon name="bed" className="mr-0.5 size-3" />{t.usageCount} โรงแรม</span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500">
                  <code className="rounded bg-gray-100 px-1 py-0.5">{t.code}</code>
                  {t.nameEn && <> · {t.nameEn}</>}
                  {t.desc && <> · {t.desc}</>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => setActive.mutate({ id: t.id, isActive: !t.isActive })}>
                  {t.isActive ? 'ปิด' : 'เปิด'}
                </Button>
                <Button type="button" size="icon" variant="outline" title="แก้ไข" onClick={() => {
                  setForm({ id: t.id, code: t.code, nameTh: t.nameTh, nameEn: t.nameEn ?? '', desc: t.desc ?? '', iconRef: t.iconRef ?? 'bed', sortOrder: t.sortOrder, isActive: t.isActive })
                  setOpen(true)
                }}>
                  <Icon name="edit" className="size-3.5" />
                </Button>
                <Button type="button" size="icon" variant="danger" title="ลบ" disabled={t.usageCount > 0} onClick={() => {
                  if (confirm(`ลบประเภท "${t.nameTh}" ?`)) del.mutate({ id: t.id })
                }}>
                  <Icon name="trash" className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
          {!isPending && items.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-gray-500">ยังไม่มีประเภทโรงแรม</li>
          )}
        </ul>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'แก้ไขประเภทโรงแรม' : 'เพิ่มประเภทโรงแรม'} size="md">
        <form onSubmit={(e) => {
          e.preventDefault()
          const payload = { nameTh: form.nameTh, nameEn: form.nameEn || undefined, desc: form.desc || undefined, iconRef: form.iconRef || undefined, sortOrder: form.sortOrder, isActive: form.isActive }
          if (form.id) update.mutate({ id: form.id, ...payload })
          else create.mutate({ code: form.code.toUpperCase(), ...payload })
        }}>
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required htmlFor="ht-code">Code</Label>
                <Input id="ht-code" required disabled={!!form.id} placeholder="BOUTIQUE" value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} />
              </div>
              <div>
                <Label htmlFor="ht-sort">ลำดับ</Label>
                <Input id="ht-sort" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>
            </div>
            <div><Label required htmlFor="ht-th">ชื่อภาษาไทย</Label><Input id="ht-th" required value={form.nameTh} onChange={(e) => setForm({ ...form, nameTh: e.target.value })} /></div>
            <div><Label htmlFor="ht-en">ชื่อภาษาอังกฤษ</Label><Input id="ht-en" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></div>
            <div><Label htmlFor="ht-desc">คำอธิบาย</Label><Input id="ht-desc" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></div>
            <div>
              <Label>ไอคอน</Label>
              <div className="grid grid-cols-6 gap-2">
                {ICONS.map((ic) => (
                  <button key={ic} type="button" onClick={() => setForm({ ...form, iconRef: ic })}
                    className={`flex aspect-square items-center justify-center rounded-lg transition-colors ${form.iconRef === ic ? 'bg-brand-600 text-white' : 'bg-gray-50 ring-1 ring-inset ring-gray-200 hover:bg-gray-100'}`}
                    title={ic}>
                    <Icon name={ic} className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>{form.id ? 'บันทึก' : 'สร้าง'}</Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
