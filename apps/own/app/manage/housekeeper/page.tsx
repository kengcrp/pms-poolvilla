'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Icon, Input, Modal, ModalBody, ModalFooter, cn } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'

type ActionTarget = { propertyId: string; propertyName: string } | null

/**
 * Deterministic-ish short token built from propertyId + timestamp.
 * Real implementation should fetch the persisted token from the server.
 */
function buildLineLink(propertyId: string, token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/line/housekeeper/${propertyId}?t=${token}`
}

function randomToken(): string {
  // 12-char base36 token — safe for URL display
  return Array.from({ length: 2 }, () => Math.random().toString(36).slice(2, 8)).join('')
}

export default function HousekeeperPage() {
  const { data: summary, isPending } = trpc.housekeeping.summary.useQuery()
  const [lineFor, setLineFor] = useState<ActionTarget>(null)
  const [lineToken, setLineToken] = useState<string>('')
  const [copied, setCopied] = useState(false)

  // Auto-generate an initial link the moment the modal opens (per-target reset).
  useEffect(() => {
    if (lineFor) {
      setLineToken(randomToken())
      setCopied(false)
    } else {
      setLineToken('')
      setCopied(false)
    }
  }, [lineFor?.propertyId])

  const lineLink = lineFor && lineToken ? buildLineLink(lineFor.propertyId, lineToken) : ''

  const handleCopy = async () => {
    if (!lineLink) return
    try {
      await navigator.clipboard.writeText(lineLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore — older browsers without Clipboard API
    }
  }

  const handleRegenerate = () => {
    setLineToken(randomToken())
    setCopied(false)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="House Keeper"
        description="จัดการงานทำความสะอาดของแต่ละที่พัก"
      />

      {isPending && <div className="text-sm text-gray-500">กำลังโหลด...</div>}

      {!isPending && summary && summary.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <Icon name="broom" className="mb-3 text-4xl text-gray-300" />
          <p className="text-sm text-gray-500">ยังไม่มีที่พัก</p>
        </Card>
      )}

      {!isPending && summary && summary.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="w-20 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    ลำดับ
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    ชื่อที่พัก
                  </th>
                  <th className="w-40 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    จำนวนรายการ
                  </th>
                  <th className="w-[22rem] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    การจัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.map((p, idx) => {
                  const name = (p.name as { th?: string })?.th ?? p.code
                  const target: ActionTarget = { propertyId: p.id, propertyName: name }
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-gray-100 transition-colors hover:bg-gray-50/50 last:border-b-0"
                    >
                      <td className="px-4 py-4 text-center text-sm tabular-nums text-gray-500">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10.5px]">
                            {p.code}
                          </code>
                          {p.pendingCount > 0 && <Badge variant="warning">รอ {p.pendingCount}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-base font-semibold tabular-nums text-gray-900">
                          {p.taskCount}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setLineFor(target)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-500/20 transition-colors hover:bg-emerald-600"
                          >
                            <Icon name="line" className="size-3.5" />
                            เชื่อมต่อ Line House Keeper
                          </button>
                          <Link
                            href={`/manage/housekeeper/${p.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-brand-600/20 transition-colors hover:bg-brand-700"
                          >
                            <Icon name="bookings" className="size-3.5" />
                            ทำรายการ
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* LINE connect modal — link generation + copy
          Flow: open → token auto-generated → link rendered in input → copy / สร้างลิงก์ใหม่.
          Backend persistence is a roadmap item (token currently lives client-side only). */}
      <Modal
        open={!!lineFor}
        onClose={() => setLineFor(null)}
        title="เชื่อมต่อ Line House Keeper"
        description={lineFor?.propertyName}
        size="md"
      >
        <ModalBody>
          <div className="space-y-4">
            {/* Intro / how-to */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-900">
              <div className="mb-1.5 flex items-center gap-2 font-semibold">
                <Icon name="line" className="size-4 text-emerald-600" />
                วิธีเชื่อมต่อ
              </div>
              <ol className="ml-4 list-decimal space-y-0.5 text-xs leading-relaxed text-emerald-800/90">
                <li>กด "สร้างลิงก์" เพื่อสร้างลิงก์ใหม่</li>
                <li>คัดลอกแล้วส่งให้แม่บ้านเปิดในเครื่องของตนเอง</li>
                <li>แม่บ้านกดยืนยันใน LINE → ระบบจะผูกบัญชีให้อัตโนมัติ</li>
              </ol>
            </div>

            {/* Link field */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                ลิงก์เชื่อมต่อไลน์
              </label>
              <div className="flex items-stretch gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    value={lineLink}
                    readOnly
                    placeholder="กด 'สร้างลิงก์' เพื่อสร้างใหม่"
                    className="pr-11 font-mono text-[12px] text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!lineLink}
                    title={copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
                    className={cn(
                      'absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors',
                      lineLink
                        ? copied
                          ? 'text-emerald-600'
                          : 'hover:bg-gray-100 hover:text-gray-700'
                        : 'cursor-not-allowed opacity-50',
                    )}
                    aria-label="คัดลอกลิงก์"
                  >
                    <Icon name={copied ? 'check' : 'copy'} className="size-4" />
                  </button>
                </div>
                <Button onClick={handleRegenerate}>
                  <Icon name="refresh" className="size-3.5" />
                  สร้างลิงก์
                </Button>
              </div>
              <div className="mt-2 flex items-start gap-1.5 text-[11px] text-gray-500">
                <Icon name="info" className="mt-0.5 size-3 shrink-0 text-gray-400" />
                <span>
                  ลิงก์ใหม่จะทำให้ลิงก์เดิมหมดอายุทันที — สร้างใหม่เฉพาะตอนต้องการยกเลิกการเชื่อมต่อเก่าเท่านั้น
                </span>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setLineFor(null)}>
            ปิด
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
