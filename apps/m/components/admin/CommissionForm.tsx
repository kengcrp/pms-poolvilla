'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button, Icon, Input, Label } from '@pms/ui'

export function CommissionForm() {
  const utils = trpc.useUtils()
  const { data, isPending } = trpc.admin.settings.get.useQuery()
  const [val, setVal] = useState<number>(10)

  useEffect(() => {
    if (data) setVal(Number(data.defaultCommissionPercent))
  }, [data])

  const save = trpc.admin.settings.updateCommission.useMutation({
    onSuccess: () => {
      utils.admin.settings.get.invalidate()
      alert('บันทึกค่าคอมมิชชันเรียบร้อย ✓')
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
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate({ defaultCommissionPercent: val })
      }}
      className="max-w-xl space-y-6 rounded-2xl border border-gray-200 bg-white p-6"
    >
      <div>
        <Label required htmlFor="commission">
          ค่าคอมมิชชันเริ่มต้น (%)
        </Label>
        <div className="relative">
          <Input
            id="commission"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={val}
            onChange={(e) => setVal(Number(e.target.value))}
            className="pr-10"
            required
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            %
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          ค่าเริ่มต้นที่บริษัทเก็บจากเจ้าของในทุกการจองที่เข้าผ่าน Marketplace
          (สามารถ override รายเจ้าของได้ในเฟสถัดไป)
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-xl bg-gray-50 p-4 text-center">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gray-500">ยอด ฿1,000</div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            ฿{((1000 * val) / 100).toLocaleString('th-TH')}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gray-500">ยอด ฿5,000</div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            ฿{((5000 * val) / 100).toLocaleString('th-TH')}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gray-500">ยอด ฿10,000</div>
          <div className="mt-1 text-base font-semibold text-gray-900">
            ฿{((10000 * val) / 100).toLocaleString('th-TH')}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Icon name="spinner" spin className="size-4" />}
          บันทึก
        </Button>
      </div>
    </form>
  )
}
