'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Icon, Input, Label, Modal, ModalBody, ModalFooter, Select, cn } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'
import { ymdLocal } from '@/lib/date'

interface FormState {
  id?: string
  code: string
  name: string
  type: 'DISCOUNT' | 'CASH'
  format: 'PERCENT' | 'BAHT'
  value: number
  qty: number
  startsAt: string
  expiresAt: string
  perUser: boolean
}

function emptyForm(): FormState {
  const today = new Date()
  const inAMonth = new Date(today.getTime() + 30 * 86400000)
  return {
    code: '',
    name: '',
    type: 'DISCOUNT',
    format: 'PERCENT',
    value: 10,
    qty: 50,
    startsAt: ymdLocal(today),
    expiresAt: ymdLocal(inAMonth),
    perUser: false,
  }
}

const typeLabel = { DISCOUNT: 'ส่วนลด', CASH: 'เงินสด' } as const
const formatLabel = { PERCENT: '%', BAHT: '฿' } as const

export default function CouponsPage() {
  const utils = trpc.useUtils()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [err, setErr] = useState<string | null>(null)

  const { data, isPending } = trpc.coupon.list.useQuery({ search: search.trim() || undefined })
  const create = trpc.coupon.create.useMutation({
    onSuccess: () => {
      utils.coupon.list.invalidate()
      setModalOpen(false)
      setForm(emptyForm())
    },
    onError: (e) => setErr(e.message),
  })
  const update = trpc.coupon.update.useMutation({
    onSuccess: () => {
      utils.coupon.list.invalidate()
      setModalOpen(false)
      setForm(emptyForm())
    },
    onError: (e) => setErr(e.message),
  })
  const remove = trpc.coupon.delete.useMutation({
    onSuccess: () => utils.coupon.list.invalidate(),
  })

  function openNew() {
    setForm(emptyForm())
    setErr(null)
    setModalOpen(true)
  }
  function openEdit(c: NonNullable<typeof data>[number]) {
    setForm({
      id: c.id,
      code: c.code,
      name: c.name,
      type: c.type,
      format: c.format,
      value: Number(c.value),
      qty: c.qty,
      startsAt: ymdLocal(new Date(c.startsAt)),
      expiresAt: ymdLocal(new Date(c.expiresAt)),
      perUser: c.perUser,
    })
    setErr(null)
    setModalOpen(true)
  }

  function handleSubmit() {
    setErr(null)
    const payload = {
      code: form.code,
      name: form.name,
      type: form.type,
      format: form.format,
      value: form.value,
      qty: form.qty,
      startsAt: new Date(form.startsAt).toISOString(),
      expiresAt: new Date(form.expiresAt).toISOString(),
      perUser: form.perUser,
    }
    if (form.id) {
      update.mutate({ id: form.id, ...payload })
    } else {
      create.mutate(payload)
    }
  }

  function statusOf(c: NonNullable<typeof data>[number]): { label: string; variant: 'success' | 'danger' | 'warning' | 'default' } {
    const now = new Date()
    if (c.qtyLeft === 0) return { label: 'หมด', variant: 'danger' }
    if (now < new Date(c.startsAt)) return { label: 'ยังไม่เริ่ม', variant: 'warning' }
    if (now > new Date(c.expiresAt)) return { label: 'หมดอายุ', variant: 'default' }
    return { label: 'ใช้งานได้', variant: 'success' }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="คูปอง" description="สร้างและจัดการรหัสคูปองสำหรับลูกค้า">
        <Button onClick={openNew}>+ เพิ่มคูปอง</Button>
      </PageHeader>

      <div className="mb-6">
        <Input
          placeholder="ค้นหารหัส / ชื่อคูปอง..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {!isPending && data && data.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <Icon name="ticket" className="mb-3 text-4xl text-gray-300" />
          <p className="text-sm text-gray-500">ยังไม่มีคูปอง — กด &quot;+ เพิ่มคูปอง&quot; เพื่อสร้างใหม่</p>
        </Card>
      )}

      <div className="space-y-2">
        {data?.map((c) => {
          const stat = statusOf(c)
          const used = c.qty - c.qtyLeft
          const usePct = c.qty > 0 ? (used / c.qty) * 100 : 0
          return (
            <Card key={c.id} className="overflow-hidden">
              <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
                <div className="md:w-44">
                  <Badge variant={stat.variant} dot>
                    {stat.label}
                  </Badge>
                  <div className="mt-1 font-mono text-sm font-bold tracking-wider text-gray-900">
                    {c.code}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900">{c.name}</div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {typeLabel[c.type]} · {c.format === 'PERCENT'
                      ? `${Number(c.value)}%`
                      : `฿${Number(c.value).toLocaleString()}`}
                    {c.perUser && ' · 1 user/code'}
                  </div>
                </div>
                <div className="md:w-44">
                  <div className="text-xs text-gray-500">ใช้แล้ว {used}/{c.qty}</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cn(
                        'h-full transition-all',
                        usePct >= 100 ? 'bg-red-500' : usePct >= 80 ? 'bg-amber-500' : 'bg-emerald-500',
                      )}
                      style={{ width: `${Math.min(usePct, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="md:text-right">
                  <div className="text-xs text-gray-500">
                    {ymdLocal(new Date(c.startsAt))} → {ymdLocal(new Date(c.expiresAt))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>
                    แก้ไข
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`ลบคูปอง ${c.code}?`)) remove.mutate({ id: c.id })
                    }}
                    className="text-red-600 hover:bg-red-50"
                  >
                    ลบ
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'แก้ไขคูปอง' : 'สร้างคูปองใหม่'}
        size="md"
      >
        <ModalBody>
          <div className="space-y-6">
            {/* ── Section 1: Identity ─────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label required>รหัสคูปอง</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER25"
                  className="font-mono tracking-wider"
                />
              </div>
              <div>
                <Label required>ชื่อโปรโมชั่น</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ลดต้อนรับหน้าร้อน"
                />
              </div>
            </div>

            {/* ── Section 2: Discount value ────────────────────
                Segmented control for type (ส่วนลด / เงินสด) replaces the
                dropdown — clearer at a glance and matches modern coupon UIs. */}
            <div>
              <Label>ประเภทส่วนลด</Label>
              <div className="mt-1.5 inline-flex w-full rounded-xl bg-gray-100 p-1">
                {(
                  [
                    { val: 'DISCOUNT', label: 'ส่วนลด' },
                    { val: 'CASH', label: 'เงินสด' },
                  ] as const
                ).map((opt) => {
                  const active = form.type === opt.val
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setForm({ ...form, type: opt.val })}
                      className={cn(
                        'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all',
                        active
                          ? 'bg-white text-brand-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700',
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label required>มูลค่าส่วนลด</Label>
                {/* Combined value + unit input — number on the left, % / ฿ toggle on the right */}
                <div className="flex overflow-hidden rounded-lg ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-brand-500">
                  <input
                    type="number"
                    min={0}
                    step={form.format === 'PERCENT' ? '1' : '50'}
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                    className="min-w-0 flex-1 border-0 bg-white px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-0"
                  />
                  <div className="flex shrink-0 border-l border-gray-200 bg-gray-50">
                    {(
                      [
                        { val: 'PERCENT', label: '%' },
                        { val: 'BAHT', label: '฿' },
                      ] as const
                    ).map((opt) => {
                      const active = form.format === opt.val
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setForm({ ...form, format: opt.val })}
                          className={cn(
                            'px-3 text-sm font-bold transition-colors',
                            active
                              ? 'bg-brand-600 text-white'
                              : 'text-gray-500 hover:bg-gray-100',
                          )}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div>
                <Label required>จำนวนที่ออก</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
                  className="tabular-nums"
                />
              </div>
            </div>

            {/* ── Section 3: Validity window ───────────────── */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                ระยะเวลาใช้งาน
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label required>เริ่มใช้</Label>
                  <Input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  />
                </div>
                <div>
                  <Label required>หมดอายุ</Label>
                  <Input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* ── Section 4: Per-customer limit ────────────── */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 transition-colors hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.perUser}
                onChange={(e) => setForm({ ...form, perUser: e.target.checked })}
                className="mt-0.5 size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  จำกัด 1 ครั้ง / ลูกค้า
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  ลูกค้าแต่ละคนใช้คูปองนี้ได้ครั้งเดียวเท่านั้น
                </div>
              </div>
            </label>

            {err && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {err}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending || update.isPending}>
            {(create.isPending || update.isPending) ? 'กำลังบันทึก...' : form.id ? 'บันทึก' : 'สร้างคูปอง'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
