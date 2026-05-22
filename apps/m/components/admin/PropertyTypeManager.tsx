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

const empty: Form = {
  code: '',
  nameTh: '',
  nameEn: '',
  desc: '',
  iconRef: 'home',
  sortOrder: 0,
  isActive: true,
}

const ICON_CHOICES: IconName[] = [
  'home', 'swimmer', 'couch', 'bed', 'tree', 'mountain',
  'water', 'beach', 'shop', 'star', 'fire', 'bolt',
]

export function PropertyTypeManager() {
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.admin.propertyType.list.useQuery()
  const refetch = () => {
    utils.admin.propertyType.list.invalidate()
    utils.property.types.invalidate()
  }

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(empty)

  const create = trpc.admin.propertyType.create.useMutation({
    onSuccess: () => { refetch(); setOpen(false) },
    onError: (e) => alert(e.message),
  })
  const update = trpc.admin.propertyType.update.useMutation({
    onSuccess: () => { refetch(); setOpen(false) },
    onError: (e) => alert(e.message),
  })
  const setActive = trpc.admin.propertyType.setActive.useMutation({
    onSuccess: refetch,
    onError: (e) => alert(e.message),
  })
  const del = trpc.admin.propertyType.delete.useMutation({
    onSuccess: refetch,
    onError: (e) => alert(e.message),
  })

  const items = data ?? []

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-500">{items.length} ประเภท</div>
        <Button type="button" onClick={() => { setForm(empty); setOpen(true) }}>
          <Icon name="plus" className="size-3.5" />
          เพิ่มประเภท
        </Button>
      </div>

      {isPending && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          กำลังโหลด...
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {items.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-gray-50">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon name={(t.iconRef as IconName) ?? 'home'} className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{t.nameTh}</span>
                  {!t.isActive && <Badge variant="default" dot>ปิด</Badge>}
                  {t.usageCount > 0 && (
                    <span className="text-[11px] text-gray-500">
                      <Icon name="home" className="mr-0.5 size-3" />
                      {t.usageCount} ที่พัก
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500">
                  <code className="rounded bg-gray-100 px-1 py-0.5">{t.code}</code>
                  {t.nameEn && <> · {t.nameEn}</>}
                  {t.desc && <> · {t.desc}</>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActive.mutate({ id: t.id, isActive: !t.isActive })}
                >
                  {t.isActive ? 'ปิด' : 'เปิด'}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title="แก้ไข"
                  onClick={() => {
                    setForm({
                      id: t.id,
                      code: t.code,
                      nameTh: t.nameTh,
                      nameEn: t.nameEn ?? '',
                      desc: t.desc ?? '',
                      iconRef: t.iconRef ?? 'home',
                      sortOrder: t.sortOrder,
                      isActive: t.isActive,
                    })
                    setOpen(true)
                  }}
                >
                  <Icon name="edit" className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="danger"
                  title="ลบ"
                  disabled={t.usageCount > 0}
                  onClick={() => {
                    if (confirm(`ลบประเภท "${t.nameTh}" ?`)) del.mutate({ id: t.id })
                  }}
                >
                  <Icon name="trash" className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
          {!isPending && items.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-gray-500">
              ยังไม่มีประเภทที่พัก — กดปุ่ม &quot;เพิ่มประเภท&quot;
            </li>
          )}
        </ul>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'แก้ไขประเภทที่พัก' : 'เพิ่มประเภทที่พัก'}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const payload = {
              nameTh: form.nameTh,
              nameEn: form.nameEn || undefined,
              desc: form.desc || undefined,
              iconRef: form.iconRef || undefined,
              sortOrder: form.sortOrder,
              isActive: form.isActive,
            }
            if (form.id) update.mutate({ id: form.id, ...payload })
            else create.mutate({ code: form.code.toUpperCase(), ...payload })
          }}
        >
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required htmlFor="pt-code">Code</Label>
                <Input
                  id="pt-code"
                  required
                  disabled={!!form.id}
                  placeholder="RESORT"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })
                  }
                />
                {form.id ? (
                  <p className="mt-1 text-[11px] text-gray-400">code แก้ไม่ได้ (ใช้อ้างอิงในระบบ)</p>
                ) : (
                  <p className="mt-1 text-[11px] text-gray-400">ตัวพิมพ์ใหญ่/_/ตัวเลข เช่น RESORT, BUNGALOW</p>
                )}
              </div>
              <div>
                <Label htmlFor="pt-sort">ลำดับการแสดง</Label>
                <Input
                  id="pt-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label required htmlFor="pt-name-th">ชื่อภาษาไทย</Label>
              <Input
                id="pt-name-th"
                required
                placeholder="รีสอร์ท"
                value={form.nameTh}
                onChange={(e) => setForm({ ...form, nameTh: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="pt-name-en">ชื่อภาษาอังกฤษ</Label>
              <Input
                id="pt-name-en"
                placeholder="Resort"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="pt-desc">คำอธิบายสั้น</Label>
              <Input
                id="pt-desc"
                placeholder="พักผ่อนแบบครอบครัว"
                value={form.desc}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
              />
            </div>

            <div>
              <Label>ไอคอน</Label>
              <div className="grid grid-cols-6 gap-2">
                {ICON_CHOICES.map((ic) => {
                  const active = form.iconRef === ic
                  return (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setForm({ ...form, iconRef: ic })}
                      className={`flex aspect-square items-center justify-center rounded-lg transition-colors ${
                        active
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-100'
                      }`}
                      title={ic}
                    >
                      <Icon name={ic} className="size-4" />
                    </button>
                  )
                })}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {form.id ? 'บันทึก' : 'สร้าง'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
