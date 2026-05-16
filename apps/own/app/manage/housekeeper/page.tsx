'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Icon, Input, Label, Modal, ModalBody, ModalFooter, Textarea } from '@pms/ui'
import { PageHeader } from '@/components/PageHeader'
import { ymdLocal } from '@/lib/date'

export default function HousekeeperPage() {
  const utils = trpc.useUtils()
  const { data: summary, isPending } = trpc.housekeeping.summary.useQuery()
  const [expandId, setExpandId] = useState<string | null>(null)
  const [newTaskFor, setNewTaskFor] = useState<{ propertyId: string; propertyName: string } | null>(null)
  const [form, setForm] = useState({ date: ymdLocal(new Date()), note: '', lineUserId: '' })

  const { data: tasks } = trpc.housekeeping.tasksByProperty.useQuery(
    { propertyId: expandId ?? '' },
    { enabled: !!expandId },
  )

  const create = trpc.housekeeping.create.useMutation({
    onSuccess: () => {
      utils.housekeeping.summary.invalidate()
      utils.housekeeping.tasksByProperty.invalidate()
      setNewTaskFor(null)
    },
  })
  const setStatus = trpc.housekeeping.setStatus.useMutation({
    onSuccess: () => {
      utils.housekeeping.summary.invalidate()
      utils.housekeeping.tasksByProperty.invalidate()
    },
  })
  const remove = trpc.housekeeping.delete.useMutation({
    onSuccess: () => {
      utils.housekeeping.summary.invalidate()
      utils.housekeeping.tasksByProperty.invalidate()
    },
  })

  function openNewTask(p: { id: string; name: unknown; code: string }) {
    const name = (p.name as { th?: string })?.th ?? p.code
    setNewTaskFor({ propertyId: p.id, propertyName: name })
    setForm({ date: ymdLocal(new Date()), note: '', lineUserId: '' })
  }

  function submitTask() {
    if (!newTaskFor) return
    create.mutate({
      propertyId: newTaskFor.propertyId,
      date: form.date,
      note: form.note || undefined,
      lineUserId: form.lineUserId || undefined,
    })
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="House Keeper"
        description="จัดการงานทำความสะอาดของแต่ละที่พัก"
      />

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
        💡 ใน MVP — สร้างงานด้วยตัวเอง · LINE bot integration จะเพิ่มใน phase ถัดไป
      </div>

      {isPending && <div className="text-sm text-gray-500">กำลังโหลด...</div>}

      {!isPending && summary && summary.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <Icon name="broom" className="mb-3 text-4xl text-gray-300" />
          <p className="text-sm text-gray-500">ยังไม่มีที่พัก</p>
        </Card>
      )}

      <div className="space-y-3">
        {summary?.map((p) => {
          const name = (p.name as { th?: string })?.th ?? p.code
          const isOpen = expandId === p.id
          return (
            <Card key={p.id} className="overflow-hidden">
              <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                  <Icon name="broom" className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900">{name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10.5px]">{p.code}</code>
                    {p.pendingCount > 0 && (
                      <Badge variant="warning">รอ {p.pendingCount}</Badge>
                    )}
                    <span>ทั้งหมด {p.taskCount} งาน</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="success" disabled title="LINE integration อยู่ใน roadmap">
                    🔗 LINE
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openNewTask(p)}>
                    + งานใหม่
                  </Button>
                  <Button
                    size="sm"
                    variant={isOpen ? 'primary' : 'secondary'}
                    onClick={() => setExpandId(isOpen ? null : p.id)}
                  >
                    {isOpen ? 'ซ่อน' : 'ดูงาน'}
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                  {!tasks || tasks.length === 0 ? (
                    <p className="text-center text-xs text-gray-500">ยังไม่มีงาน</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {tasks.map((t) => (
                        <li key={t.id} className="flex items-center gap-3 py-2.5">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {t.status === 'DONE' ? (
                                <Badge variant="success" dot>เสร็จ</Badge>
                              ) : (
                                <Badge variant="warning" dot>รอ</Badge>
                              )}
                              <span className="text-sm font-medium text-gray-900">
                                {ymdLocal(t.date)}
                              </span>
                            </div>
                            {t.note && <div className="mt-0.5 text-xs text-gray-600">{t.note}</div>}
                            {t.lineUserId && (
                              <div className="mt-0.5 text-[10.5px] text-gray-400">
                                LINE: {t.lineUserId}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            {t.status === 'PENDING' ? (
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => setStatus.mutate({ id: t.id, status: 'DONE' })}
                              >
                                ✓ เสร็จ
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setStatus.mutate({ id: t.id, status: 'PENDING' })}
                              >
                                ↻ คืนค่า
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm('ลบงานนี้?')) remove.mutate({ id: t.id })
                              }}
                              className="text-red-600 hover:bg-red-50"
                            >
                              ลบ
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Create task modal */}
      <Modal
        open={!!newTaskFor}
        onClose={() => setNewTaskFor(null)}
        title="สร้างงานทำความสะอาด"
        description={newTaskFor?.propertyName}
        size="sm"
      >
        <ModalBody>
          <div className="space-y-4">
            <div>
              <Label required>วันที่ทำงาน</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label>หมายเหตุ</Label>
              <Textarea
                rows={2}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="เช่น เปลี่ยนผ้าปูที่นอน, ทำความสะอาดสระ"
              />
            </div>
            <div>
              <Label>LINE User ID (ถ้ามี)</Label>
              <Input
                value={form.lineUserId}
                onChange={(e) => setForm({ ...form, lineUserId: e.target.value })}
                placeholder="U1234abc..."
              />
              <p className="mt-1 text-xs text-gray-500">ผูก task กับ user ใน LINE OA สำหรับแจ้งเตือน (อนาคต)</p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setNewTaskFor(null)}>
            ยกเลิก
          </Button>
          <Button onClick={submitTask} disabled={create.isPending}>
            {create.isPending ? 'กำลังสร้าง...' : 'สร้างงาน'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
