'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Input, Label, Textarea, cn } from '@pms/ui'

const typeLabel = {
  QUOTE: 'ใบเสนอราคา / Quotation',
  INVOICE: 'ใบแจ้งหนี้ / Invoice',
  TAX_INVOICE: 'ใบกำกับภาษี / Tax Invoice',
  CREDIT_NOTE: 'ใบลดหนี้ / Credit Note',
  DEBIT_NOTE: 'ใบเพิ่มหนี้ / Debit Note',
} as const

const statusBadge = (s: string): { label: string; variant: 'default' | 'success' | 'warning' | 'info' | 'danger' } => {
  switch (s) {
    case 'DRAFT': return { label: 'ร่าง', variant: 'default' }
    case 'ISSUED': return { label: 'ออกแล้ว', variant: 'info' }
    case 'PAID': return { label: 'ชำระแล้ว', variant: 'success' }
    case 'CANCELLED': return { label: 'ยกเลิก', variant: 'danger' }
    default: return { label: s, variant: 'default' }
  }
}

interface Item {
  desc: string
  qty: number
  price: number
}

interface Customer {
  name: string
  address?: string
  taxId?: string
  phone?: string
  email?: string
  branchNo?: string
  notes?: string
  withVat?: boolean
}

export default function AccountingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const utils = trpc.useUtils()

  const { data: doc, isPending, error } = trpc.accounting.byId.useQuery({ id })

  const [customer, setCustomer] = useState<Customer>({ name: '' })
  const [items, setItems] = useState<Item[]>([])
  const [withVat, setWithVat] = useState(false)
  const [notes, setNotes] = useState('')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!doc) return
    const c = doc.customerData as unknown as Customer
    setCustomer({
      name: c.name ?? '',
      address: c.address ?? '',
      taxId: c.taxId ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      branchNo: c.branchNo ?? '',
    })
    setItems(doc.items as unknown as Item[])
    setWithVat(Boolean(c.withVat))
    setNotes(c.notes ?? '')
  }, [doc])

  const update = trpc.accounting.update.useMutation({
    onSuccess: () => {
      utils.accounting.byId.invalidate({ id })
      utils.accounting.list.invalidate()
      setSavedAt(new Date())
    },
    onError: (e) => setErr(e.message),
  })
  const setStatus = trpc.accounting.setStatus.useMutation({
    onSuccess: () => {
      utils.accounting.byId.invalidate({ id })
      utils.accounting.list.invalidate()
    },
  })
  const remove = trpc.accounting.delete.useMutation({
    onSuccess: () => {
      router.push('/manage/accounting')
      router.refresh()
    },
  })

  if (isPending) return <div className="text-sm text-gray-500">กำลังโหลด...</div>
  if (error || !doc) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">ไม่พบเอกสาร</div>

  const isDraft = doc.status === 'DRAFT'
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
  const vatAmount = withVat ? subtotal * 0.07 : 0
  const grand = subtotal + vatAmount
  const status = statusBadge(doc.status)

  function save() {
    setErr(null)
    if (!customer.name.trim()) return setErr('กรุณาระบุชื่อลูกค้า')
    update.mutate({
      id,
      customerData: { ...customer, name: customer.name.trim() },
      items,
      withVat,
      notes,
    })
  }

  function addItem() {
    setItems([...items, { desc: '', qty: 1, price: 0 }])
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function deleteItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  return (
    <div className="mx-auto max-w-5xl print:max-w-none">
      <div className="print:hidden">
        <Link
          href="/manage/accounting"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
        >
          ← กลับ
        </Link>
      </div>

      {/* Action bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Badge variant={status.variant} dot>
            {status.label}
          </Badge>
          <span className="font-mono text-lg font-bold text-gray-900">{doc.docNo}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <Button onClick={save} disabled={update.isPending}>
              {update.isPending ? 'บันทึก...' : 'บันทึก'}
            </Button>
          )}
          {isDraft && (
            <Button
              variant="success"
              onClick={() => setStatus.mutate({ id, status: 'ISSUED' })}
              disabled={setStatus.isPending}
            >
              ออกเอกสาร
            </Button>
          )}
          {doc.status === 'ISSUED' && (
            <Button
              variant="success"
              onClick={() => setStatus.mutate({ id, status: 'PAID' })}
            >
              บันทึกชำระแล้ว
            </Button>
          )}
          {(doc.status === 'ISSUED' || doc.status === 'PAID') && (
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm('ยกเลิกเอกสารนี้?')) setStatus.mutate({ id, status: 'CANCELLED' })
              }}
              className="text-red-600 hover:bg-red-50"
            >
              ยกเลิก
            </Button>
          )}
          {(isDraft || doc.status === 'CANCELLED') && (
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm('ลบเอกสารถาวร?')) remove.mutate({ id })
              }}
              className="text-red-600 hover:bg-red-50"
            >
              ลบ
            </Button>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            🖨 พิมพ์
          </Button>
        </div>
      </div>

      {savedAt && (
        <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-inset ring-emerald-200 print:hidden">
          บันทึกเมื่อ {savedAt.toLocaleTimeString('th-TH')}
        </div>
      )}

      {err && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200 print:hidden">
          {err}
        </div>
      )}

      {/* Document body */}
      <Card className="overflow-hidden bg-white p-8 print:rounded-none print:border-0 print:shadow-none">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-bold tracking-tight text-gray-900">PMS Pool Villa</div>
            <div className="text-xs text-gray-500">ระบบจัดการที่พักสำหรับเจ้าของวิลล่า</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold uppercase tracking-wider text-gray-900">{typeLabel[doc.type]}</div>
            <div className="mt-1 font-mono text-sm text-gray-600">{doc.docNo}</div>
            <div className="mt-0.5 text-xs text-gray-500">
              วันที่{' '}
              {new Date(doc.createdAt).toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50/50 p-4 print:bg-white">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            ข้อมูลลูกค้า
          </div>
          {isDraft ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>ชื่อ-สกุล / บริษัท</Label>
                  <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                </div>
                <div>
                  <Label>เลขผู้เสียภาษี</Label>
                  <Input value={customer.taxId ?? ''} onChange={(e) => setCustomer({ ...customer, taxId: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>ที่อยู่</Label>
                <Textarea
                  rows={2}
                  value={customer.address ?? ''}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>โทร</Label>
                  <Input value={customer.phone ?? ''} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
                </div>
                <div>
                  <Label>อีเมล</Label>
                  <Input value={customer.email ?? ''} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                </div>
                <div>
                  <Label>สาขา</Label>
                  <Input value={customer.branchNo ?? ''} onChange={(e) => setCustomer({ ...customer, branchNo: e.target.value })} />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm">
              <div className="font-semibold text-gray-900">{customer.name}</div>
              {customer.taxId && <div className="text-gray-600">เลขผู้เสียภาษี: {customer.taxId}</div>}
              {customer.address && <div className="text-gray-600">{customer.address}</div>}
              {(customer.phone || customer.email) && (
                <div className="text-gray-600">
                  {customer.phone}
                  {customer.email && ` · ${customer.email}`}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="w-12 px-3 py-2 text-center text-xs font-semibold text-gray-500">#</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500">รายการ</th>
                <th className="w-24 px-3 py-2 text-right text-xs font-semibold text-gray-500">จำนวน</th>
                <th className="w-32 px-3 py-2 text-right text-xs font-semibold text-gray-500">ราคา/หน่วย</th>
                <th className="w-32 px-3 py-2 text-right text-xs font-semibold text-gray-500">รวม</th>
                {isDraft && <th className="w-12 print:hidden" />}
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const total = it.qty * it.price
                return (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-center text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2">
                      {isDraft ? (
                        <Input
                          value={it.desc}
                          onChange={(e) => updateItem(idx, { desc: e.target.value })}
                          placeholder="รายละเอียด"
                        />
                      ) : (
                        <span>{it.desc}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isDraft ? (
                        <Input
                          type="number"
                          min={0}
                          value={it.qty}
                          onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                          className="text-right"
                        />
                      ) : (
                        <span>{it.qty}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isDraft ? (
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={it.price}
                          onChange={(e) => updateItem(idx, { price: Number(e.target.value) })}
                          className="text-right"
                        />
                      ) : (
                        <span>{it.price.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    {isDraft && (
                      <td className="px-2 print:hidden">
                        <button
                          type="button"
                          onClick={() => deleteItem(idx)}
                          className="text-red-500 hover:text-red-700"
                          aria-label="ลบ"
                        >
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {isDraft && (
            <div className="border-t border-gray-100 p-2 print:hidden">
              <Button size="sm" variant="ghost" onClick={addItem}>
                + เพิ่มรายการ
              </Button>
            </div>
          )}
        </div>

        <div className="ml-auto w-full max-w-sm space-y-1.5 text-sm">
          {isDraft && (
            <label className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 print:hidden">
              <span className="text-gray-700">รวม VAT 7%</span>
              <input
                type="checkbox"
                checked={withVat}
                onChange={(e) => setWithVat(e.target.checked)}
                className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
            </label>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-2 text-gray-700">
            <span>รวมเป็นเงิน</span>
            <span>฿{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          {(withVat || Number(doc.vat) > 0) && (
            <div className="flex justify-between text-gray-700">
              <span>VAT 7%</span>
              <span>฿{vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-gray-300 pt-2 text-base font-bold text-gray-900">
            <span>ยอดสุทธิ</span>
            <span>฿{grand.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {(isDraft || notes) && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">หมายเหตุ</div>
            {isDraft ? (
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            ) : (
              <div className="whitespace-pre-wrap text-sm text-gray-700">{notes}</div>
            )}
          </div>
        )}

        {!isDraft && (
          <div className="mt-8 grid grid-cols-2 gap-8 print:mt-16">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 text-xs text-gray-600">ผู้รับเงิน</div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 text-xs text-gray-600">ผู้จ่ายเงิน</div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
