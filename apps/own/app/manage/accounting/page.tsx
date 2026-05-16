'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Icon, Input, Modal, ModalBody, ModalFooter, Select, cn } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'

type DocType = 'QUOTE' | 'INVOICE' | 'TAX_INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'ALL'

const tabs: { key: DocType; label: string }[] = [
  { key: 'ALL', label: 'ทั้งหมด' },
  { key: 'QUOTE', label: 'ใบเสนอราคา' },
  { key: 'INVOICE', label: 'ใบแจ้งหนี้' },
  { key: 'TAX_INVOICE', label: 'ใบกำกับภาษี' },
  { key: 'CREDIT_NOTE', label: 'ใบลดหนี้' },
  { key: 'DEBIT_NOTE', label: 'ใบเพิ่มหนี้' },
]

const typeLabel = {
  QUOTE: 'ใบเสนอราคา',
  INVOICE: 'ใบแจ้งหนี้',
  TAX_INVOICE: 'ใบกำกับภาษี',
  CREDIT_NOTE: 'ใบลดหนี้',
  DEBIT_NOTE: 'ใบเพิ่มหนี้',
} as const

const statusBadge = (s: string): { label: string; variant: 'default' | 'success' | 'warning' | 'info' | 'danger' } => {
  switch (s) {
    case 'DRAFT':
      return { label: 'ร่าง', variant: 'default' }
    case 'ISSUED':
      return { label: 'ออกแล้ว', variant: 'info' }
    case 'PAID':
      return { label: 'ชำระแล้ว', variant: 'success' }
    case 'CANCELLED':
      return { label: 'ยกเลิก', variant: 'danger' }
    default:
      return { label: s, variant: 'default' }
  }
}

export default function AccountingPage() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const [tab, setTab] = useState<DocType>('ALL')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newType, setNewType] = useState<Exclude<DocType, 'ALL'>>('INVOICE')

  const { data, isPending } = trpc.accounting.list.useQuery({
    type: tab === 'ALL' ? undefined : tab,
    search: search.trim() || undefined,
  })

  const create = trpc.accounting.create.useMutation({
    onSuccess: (doc) => {
      utils.accounting.list.invalidate()
      setCreateOpen(false)
      router.push(`/manage/accounting/${doc.id}`)
    },
  })

  function handleCreate() {
    create.mutate({
      type: newType,
      customerData: { name: 'ลูกค้าใหม่' },
      items: [{ desc: 'รายการ', qty: 1, price: 0 }],
      withVat: false,
    })
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="ด้านบัญชี" description="ใบเสนอราคา / ใบแจ้งหนี้ / ใบกำกับภาษี / CN / DN">
        <Button onClick={() => setCreateOpen(true)}>+ เพิ่มเอกสาร</Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all',
              tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600 hover:text-gray-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <Input
          placeholder="ค้นหาเลขที่เอกสาร..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {!isPending && data && data.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <Icon name="invoice" className="mb-3 text-4xl text-gray-300" />
          <p className="text-sm text-gray-500">ยังไม่มีเอกสาร — กด &quot;+ เพิ่มเอกสาร&quot; เพื่อสร้างใหม่</p>
        </Card>
      )}

      <div className="space-y-2">
        {data?.map((d) => {
          const customer = d.customerData as { name?: string; phone?: string }
          const status = statusBadge(d.status)
          return (
            <Link
              key={d.id}
              href={`/manage/accounting/${d.id}`}
              className="block"
            >
              <Card hover className="overflow-hidden">
                <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                  <div className="md:w-36">
                    <Badge variant="brand">{typeLabel[d.type]}</Badge>
                    <div className="mt-1 font-mono text-sm font-semibold text-gray-900">
                      {d.docNo}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{customer?.name ?? '—'}</div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {customer?.phone ?? '—'} ·{' '}
                      {new Date(d.createdAt).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="md:text-right">
                    <div className="text-base font-bold text-gray-900">
                      ฿{Number(d.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    {Number(d.vat) > 0 && (
                      <div className="text-xs text-gray-500">
                        VAT ฿{Number(d.vat).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="md:text-right">
                    <Badge variant={status.variant} dot>
                      {status.label}
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="สร้างเอกสารใหม่" size="sm">
        <ModalBody>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">ประเภทเอกสาร</label>
          <Select value={newType} onChange={(e) => setNewType(e.target.value as typeof newType)}>
            <option value="QUOTE">ใบเสนอราคา</option>
            <option value="INVOICE">ใบแจ้งหนี้</option>
            <option value="TAX_INVOICE">ใบกำกับภาษี</option>
            <option value="CREDIT_NOTE">ใบลดหนี้</option>
            <option value="DEBIT_NOTE">ใบเพิ่มหนี้</option>
          </Select>
          <p className="mt-3 text-xs text-gray-500">
            ระบบจะสร้างเลขที่เอกสารอัตโนมัติ (เช่น INV-2026-0001) — แก้ไขข้อมูลในขั้นต่อไป
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleCreate} disabled={create.isPending}>
            {create.isPending ? 'กำลังสร้าง...' : 'สร้างร่าง'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
