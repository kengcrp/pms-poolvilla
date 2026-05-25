'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Card, Icon } from '@pms/ui'
import { MiniCalendar } from '@/components/MiniCalendar'
import { StatusLegend } from '@/components/StatusLegend'
import { SplitRoomBadge } from '@/components/SplitRoomBadge'
import { SplitCalendarPanel } from '@/components/SplitCalendarPanel'

type Mode = 'sell' | 'wholesale' | 'hide'

const MODE_META: Record<Mode, { title: string }> = {
  sell:      { title: 'ปฏิทินราคาขาย' },
  wholesale: { title: 'ปฏิทินราคาส่ง Agent' },
  hide:      { title: 'ปฏิทินไม่แสดงราคา' },
}

/**
 * Single-property share view — opened from the per-property "ลิงก์แชร์ราคา" rows on the
 * listings page. Same card layout as `/listings-calendar/[mode]` but filtered to one
 * property only (via the `code` URL segment).
 *
 * Mode-specific behavior:
 *  - sell      → ราคาขาย, prices visible
 *  - wholesale → ราคาส่ง Agent, prices visible
 *  - hide      → no prices anywhere
 */
export default function SinglePropertyCalendarPage() {
  const params = useParams<{ mode: string; code: string }>()
  const mode = (params.mode as Mode) in MODE_META ? (params.mode as Mode) : 'sell'
  const meta = MODE_META[mode]

  const { data: property, isPending, error } = trpc.property.byCode.useQuery({ code: params.code })
  const [splitPanel, setSplitPanel] = useState(false)

  const fmtUpdated = useMemo(() => {
    const d = new Date()
    return `${d.getHours().toString().padStart(2, '0')}.${d.getMinutes().toString().padStart(2, '0')} น.`
  }, [])

  const name = property ? ((property.name as { th?: string })?.th ?? property.code) : ''
  const cover = property?.images[0]?.url
  const defaultVariant = property?.variants.find((v) => v.isDefault)
  // All split variants fully Locked → badge unclickable + lock icon
  const splitVariants = property?.variants.filter((v) => !v.isDefault) ?? []
  const splitLocked =
    splitVariants.length > 0 &&
    splitVariants.every((v) => {
      const w = v.weeklyPricing ?? []
      return w.length > 0 && w.every((row) => row.splitOpen === false)
    })

  return (
    // Centered single-card view — matches the visual size of one card in the all-properties
    // grid (`/listings-calendar/[mode]`) but sits in the middle of the frame instead of
    // anchoring left. max-w-lg (~512px) is close to the per-card width in the 3-col layout.
    <div className="mx-auto max-w-lg">
      {/* Header — compact, centered above the card */}
      <div className="mb-4 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {meta.title}
        </div>
        <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-gray-900">
          {isPending ? 'กำลังโหลด...' : (name || '—')}
        </h1>
        <div className="mt-3 flex justify-center">
          <StatusLegend />
        </div>
      </div>

      {error && (
        <Card className="flex flex-col items-center p-12 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-400">
            <Icon name="calendar" />
          </div>
          <p className="text-sm text-gray-600">ไม่พบที่พัก หรือคุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้</p>
        </Card>
      )}

      {property && defaultVariant && (
        <div className="flex flex-col">
          {/* Badge row — invisible placeholder when no split variants, keeps layout aligned */}
          <div className="flex justify-end">
            {property.variants.length > 1 ? (
              <SplitRoomBadge
                count={property.variants.length}
                locked={splitLocked}
                onClick={splitLocked ? undefined : () => setSplitPanel(true)}
              />
            ) : (
              <div className="invisible" aria-hidden>
                <SplitRoomBadge count={1} />
              </div>
            )}
          </div>

          <Card hover>
            <div className="p-3">
              <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-brand-300">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt={name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-white/60">
                    <Icon name="home" className="size-12" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 px-5 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="truncate text-base font-semibold text-gray-900">{name}</h3>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-brand-600/20 transition-colors hover:bg-brand-700"
                  title="รีเฟรชปฏิทิน"
                >
                  <Icon name="refresh" className="size-3" />
                  อัปเดตปฏิทิน {fmtUpdated}
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs font-medium text-gray-800">
                <span className="inline-flex items-center gap-1">
                  <Icon name="users" className="size-3 text-gray-600" />
                  <span>สำหรับ <span className="font-semibold text-gray-900">{defaultVariant.maxGuests}</span> ท่าน</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="bed" className="size-3 text-gray-600" />
                  <span><span className="font-semibold text-gray-900">{defaultVariant.bedrooms}</span> ห้องนอน</span>
                </span>
              </div>

              {/* View-only + privacy — no PII in share view.
                  Mode-aware pricing same as the all-properties view. */}
              <MiniCalendar
                variantId={defaultVariant.id}
                showPriceModeToggle={false}
                bookingWindowMonths={property.bookingWindowMonths}
                hideCustomerName
                hidePrices={mode === 'hide'}
                initialPriceMode={mode === 'wholesale' ? 'agent' : 'sell'}
                partnerListing={property.partnerListing}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Read-only split panel for this property — same mode-aware rules */}
      <SplitCalendarPanel
        open={splitPanel}
        onClose={() => setSplitPanel(false)}
        propertyId={splitPanel && property ? property.id : null}
        readOnly
        hidePrices={mode === 'hide'}
        initialPriceMode={mode === 'wholesale' ? 'agent' : 'sell'}
      />
    </div>
  )
}
