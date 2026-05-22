'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Icon, Input, Label, Modal, ModalBody, ModalFooter, Select } from '@pms/ui'

interface Form {
  id?: string
  code: string
  nameTh: string
  nameEn: string
  category: string
}

const emptyForm: Form = { code: '', nameTh: '', nameEn: '', category: 'facility' }

const CATEGORY_OPTIONS = [
  { value: 'facility', label: 'สิ่งอำนวยความสะดวก (facility)' },
  { value: 'function', label: 'ฟังก์ชัน (function)' },
  { value: 'service', label: 'บริการ (service)' },
]

export function AmenityManager() {
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.admin.amenity.list.useQuery()
  const refetch = () => utils.admin.amenity.list.invalidate()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(emptyForm)

  const create = trpc.admin.amenity.create.useMutation({
    onSuccess: () => { refetch(); setOpen(false) },
    onError: (e) => alert(e.message),
  })
  const update = trpc.admin.amenity.update.useMutation({
    onSuccess: () => { refetch(); setOpen(false) },
    onError: (e) => alert(e.message),
  })
  const del = trpc.admin.amenity.delete.useMutation({
    onSuccess: refetch,
    onError: (e) => alert(e.message),
  })

  const items = data ?? []
  const grouped = items.reduce<Record<string, typeof items>>((acc, a) => {
    const cat = a.category ?? 'อื่นๆ'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(a)
    return acc
  }, {})

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-500">{items.length} รายการ</div>
        <Button
          type="button"
          onClick={() => {
            setForm(emptyForm)
            setOpen(true)
          }}
        >
          <Icon name="plus" className="size-3.5" />
          เพิ่มสิ่งอำนวยฯ
        </Button>
      </div>

      {isPending && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          กำลังโหลด...
        </div>
      )}

      <div className="space-y-5">
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="tags" className="size-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-gray-900">{cat}</h3>
              <span className="text-xs text-gray-400">({list.length})</span>
            </div>
            <ul className="divide-y divide-gray-100">
              {list.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{a.nameTh}</div>
                    <div className="text-[11px] text-gray-500">
                      <code>{a.code}</code>
                      {a.nameEn && <> · {a.nameEn}</>}
                      {a._count.amenities > 0 && (
                        <> · ใช้อยู่ {a._count.amenities} ที่พัก</>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    title="แก้ไข"
                    onClick={() => {
                      setForm({
                        id: a.id,
                        code: a.code,
                        nameTh: a.nameTh,
                        nameEn: a.nameEn ?? '',
                        category: a.category,
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
                      if (confirm(`ลบ "${a.nameTh}" ?`)) del.mutate({ id: a.id })
                    }}
                  >
                    <Icon name="trash" className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!isPending && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            ยังไม่มี master data
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'แก้ไขสิ่งอำนวยฯ' : 'เพิ่มสิ่งอำนวยฯ'}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (form.id) {
              update.mutate({
                id: form.id,
                nameTh: form.nameTh,
                nameEn: form.nameEn || undefined,
                category: form.category,
              })
            } else {
              create.mutate({
                code: form.code,
                nameTh: form.nameTh,
                nameEn: form.nameEn || undefined,
                category: form.category,
              })
            }
          }}
        >
          <ModalBody className="space-y-4">
            <div>
              <Label required htmlFor="a-code">Code</Label>
              <Input
                id="a-code"
                required
                disabled={!!form.id}
                placeholder="wifi, parking, bbq"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
              {form.id && <p className="mt-1 text-xs text-gray-400">code แก้ไม่ได้</p>}
            </div>
            <div>
              <Label required htmlFor="a-name-th">ชื่อภาษาไทย</Label>
              <Input
                id="a-name-th"
                required
                value={form.nameTh}
                onChange={(e) => setForm({ ...form, nameTh: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="a-name-en">ชื่อภาษาอังกฤษ</Label>
              <Input
                id="a-name-en"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              />
            </div>
            <div>
              <Label required htmlFor="a-cat">หมวด</Label>
              <Select
                id="a-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
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
