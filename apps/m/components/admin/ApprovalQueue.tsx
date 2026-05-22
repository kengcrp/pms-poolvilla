'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Icon } from '@pms/ui'

type StatusFilter = 'PENDING' | 'REJECTED' | 'ACTIVE' | 'INACTIVE'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'PENDING', label: 'รออนุมัติ' },
  { key: 'ACTIVE', label: 'อนุมัติแล้ว' },
  { key: 'REJECTED', label: 'ถูกปฏิเสธ' },
  { key: 'INACTIVE', label: 'ปิดอยู่' },
]

const statusBadge: Record<StatusFilter, { variant: 'pending' | 'success' | 'danger' | 'default'; label: string }> = {
  PENDING: { variant: 'pending', label: 'รออนุมัติ' },
  ACTIVE: { variant: 'success', label: 'อนุมัติแล้ว' },
  REJECTED: { variant: 'danger', label: 'ถูกปฏิเสธ' },
  INACTIVE: { variant: 'default', label: 'ปิด' },
}

export function ApprovalQueue() {
  const [tab, setTab] = useState<StatusFilter>('PENDING')
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.admin.property.listForReview.useQuery({ status: tab, limit: 50 })

  const refetch = () => utils.admin.property.listForReview.invalidate()

  const approve = trpc.admin.property.approve.useMutation({
    onSuccess: () => {
      refetch()
      alert('อนุมัติเรียบร้อย ✓')
    },
    onError: (e) => alert(e.message),
  })

  const reject = trpc.admin.property.reject.useMutation({
    onSuccess: () => {
      refetch()
      alert('ปฏิเสธเรียบร้อย')
    },
    onError: (e) => alert(e.message),
  })

  const setActive = trpc.admin.property.setActive.useMutation({
    onSuccess: refetch,
    onError: (e) => alert(e.message),
  })

  const items = data ?? []

  return (
    <div>
      <div className="mb-4 inline-flex rounded-xl bg-gray-100 p-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isPending && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          <Icon name="spinner" spin className="mr-2 size-4" />
          กำลังโหลด...
        </div>
      )}

      {!isPending && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
            <Icon name="check" className="size-5" />
          </div>
          <div className="text-sm text-gray-500">ไม่มีรายการในสถานะนี้</div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((p) => {
          const name = (p.name as { th?: string })?.th ?? p.code
          const status = p.reviewStatus as StatusFilter
          const badge = statusBadge[status] ?? statusBadge.INACTIVE
          return (
            <div
              key={p.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors hover:border-gray-300"
            >
              <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon name="home" className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-base font-semibold text-gray-900">{name}</span>
                    <Badge variant={badge.variant} dot>
                      {badge.label}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="font-mono">{p.code}</span>
                    <span>· {p.totalBedrooms} นอน · {p.totalBathrooms} น้ำ</span>
                    {p.location?.location && (
                      <span>· 📍 {p.location.location.name}{p.location.zone && ` / ${p.location.zone.name}`}</span>
                    )}
                    <span>· {p._count.variants} variant</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    เจ้าของ: <span className="text-gray-700">{p.owner.name}</span> · {p.owner.email}
                    {p.owner.phone && <> · {p.owner.phone}</>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {status === 'PENDING' && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={approve.isPending || reject.isPending}
                        onClick={() => {
                          if (confirm(`อนุมัติ "${name}" ?`)) approve.mutate({ id: p.id })
                        }}
                      >
                        <Icon name="check" className="size-3.5" />
                        อนุมัติ
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={approve.isPending || reject.isPending}
                        onClick={() => {
                          const reason = prompt('เหตุผลที่ปฏิเสธ (จะแจ้งเจ้าของ)')
                          if (reason !== null) reject.mutate({ id: p.id, reason })
                        }}
                      >
                        <Icon name="close" className="size-3.5" />
                        ปฏิเสธ
                      </Button>
                    </>
                  )}
                  {status === 'ACTIVE' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`ปิดการขาย "${name}" ?`))
                          setActive.mutate({ id: p.id, isActive: false })
                      }}
                    >
                      ปิดขาย
                    </Button>
                  )}
                  {status === 'INACTIVE' && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setActive.mutate({ id: p.id, isActive: true })}
                    >
                      เปิดขายอีกครั้ง
                    </Button>
                  )}
                  {status === 'REJECTED' && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => approve.mutate({ id: p.id })}
                    >
                      อนุมัติใหม่
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
