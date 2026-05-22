'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Icon } from '@pms/ui'

interface Flags {
  allowOwnerSelfPublish: boolean
  enableMarketplace: boolean
  enableAutoCancel: boolean
  enableHousekeeping: boolean
}

const FLAG_META: { key: keyof Flags; title: string; desc: string }[] = [
  {
    key: 'allowOwnerSelfPublish',
    title: 'อนุญาตให้เจ้าของเปิดขายเองโดยไม่ต้องตรวจสอบ',
    desc: 'เมื่อเปิด: ที่พักที่สร้างใหม่จะ ACTIVE ทันที (ปัจจุบันเปิดอยู่สำหรับ MVP)',
  },
  {
    key: 'enableMarketplace',
    title: 'เปิดหน้า Marketplace กลาง',
    desc: 'แสดงหน้า /explore สำหรับลูกค้าเสิร์ชที่พักทั้งระบบ',
  },
  {
    key: 'enableAutoCancel',
    title: 'ยกเลิกการจองอัตโนมัติ (overdue)',
    desc: 'cron จะยกเลิก booking ที่เลย paymentDueAt และยังไม่ชำระ',
  },
  {
    key: 'enableHousekeeping',
    title: 'เปิดระบบ Housekeeping (LINE bot)',
    desc: 'แจ้งงานทำความสะอาดผ่าน LINE OA (ต้องตั้งค่า LINE channel ก่อน)',
  },
]

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
        checked ? 'bg-brand-600' : 'bg-gray-200'
      }`}
      aria-pressed={checked}
    >
      <span
        className={`pointer-events-none mt-0.5 inline-block size-5 transform rounded-full bg-white shadow ring-0 transition ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export function FeatureFlagsForm() {
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.admin.settings.get.useQuery()
  const [flags, setFlags] = useState<Flags>({
    allowOwnerSelfPublish: true,
    enableMarketplace: true,
    enableAutoCancel: true,
    enableHousekeeping: false,
  })

  useEffect(() => {
    if (data) {
      setFlags({
        allowOwnerSelfPublish: data.allowOwnerSelfPublish,
        enableMarketplace: data.enableMarketplace,
        enableAutoCancel: data.enableAutoCancel,
        enableHousekeeping: data.enableHousekeeping,
      })
    }
  }, [data])

  const save = trpc.admin.settings.updateFlags.useMutation({
    onSuccess: () => {
      utils.admin.settings.get.invalidate()
      alert('บันทึก feature flags เรียบร้อย ✓')
    },
    onError: (e) => alert(e.message),
  })

  if (isPending) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
        กำลังโหลด...
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-3">
      {FLAG_META.map((meta) => (
        <div
          key={meta.key}
          className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900">{meta.title}</div>
            <p className="mt-0.5 text-sm text-gray-500">{meta.desc}</p>
          </div>
          <Toggle
            checked={flags[meta.key]}
            onChange={(v) => setFlags({ ...flags, [meta.key]: v })}
          />
        </div>
      ))}

      <div className="flex justify-end pt-3">
        <Button type="button" onClick={() => save.mutate(flags)} disabled={save.isPending}>
          {save.isPending && <Icon name="spinner" spin className="size-4" />}
          บันทึก
        </Button>
      </div>
    </div>
  )
}
