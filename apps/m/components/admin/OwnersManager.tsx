'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon, Input, Label, Modal, ModalBody, ModalFooter } from '@pms/ui'

interface OwnerForm {
  id?: string
  name: string
  email: string
  phone: string
  password: string
  saleSlug: string
}

const emptyForm: OwnerForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  saleSlug: '',
}

export function OwnersManager() {
  const utils = trpc.useUtils()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<OwnerForm>(emptyForm)
  const [pwUserId, setPwUserId] = useState<string | null>(null)
  const [newPw, setNewPw] = useState('')

  const { data, isPending } = trpc.admin.user.listOwners.useQuery({ q: q || undefined })
  const refetch = () => utils.admin.user.listOwners.invalidate()

  const create = trpc.admin.user.createOwner.useMutation({
    onSuccess: () => {
      refetch()
      setOpen(false)
      setForm(emptyForm)
    },
    onError: (e) => alert(e.message),
  })
  const update = trpc.admin.user.update.useMutation({
    onSuccess: () => {
      refetch()
      setOpen(false)
      setForm(emptyForm)
    },
    onError: (e) => alert(e.message),
  })
  const suspend = trpc.admin.user.setSuspended.useMutation({
    onSuccess: refetch,
    onError: (e) => alert(e.message),
  })
  const resetPw = trpc.admin.user.resetPassword.useMutation({
    onSuccess: () => {
      setPwUserId(null)
      setNewPw('')
      alert('เปลี่ยนรหัสผ่านเรียบร้อย')
    },
    onError: (e) => alert(e.message),
  })

  const owners = data ?? []

  function openCreate() {
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(u: (typeof owners)[number]) {
    setForm({
      id: u.id,
      name: u.name ?? '',
      email: u.email,
      phone: u.phone ?? '',
      password: '',
      saleSlug: u.saleSlug ?? '',
    })
    setOpen(true)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.id) {
      update.mutate({
        id: form.id,
        name: form.name,
        phone: form.phone || undefined,
        saleSlug: form.saleSlug || null,
      })
    } else {
      create.mutate({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        saleSlug: form.saleSlug || undefined,
      })
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อ / อีเมล"
            className="pl-9"
          />
        </div>
        <Button type="button" onClick={openCreate}>
          <Icon name="plus" className="size-3.5" />
          เพิ่มเจ้าของ
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {isPending && (
          <div className="px-5 py-10 text-center text-sm text-gray-500">กำลังโหลด...</div>
        )}
        <ul className="divide-y divide-gray-100">
          {owners.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-gray-50 sm:flex-nowrap"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                {(u.name ?? u.email)[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900">{u.name}</span>
                  {u.suspendedAt && (
                    <Badge variant="danger" dot>
                      ระงับ
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {u.email}
                  {u.phone && <> · {u.phone}</>}
                  {u.saleSlug && (
                    <>
                      {' · '}
                      <code className="rounded bg-gray-100 px-1 py-0.5">/sale/{u.saleSlug}</code>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Icon name="home" className="size-3.5" />
                {u._count.properties}
              </div>
              <div className="flex items-center gap-1.5">
                <Button type="button" size="icon" variant="outline" title="แก้ไข" onClick={() => openEdit(u)}>
                  <Icon name="edit" className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title="เปลี่ยนรหัสผ่าน"
                  onClick={() => setPwUserId(u.id)}
                >
                  <Icon name="key" className="size-3.5" />
                </Button>
                {u.suspendedAt ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => suspend.mutate({ id: u.id, suspended: false })}
                  >
                    ปลดระงับ
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (confirm(`ระงับบัญชี ${u.email} ?`))
                        suspend.mutate({ id: u.id, suspended: true })
                    }}
                  >
                    ระงับ
                  </Button>
                )}
              </div>
            </li>
          ))}
          {!isPending && owners.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-gray-500">
              {q ? 'ไม่พบเจ้าของที่ตรงคำค้นหา' : 'ยังไม่มีเจ้าของในระบบ'}
            </li>
          )}
        </ul>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'แก้ไขเจ้าของ' : 'เพิ่มเจ้าของใหม่'}
        size="md"
      >
        <form onSubmit={submit}>
          <ModalBody className="space-y-4">
            <div>
              <Label required htmlFor="o-name">ชื่อ</Label>
              <Input
                id="o-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label required htmlFor="o-email">อีเมล</Label>
              <Input
                id="o-email"
                type="email"
                required
                disabled={!!form.id}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {form.id && (
                <p className="mt-1 text-xs text-gray-400">อีเมลแก้ไขไม่ได้</p>
              )}
            </div>
            <div>
              <Label htmlFor="o-phone">เบอร์โทร</Label>
              <Input
                id="o-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="o-slug">Sale slug (URL จองตรง)</Label>
              <Input
                id="o-slug"
                placeholder="เช่น mrkrung"
                value={form.saleSlug}
                onChange={(e) => setForm({ ...form, saleSlug: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-400">
                URL: <code>/sale/{form.saleSlug || '<slug>'}</code>
              </p>
            </div>
            {!form.id && (
              <div>
                <Label required htmlFor="o-pw">รหัสผ่านเริ่มต้น</Label>
                <Input
                  id="o-pw"
                  type="text"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-400">อย่างน้อย 6 ตัวอักษร — แจ้งเจ้าของให้เปลี่ยนภายหลัง</p>
              </div>
            )}
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

      <Modal
        open={!!pwUserId}
        onClose={() => {
          setPwUserId(null)
          setNewPw('')
        }}
        title="เปลี่ยนรหัสผ่าน"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (pwUserId) resetPw.mutate({ id: pwUserId, newPassword: newPw })
          }}
        >
          <ModalBody>
            <Label required htmlFor="new-pw">รหัสผ่านใหม่</Label>
            <Input
              id="new-pw"
              type="text"
              required
              minLength={6}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            <p className="mt-2 text-xs text-gray-400">
              อย่างน้อย 6 ตัวอักษร — เจ้าของจะใช้รหัสนี้เข้าสู่ระบบครั้งถัดไป
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPwUserId(null)
                setNewPw('')
              }}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={resetPw.isPending}>
              เปลี่ยน
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
