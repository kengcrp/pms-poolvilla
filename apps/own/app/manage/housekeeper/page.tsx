'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Icon, Modal, ModalBody, ModalFooter } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'

type ActionTarget = { propertyId: string; propertyName: string } | null

export default function HousekeeperPage() {
  const { data: summary, isPending } = trpc.housekeeping.summary.useQuery()
  const [lineFor, setLineFor] = useState<ActionTarget>(null)

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

      {/* LINE connect modal — placeholder for the roadmap feature */}
      <Modal
        open={!!lineFor}
        onClose={() => setLineFor(null)}
        title="เชื่อมต่อ Line House Keeper"
        description={lineFor?.propertyName}
        size="sm"
      >
        <ModalBody>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Icon name="line" className="size-4" /> ฟีเจอร์อยู่ใน roadmap
            </div>
            <p className="text-xs leading-relaxed">
              เมื่อเปิดใช้งานแล้ว ระบบจะส่งงานทำความสะอาดของที่พักนี้ไปยัง LINE OA ของแม่บ้านอัตโนมัติ
              พร้อมรับสถานะกลับเมื่องานเสร็จสิ้น
            </p>
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
