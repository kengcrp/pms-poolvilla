'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon, Input, Label, Modal, ModalBody, ModalFooter, Select } from '@pms/ui'

interface Form {
  id?: string
  code: string
  nameTh: string
  nameEn: string
  category: string
  basePrice: string
  isActive: boolean
}

const empty: Form = {
  code: '',
  nameTh: '',
  nameEn: '',
  category: 'bbq',
  basePrice: '',
  isActive: true,
}

const CATEGORIES = [
  { value: 'bbq', label: 'อาหาร/บาร์บีคิว' },
  { value: 'transfer', label: 'รถรับ-ส่ง' },
  { value: 'spa', label: 'สปา/นวด' },
  { value: 'tour', label: 'ทัวร์/กิจกรรม' },
  { value: 'rental', label: 'เช่าอุปกรณ์' },
  { value: 'other', label: 'อื่นๆ' },
]

export function ServiceManager() {
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.admin.service.list.useQuery()
  const refetch = () => utils.admin.service.list.invalidate()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(empty)

  const create = trpc.admin.service.create.useMutation({
    onSuccess: () => { refetch(); setOpen(false) },
    onError: (e) => alert(e.message),
  })
  const update = trpc.admin.service.update.useMutation({
    onSuccess: () => { refetch(); setOpen(false) },
    onError: (e) => alert(e.message),
  })
  const setActive = trpc.admin.service.setActive.useMutation({
    onSuccess: refetch,
    onError: (e) => alert(e.message),
  })
  const del = trpc.admin.service.delete.useMutation({
    onSuccess: refetch,
    onError: (e) => alert(e.message),
  })

  const items = data ?? []

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-500">{items.length} บริการ</div>
        <Button type="button" onClick={() => { setForm(empty); setOpen(true) }}>
          <Icon name="plus" className="size-3.5" />
          เพิ่มบริการ
        </Button>
      </div>

      {isPending && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          กำลังโหลด...
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {items.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-gray-50">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon name="shop" className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{s.nameTh}</span>
                  {!s.isActive && (
                    <Badge variant="default" dot>
                      ปิด
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-gray-500">
                  <code>{s.code}</code> · {s.category}
                  {s.nameEn && <> · {s.nameEn}</>}
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {s.basePrice ? `฿${Number(s.basePrice).toLocaleString('th-TH')}` : '—'}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActive.mutate({ id: s.id, isActive: !s.isActive })}
                >
                  {s.isActive ? 'ปิด' : 'เปิด'}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title="แก้ไข"
                  onClick={() => {
                    setForm({
                      id: s.id,
                      code: s.code,
                      nameTh: s.nameTh,
                      nameEn: s.nameEn ?? '',
                      category: s.category,
                      basePrice: s.basePrice ? String(s.basePrice) : '',
                      isActive: s.isActive,
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
                  onClick={() => {
                    if (confirm(`ลบ "${s.nameTh}" ?`)) del.mutate({ id: s.id })
                  }}
                >
                  <Icon name="trash" className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
          {!isPending && items.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-gray-500">
              ยังไม่มีบริการเสริมในระบบ
            </li>
          )}
        </ul>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'แก้ไขบริการ' : 'เพิ่มบริการ'}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const payload = {
              code: form.code,
              nameTh: form.nameTh,
              nameEn: form.nameEn || undefined,
              category: form.category,
              basePrice: form.basePrice ? Number(form.basePrice) : null,
              isActive: form.isActive,
            }
            if (form.id) update.mutate({ id: form.id, ...payload })
            else create.mutate(payload)
          }}
        >
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required htmlFor="s-code">Code</Label>
                <Input
                  id="s-code"
                  required
                  disabled={!!form.id}
                  placeholder="bbq_set_4p"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div>
                <Label required htmlFor="s-cat">หมวด</Label>
                <Select
                  id="s-cat"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label required htmlFor="s-name-th">ชื่อภาษาไทย</Label>
              <Input
                id="s-name-th"
                required
                value={form.nameTh}
                onChange={(e) => setForm({ ...form, nameTh: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="s-name-en">ชื่อภาษาอังกฤษ</Label>
              <Input
                id="s-name-en"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="s-price">ราคาเริ่มต้น (บาท)</Label>
              <Input
                id="s-price"
                type="number"
                min={0}
                step={1}
                placeholder="ปล่อยว่าง = ราคาแล้วแต่ที่พัก"
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
              />
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
