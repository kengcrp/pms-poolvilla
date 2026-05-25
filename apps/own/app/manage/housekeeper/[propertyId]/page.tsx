'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import {
  Badge,
  Button,
  Card,
  Icon,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  Textarea,
  cn,
} from '@pms/ui'
import { ymdLocal } from '@/lib/date'

type Tab = 'penalty' | 'tasks'

export default function HousekeeperDetailPage() {
  const params = useParams<{ propertyId: string }>()
  const propertyId = params.propertyId
  const utils = trpc.useUtils()
  const [tab, setTab] = useState<Tab>('penalty')

  // ── Penalty items ───────────────────────────────────────────
  const { data: penaltyData, isPending: penaltyLoading } =
    trpc.penaltyItem.listByProperty.useQuery(
      { propertyId },
      { enabled: !!propertyId },
    )
  const items = penaltyData?.items ?? []
  const property = penaltyData?.property
  const propertyName = property
    ? ((property.name as { th?: string })?.th ?? property.code)
    : ''

  // ── Penalty item modals ─────────────────────────────────────
  // Two distinct modals:
  //  - create: multi-row batch add (matches the "add_penalty_item" UX from the design)
  //  - edit:   single-row update on an existing item
  type DraftRow = { id: number; name: string; feePerPiece: number; nameError?: boolean }
  const [editModal, setEditModal] = useState<
    | { id: string; name: string; feePerPiece: number }
    | null
  >(null)
  const [editForm, setEditForm] = useState({ name: '', feePerPiece: 0 })

  const [createOpen, setCreateOpen] = useState(false)
  const [createRows, setCreateRows] = useState<DraftRow[]>([])
  const [createError, setCreateError] = useState<string | null>(null)

  function openCreate() {
    // Always start with one empty row so the modal isn't blank
    setCreateRows([{ id: Date.now(), name: '', feePerPiece: 0 }])
    setCreateError(null)
    setCreateOpen(true)
  }
  function addRow() {
    setCreateRows((rows) => [...rows, { id: Date.now() + rows.length, name: '', feePerPiece: 0 }])
  }
  function updateRow(id: number, patch: Partial<DraftRow>) {
    setCreateRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch, nameError: false } : r)))
  }
  function removeRow(id: number) {
    setCreateRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)))
  }

  function openEdit(it: (typeof items)[number]) {
    setEditModal({ id: it.id, name: it.name, feePerPiece: it.feePerPiece })
    setEditForm({ name: it.name, feePerPiece: it.feePerPiece })
  }

  const invalidatePenalty = () => utils.penaltyItem.listByProperty.invalidate({ propertyId })

  const createMany = trpc.penaltyItem.createMany.useMutation({
    onSuccess: () => {
      invalidatePenalty()
      setCreateOpen(false)
    },
    onError: (e) => setCreateError(e.message),
  })
  const updateItem = trpc.penaltyItem.update.useMutation({
    onSuccess: () => {
      invalidatePenalty()
      setEditModal(null)
    },
  })
  const deleteItem = trpc.penaltyItem.delete.useMutation({ onSuccess: invalidatePenalty })

  function submitCreate() {
    setCreateError(null)
    // Drop rows with empty name (treated as blanks the user didn't fill)
    const valid = createRows.filter((r) => r.name.trim().length > 0)
    if (valid.length === 0) {
      // Mark first row as error so user sees what to fix
      setCreateRows((rows) => rows.map((r, i) => (i === 0 ? { ...r, nameError: true } : r)))
      setCreateError('กรุณากรอกชื่อรายการอย่างน้อย 1 รายการ')
      return
    }
    createMany.mutate({
      propertyId,
      items: valid.map((r) => ({ name: r.name.trim(), feePerPiece: r.feePerPiece || 0 })),
    })
  }

  function submitEdit() {
    if (!editModal) return
    if (!editForm.name.trim()) return
    updateItem.mutate({
      id: editModal.id,
      name: editForm.name.trim(),
      feePerPiece: editForm.feePerPiece,
    })
  }

  // ── Housekeeping tasks ──────────────────────────────────────
  const { data: tasks } = trpc.housekeeping.tasksByProperty.useQuery(
    { propertyId },
    { enabled: !!propertyId && tab === 'tasks' },
  )
  const invalidateTasks = () => utils.housekeeping.tasksByProperty.invalidate({ propertyId })

  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [taskForm, setTaskForm] = useState({
    date: ymdLocal(new Date()),
    note: '',
    lineUserId: '',
  })
  const createTask = trpc.housekeeping.create.useMutation({
    onSuccess: () => {
      invalidateTasks()
      setNewTaskOpen(false)
    },
  })
  const setTaskStatus = trpc.housekeeping.setStatus.useMutation({ onSuccess: invalidateTasks })
  const deleteTask = trpc.housekeeping.delete.useMutation({ onSuccess: invalidateTasks })

  function openNewTask() {
    setTaskForm({ date: ymdLocal(new Date()), note: '', lineUserId: '' })
    setNewTaskOpen(true)
  }
  function submitNewTask() {
    createTask.mutate({
      propertyId,
      date: taskForm.date,
      note: taskForm.note || undefined,
      lineUserId: taskForm.lineUserId || undefined,
    })
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/manage/housekeeper"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <Icon name="chevronLeft" className="size-3.5" />
          กลับ
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl bg-gray-100 p-1 max-w-md">
        <button
          type="button"
          onClick={() => setTab('penalty')}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
            tab === 'penalty'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900',
          )}
        >
          รายการค่าปรับ
        </button>
        <button
          type="button"
          onClick={() => setTab('tasks')}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
            tab === 'tasks'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900',
          )}
        >
          House Keeper
        </button>
      </div>

      {tab === 'penalty' && (
        <Card className="overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 p-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                ชื่อที่พัก: {propertyName || '—'}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                จำนวนรายการทั้งหมด {items.length} รายการ
              </p>
            </div>
            <Button onClick={openCreate}>
              <Icon name="plus" className="size-3.5" /> เพิ่มรายการ
            </Button>
          </div>

          {/* Penalty items table */}
          {penaltyLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">กำลังโหลด...</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center p-12 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-400">
                <Icon name="list" />
              </div>
              <p className="text-sm text-gray-500">ยังไม่มีรายการค่าปรับ</p>
              <Button className="mt-4" onClick={openCreate}>
                <Icon name="plus" className="size-3.5" /> เพิ่มรายการแรก
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="w-20 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      ลำดับ
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      ชื่อรายการ
                    </th>
                    <th className="w-56 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      ค่าบริการ / ชิ้น (฿)
                    </th>
                    <th className="w-32 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr
                      key={it.id}
                      className="border-b border-gray-100 transition-colors hover:bg-gray-50/50 last:border-b-0"
                    >
                      <td className="px-4 py-3 text-center text-sm tabular-nums text-gray-500">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{it.name}</td>
                      <td className="px-4 py-3 text-center text-sm font-semibold tabular-nums text-gray-900">
                        {it.feePerPiece.toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(it)}
                            className="flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-700"
                            title="แก้ไข"
                          >
                            <Icon name="edit" className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`ลบรายการ "${it.name}"?`)) deleteItem.mutate({ id: it.id })
                            }}
                            className="flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="ลบ"
                          >
                            <Icon name="trash" className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'tasks' && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 p-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                งาน House Keeper: {propertyName || '—'}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                จำนวนงานทั้งหมด {tasks?.length ?? 0} งาน
              </p>
            </div>
            <Button onClick={openNewTask}>
              <Icon name="plus" className="size-3.5" /> เพิ่มงานใหม่
            </Button>
          </div>

          {!tasks || tasks.length === 0 ? (
            <div className="flex flex-col items-center p-12 text-center">
              <Icon name="broom" className="mb-3 text-4xl text-gray-300" />
              <p className="text-sm text-gray-500">ยังไม่มีงาน</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
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
                        onClick={() => setTaskStatus.mutate({ id: t.id, status: 'DONE' })}
                      >
                        <Icon name="check" className="size-3" /> เสร็จ
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTaskStatus.mutate({ id: t.id, status: 'PENDING' })}
                      >
                        <Icon name="refresh" className="size-3" /> คืนค่า
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('ลบงานนี้?')) deleteTask.mutate({ id: t.id })
                      }}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Icon name="trash" className="size-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Penalty item — CREATE (multi-row batch add)
          Each row = one penalty item. User can add as many as needed and submit at once.
          Empty-name rows are dropped on submit so the user can leave extra blank rows. */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="เพิ่มรายการค่าปรับ"
        description={propertyName}
        size="md"
      >
        <ModalBody>
          <div className="space-y-5">
            {createRows.map((row, idx) => (
              <div key={row.id} className="rounded-xl border border-gray-200 bg-gray-50/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-900">รายการที่ {idx + 1}</div>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={createRows.length <= 1}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-lg transition-colors',
                      createRows.length <= 1
                        ? 'cursor-not-allowed text-gray-300'
                        : 'text-gray-400 hover:bg-red-50 hover:text-red-600',
                    )}
                    title={createRows.length <= 1 ? 'ต้องมีอย่างน้อย 1 รายการ' : 'ลบรายการนี้'}
                  >
                    <Icon name="trash" className="size-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label required>ชื่อรายการ</Label>
                    <Input
                      value={row.name}
                      onChange={(e) => updateRow(row.id, { name: e.target.value })}
                      placeholder="เช่น หลอดไฟ, รีโมท, ผ้าเช็ดตัว"
                      className={cn(row.nameError && 'border-red-400 focus:border-red-500 focus:ring-red-200')}
                    />
                  </div>
                  <div>
                    <Label>ค่าบริการต่อชิ้น (฿)</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={row.feePerPiece}
                      onChange={(e) =>
                        updateRow(row.id, { feePerPiece: Number(e.target.value || 0) })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              <Icon name="plus" className="size-3.5" />
              เพิ่มรายการ
            </button>

            {createError && (
              <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {createError}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            ปิด
          </Button>
          <Button onClick={submitCreate} disabled={createMany.isPending}>
            {createMany.isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Penalty item — EDIT (single row) */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title="แก้ไขรายการค่าปรับ"
        description={propertyName}
        size="sm"
      >
        <ModalBody>
          <div className="space-y-4">
            <div>
              <Label required>ชื่อรายการ</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="เช่น หลอดไฟ, รีโมท, ผ้าเช็ดตัว"
              />
            </div>
            <div>
              <Label>ค่าบริการต่อชิ้น (฿)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={editForm.feePerPiece}
                onChange={(e) => setEditForm({ ...editForm, feePerPiece: Number(e.target.value || 0) })}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setEditModal(null)}>
            ยกเลิก
          </Button>
          <Button onClick={submitEdit} disabled={updateItem.isPending}>
            {updateItem.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* New task modal */}
      <Modal
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        title="สร้างงานทำความสะอาด"
        description={propertyName}
        size="sm"
      >
        <ModalBody>
          <div className="space-y-4">
            <div>
              <Label required>วันที่ทำงาน</Label>
              <Input
                type="date"
                value={taskForm.date}
                onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
              />
            </div>
            <div>
              <Label>หมายเหตุ</Label>
              <Textarea
                rows={2}
                value={taskForm.note}
                onChange={(e) => setTaskForm({ ...taskForm, note: e.target.value })}
                placeholder="เช่น เปลี่ยนผ้าปูที่นอน, ทำความสะอาดสระ"
              />
            </div>
            <div>
              <Label>LINE User ID (ถ้ามี)</Label>
              <Input
                value={taskForm.lineUserId}
                onChange={(e) => setTaskForm({ ...taskForm, lineUserId: e.target.value })}
                placeholder="U1234abc..."
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setNewTaskOpen(false)}>
            ยกเลิก
          </Button>
          <Button onClick={submitNewTask} disabled={createTask.isPending}>
            {createTask.isPending ? 'กำลังสร้าง...' : 'สร้างงาน'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
