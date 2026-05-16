'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Icon, Input, Label, Modal, ModalBody, ModalFooter, Select } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'

const BANKS = [
  { code: 'SCB', label: 'ไทยพาณิชย์ (SCB)', color: 'bg-purple-600' },
  { code: 'KBANK', label: 'กสิกรไทย (KBANK)', color: 'bg-emerald-600' },
  { code: 'BBL', label: 'กรุงเทพ (BBL)', color: 'bg-blue-600' },
  { code: 'KTB', label: 'กรุงไทย (KTB)', color: 'bg-cyan-600' },
  { code: 'BAY', label: 'กรุงศรี (BAY)', color: 'bg-amber-600' },
  { code: 'TTB', label: 'ทหารไทยธนชาต (TTB)', color: 'bg-sky-700' },
  { code: 'GSB', label: 'ออมสิน (GSB)', color: 'bg-pink-600' },
  { code: 'BAAC', label: 'ธ.ก.ส.', color: 'bg-green-700' },
  { code: 'CIMB', label: 'CIMB', color: 'bg-red-700' },
  { code: 'UOB', label: 'UOB', color: 'bg-blue-800' },
]

const bankMeta = (code: string) => BANKS.find((b) => b.code === code) ?? { label: code, color: 'bg-gray-600' }

interface FormState {
  id?: string
  bank: string
  accountName: string
  accountNo: string
}

const empty: FormState = { bank: 'SCB', accountName: '', accountNo: '' }

export default function PayoutChannelsPage() {
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.payout.list.useQuery()
  const { data: properties } = trpc.property.list.useQuery()

  const [form, setForm] = useState<FormState>(empty)
  const [modalOpen, setModalOpen] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [linkPropertyIds, setLinkPropertyIds] = useState<Set<string>>(new Set())
  const [err, setErr] = useState<string | null>(null)

  const create = trpc.payout.create.useMutation({
    onSuccess: () => {
      utils.payout.list.invalidate()
      setModalOpen(false)
      setForm(empty)
    },
    onError: (e) => setErr(e.message),
  })
  const update = trpc.payout.update.useMutation({
    onSuccess: () => {
      utils.payout.list.invalidate()
      setModalOpen(false)
      setForm(empty)
    },
    onError: (e) => setErr(e.message),
  })
  const remove = trpc.payout.delete.useMutation({
    onSuccess: () => utils.payout.list.invalidate(),
  })
  const setProps = trpc.payout.setProperties.useMutation({
    onSuccess: () => {
      utils.payout.list.invalidate()
      setLinkingId(null)
    },
  })

  function openNew() {
    setForm(empty)
    setErr(null)
    setModalOpen(true)
  }
  function openEdit(c: NonNullable<typeof data>[number]) {
    setForm({ id: c.id, bank: c.bank, accountName: c.accountName, accountNo: c.accountNo })
    setErr(null)
    setModalOpen(true)
  }
  function openLink(c: NonNullable<typeof data>[number]) {
    setLinkingId(c.id)
    setLinkPropertyIds(new Set(c.properties.map((p) => p.propertyId)))
  }
  function submit() {
    setErr(null)
    if (form.id) {
      update.mutate({ id: form.id, bank: form.bank, accountName: form.accountName, accountNo: form.accountNo })
    } else {
      create.mutate(form)
    }
  }

  function toggleProp(id: string) {
    setLinkPropertyIds((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="ช่องทางรับเงิน" description="บัญชีธนาคารสำหรับลูกค้าโอนเงิน">
        <Button onClick={openNew}>+ เพิ่มบัญชี</Button>
      </PageHeader>

      {!isPending && data && data.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <Icon name="bank" className="mb-3 text-4xl text-gray-300" />
          <p className="text-sm text-gray-500">ยังไม่มีบัญชี — กด &quot;+ เพิ่มบัญชี&quot; เพื่อสร้างใหม่</p>
        </Card>
      )}

      <div className="space-y-3">
        {data?.map((c) => {
          const meta = bankMeta(c.bank)
          return (
            <Card key={c.id} className="overflow-hidden">
              <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${meta.color} text-base font-bold text-white`}>
                  {c.bank.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900">{meta.label}</div>
                  <div className="mt-0.5 font-mono text-sm text-gray-700">{c.accountNo}</div>
                  <div className="text-xs text-gray-500">ชื่อบัญชี: {c.accountName}</div>
                </div>
                <div className="md:text-right">
                  <div className="text-xs text-gray-500">ผูกกับที่พัก</div>
                  <div className="mt-0.5 text-sm font-medium text-gray-900">
                    {c.properties.length === 0
                      ? 'ทุกหลัง (default)'
                      : `${c.properties.length} หลัง`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openLink(c)}>
                    ผูก
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>
                    แก้ไข
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`ลบบัญชี ${c.accountNo}?`)) remove.mutate({ id: c.id })
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

      {/* Create/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'แก้ไขบัญชี' : 'เพิ่มบัญชี'}
        size="sm"
      >
        <ModalBody>
          <div className="space-y-4">
            <div>
              <Label required>ธนาคาร</Label>
              <Select value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })}>
                {BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label required>ชื่อบัญชี</Label>
              <Input
                value={form.accountName}
                onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                placeholder="ชื่อ-สกุล / ชื่อบริษัท"
              />
            </div>
            <div>
              <Label required>เลขบัญชี</Label>
              <Input
                value={form.accountNo}
                onChange={(e) => setForm({ ...form, accountNo: e.target.value })}
                placeholder="000-0-00000-0"
                className="font-mono"
              />
            </div>
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
          <Button onClick={submit} disabled={create.isPending || update.isPending}>
            {create.isPending || update.isPending ? 'กำลังบันทึก...' : form.id ? 'บันทึก' : 'เพิ่ม'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Link properties modal */}
      <Modal
        open={!!linkingId}
        onClose={() => setLinkingId(null)}
        title="ผูกบัญชีกับที่พัก"
        description="เลือกที่พักที่ใช้บัญชีนี้ — ถ้าไม่เลือกเลย = ใช้กับทุกหลัง"
        size="md"
      >
        <ModalBody>
          {properties?.properties.length === 0 ? (
            <p className="text-sm text-gray-500">ยังไม่มีที่พัก</p>
          ) : (
            <div className="space-y-1.5">
              {properties?.properties.map((p) => {
                const name = (p.name as { th?: string })?.th ?? p.code
                const active = linkPropertyIds.has(p.id)
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleProp(p.id)}
                      className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{name}</div>
                      <div className="text-xs text-gray-500">{p.code}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setLinkingId(null)}>
            ยกเลิก
          </Button>
          <Button
            onClick={() =>
              linkingId && setProps.mutate({ id: linkingId, propertyIds: Array.from(linkPropertyIds) })
            }
            disabled={setProps.isPending}
          >
            {setProps.isPending ? 'กำลังบันทึก...' : 'บันทึกการผูก'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
