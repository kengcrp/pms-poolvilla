'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge, Icon, Select } from '@pms/ui'

const RANGES = [
  { value: 7, label: '7 วันล่าสุด' },
  { value: 30, label: '30 วันล่าสุด' },
  { value: 90, label: '90 วันล่าสุด' },
  { value: 365, label: '1 ปีล่าสุด' },
]

export function MarketplaceReport() {
  const [days, setDays] = useState(30)
  const { data, isPending } = trpc.admin.report.marketplaceSummary.useQuery({ days })

  if (isPending) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        กำลังโหลด...
      </div>
    )
  }
  if (!data) return null

  const { total, bySource, recent } = data
  const marketplacePct = total > 0 ? ((bySource.marketplace / total) * 100).toFixed(1) : '0'
  const directPct = total > 0 ? ((bySource.ownerDirect / total) * 100).toFixed(1) : '0'
  const icalPct = total > 0 ? ((bySource.ical / total) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Select className="w-44" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
        <div className="text-sm text-gray-500">
          การจองทั้งหมด: <span className="font-semibold text-gray-900">{total}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon="globe"
          label="จากหน้า Marketplace"
          value={bySource.marketplace}
          pct={marketplacePct}
          tone="brand"
        />
        <Stat
          icon="user"
          label="จองตรงกับเจ้าของ"
          value={bySource.ownerDirect}
          pct={directPct}
          tone="success"
        />
        <Stat
          icon="link"
          label="จาก iCal/OTA"
          value={bySource.ical}
          pct={icalPct}
          tone="warning"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
          <div className="text-sm font-semibold text-gray-900">
            การจองล่าสุดผ่าน Marketplace
          </div>
        </div>
        <ul className="divide-y divide-gray-100">
          {recent.map((b) => {
            const name = (b.property.name as { th?: string })?.th ?? b.property.code
            return (
              <li
                key={b.id}
                className="grid grid-cols-1 gap-1.5 px-5 py-3 sm:grid-cols-12 sm:items-center sm:gap-3"
              >
                <div className="sm:col-span-5">
                  <div className="font-medium text-gray-900">{name}</div>
                  <div className="text-[11px] text-gray-500">
                    #{b.id.slice(-8)} · {b.customerName}
                  </div>
                </div>
                <div className="text-xs text-gray-600 sm:col-span-3">
                  {new Date(b.checkin).toLocaleDateString('th-TH')} →{' '}
                  {new Date(b.checkout).toLocaleDateString('th-TH')}
                </div>
                <div className="text-sm font-semibold text-gray-900 sm:col-span-2 sm:text-right">
                  ฿{b.total.toNumber().toLocaleString('th-TH')}
                </div>
                <div className="sm:col-span-2 sm:text-right">
                  <Badge
                    variant={
                      b.status === 'CONFIRMED'
                        ? 'success'
                        : b.status === 'PENDING_PAYMENT'
                          ? 'pending'
                          : 'default'
                    }
                    dot
                  >
                    {b.status}
                  </Badge>
                </div>
              </li>
            )
          })}
          {recent.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-gray-500">
              ยังไม่มีการจองผ่าน Marketplace ในช่วงนี้
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  pct,
  tone,
}: {
  icon: 'globe' | 'user' | 'link'
  label: string
  value: number
  pct: string
  tone: 'brand' | 'success' | 'warning'
}) {
  const toneMap = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
  } as const
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${toneMap[tone]}`}>
          <Icon name={icon} className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-gray-500">{label}</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900">{value}</span>
            <span className="text-xs text-gray-400">{pct}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
