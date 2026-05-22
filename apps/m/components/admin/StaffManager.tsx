'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon, Input, Label, Modal, ModalBody, ModalFooter, Select } from '@pms/ui'

interface StaffForm {
  name: string
  email: string
  password: string
  role: 'STAFF' | 'SUPER_ADMIN'
}

const emptyForm: StaffForm = { name: '', email: '', password: '', role: 'STAFF' }

export function StaffManager() {
  const { data: session } = useSession()
  const isSuperAdmin = (session?.user as { role?: string })?.role === 'SUPER_ADMIN'
  const myId = (session?.user as { id?: string })?.id

  const utils = trpc.useUtils()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<StaffForm>(emptyForm)
  const [pwUserId, setPwUserId] = useState<string | null>(null)
  const [newPw, setNewPw] = useState('')

  const { data, isPending } = trpc.admin.user.listStaff.useQuery()
  const refetch = () => utils.admin.user.listStaff.invalidate()

  const create = trpc.admin.user.createStaff.useMutation({
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
  const changeRole = trpc.admin.user.changeRole.useMutation({
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

  const staff = data ?? []

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-500">{staff.length} คน</div>
        {isSuperAdmin && (
          <Button type="button" onClick={() => { setForm(emptyForm); setOpen(true) }}>
            <Icon name="plus" className="size-3.5" />
            เพิ่มพนักงาน
          </Button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
          <Icon name="info" className="mr-1.5 size-3.5" />
          คุณเป็น STAFF — ดูได้อย่างเดียว ไม่สามารถเพิ่ม/ลบ/เปลี่ยนสิทธิ์พนักงานได้
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {isPending && (
          <div className="px-5 py-10 text-center text-sm text-gray-500">กำลังโหลด...</div>
        )}
        <ul className="divide-y divide-gray-100">
          {staff.map((u) => {
            const isSelf = u.id === myId
            return (
              <li
                key={u.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-gray-50 sm:flex-nowrap"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {(u.name ?? u.email)[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">{u.name}</span>
                    {isSelf && (
                      <Badge variant="info" dot>
                        คุณ
                      </Badge>
                    )}
                    {u.suspendedAt && (
                      <Badge variant="danger" dot>
                        ระงับ
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>

                {isSuperAdmin ? (
                  <Select
                    className="w-36"
                    value={u.role}
                    disabled={isSelf}
                    onChange={(e) =>
                      changeRole.mutate({
                        id: u.id,
                        role: e.target.value as 'STAFF' | 'SUPER_ADMIN',
                      })
                    }
                  >
                    <option value="STAFF">พนักงาน</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </Select>
                ) : u.role === 'SUPER_ADMIN' ? (
                  <Badge variant="danger" dot>
                    Super Admin
                  </Badge>
                ) : (
                  <Badge variant="brand" dot>
                    พนักงาน
                  </Badge>
                )}

                {isSuperAdmin && !isSelf && (
                  <div className="flex items-center gap-1.5">
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
                          if (confirm(`ระงับ ${u.email} ?`))
                            suspend.mutate({ id: u.id, suspended: true })
                        }}
                      >
                        ระงับ
                      </Button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
          {!isPending && staff.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-gray-500">ยังไม่มีพนักงาน</li>
          )}
        </ul>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="เพิ่มพนักงานใหม่" size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate(form)
          }}
        >
          <ModalBody className="space-y-4">
            <div>
              <Label required htmlFor="s-name">ชื่อ</Label>
              <Input
                id="s-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label required htmlFor="s-email">อีเมล</Label>
              <Input
                id="s-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label required htmlFor="s-pw">รหัสผ่านเริ่มต้น</Label>
              <Input
                id="s-pw"
                type="text"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <Label required htmlFor="s-role">สิทธิ์</Label>
              <Select
                id="s-role"
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as 'STAFF' | 'SUPER_ADMIN' })
                }
              >
                <option value="STAFF">พนักงาน (STAFF)</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </Select>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={create.isPending}>
              สร้าง
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
            <Label required htmlFor="staff-new-pw">รหัสผ่านใหม่</Label>
            <Input
              id="staff-new-pw"
              type="text"
              required
              minLength={6}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
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
