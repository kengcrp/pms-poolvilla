'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button, Card, Icon, Input, cn } from '@pms/ui'
import { MiniCalendar } from '@/components/MiniCalendar'
import { StatusLegend } from '@/components/StatusLegend'
import { SplitRoomBadge } from '@/components/SplitRoomBadge'
import { SplitCalendarPanel } from '@/components/SplitCalendarPanel'

type Mode = 'sell' | 'wholesale' | 'hide'

const MODE_META: Record<Mode, { title: string; query: string }> = {
  sell:      { title: 'ปฏิทินราคาขายทั้งหมด',    query: '?price=sell' },
  wholesale: { title: 'ปฏิทินราคาส่งทั้งหมด',    query: '?price=wholesale' },
  hide:      { title: 'ปฏิทินไม่แสดงราคาทั้งหมด', query: '?price=hide' },
}

/**
 * "ปฏิทินราคาขายทั้งหมด" — share-friendly grid view of every property's mini-calendar
 * (no sidebar, clean layout). Opened from the share-link toolbar on the listings page
 * via window.open in a new tab. Includes search + "copy all-link" + booking modal.
 */
export default function ListingsCalendarPage() {
  const params = useParams<{ mode: string }>()
  const mode = (params.mode as Mode) in MODE_META ? (params.mode as Mode) : 'sell'
  const meta = MODE_META[mode]

  const { data, isPending } = trpc.property.list.useQuery()
  const properties = data?.properties ?? []
  const slug = data?.ownerSaleSlug

  const [search, setSearch] = useState('')
  // Split panel — opens when user clicks the "แบ่งห้อง N ›" pill (view-only mode)
  const [splitPanel, setSplitPanel] = useState<{ propertyId: string } | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return properties
    return properties.filter((p) => {
      const name = ((p.name as { th?: string })?.th ?? '').toLowerCase()
      return name.includes(q) || p.code.toLowerCase().includes(q)
    })
  }, [properties, search])

  const fmtUpdated = useMemo(() => {
    const d = new Date()
    return `${d.getHours().toString().padStart(2, '0')}.${d.getMinutes().toString().padStart(2, '0')} น.`
  }, [])

  return (
    <div className="mx-auto max-w-[110rem]">
      {/* Header — title only */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{meta.title}</h1>
      </div>

      {/* Search + legend */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 max-w-md items-center gap-2">
          <div className="relative flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อที่พัก"
              className="pl-9"
            />
          </div>
          <Button onClick={() => { /* search runs inline via useMemo */ }}>ค้นหา</Button>
        </div>
        <StatusLegend />
      </div>

      {isPending && <div className="text-sm text-gray-500">กำลังโหลด...</div>}

      {!isPending && filtered.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-400">
            <Icon name="calendar" />
          </div>
          <p className="text-sm text-gray-500">
            {search ? 'ไม่พบที่พักตามชื่อที่ค้นหา' : 'ยังไม่มีที่พัก'}
          </p>
        </Card>
      )}

      {/* Property card grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => {
          const name = (p.name as { th?: string })?.th ?? p.code
          const cover = p.images[0]?.url
          const defaultVariant = p.variants.find((v) => v.isDefault)
          if (!defaultVariant) return null
          // All split variants fully Locked → badge becomes view-only with lock icon
          const splitVariants = p.variants.filter((v) => !v.isDefault)
          const splitLocked =
            splitVariants.length > 0 &&
            splitVariants.every((v) => {
              const w = v.weeklyPricing ?? []
              return w.length > 0 && w.every((row) => row.splitOpen === false)
            })
          return (
            <div key={p.id} className="flex h-full flex-col">
              {/* Badge row — always rendered to keep card tops aligned across the grid.
                  When the property has no split variants, an invisible badge clone reserves
                  identical vertical space so neighboring cards don't shift up. */}
              <div className="flex justify-end">
                {p.variants.length > 1 ? (
                  <SplitRoomBadge
                    count={p.variants.length}
                    locked={splitLocked}
                    onClick={
                      splitLocked ? undefined : () => setSplitPanel({ propertyId: p.id })
                    }
                  />
                ) : (
                  <div className="invisible" aria-hidden>
                    <SplitRoomBadge count={1} />
                  </div>
                )}
              </div>
              <Card hover className="flex h-full flex-col">
                {/* Compact landscape cover (aspect 16/7) + tighter padding so the card stays
                    short — same dimensions as calendar/pricing Layout 1. Name overlays the
                    bottom-left as a frosted dark chip. */}
                <div className="p-2">
                  <div className="relative aspect-[16/7] overflow-hidden rounded-lg bg-gradient-to-br from-brand-100 to-brand-300">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={name} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-white/60">
                        <Icon name="home" className="size-9" />
                      </div>
                    )}
                    {/* Name overlay — frosted dark chip */}
                    <div className="pointer-events-none absolute bottom-2 left-2 right-2">
                      <h3 className="inline-block max-w-full truncate rounded-md bg-black/65 px-2.5 py-1 text-sm font-semibold leading-tight text-white shadow-md ring-1 ring-inset ring-white/10 backdrop-blur-md">
                        {name}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 px-3 pb-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-800">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="bed" className="size-3 text-gray-600" />
                        <span className="font-semibold text-gray-900">{defaultVariant.bedrooms}</span> นอน
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Icon name="users" className="size-3 text-gray-600" />
                        <span className="font-semibold text-gray-900">{defaultVariant.maxGuests}</span> ท่าน
                      </span>
                    </div>
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-[10.5px] font-semibold text-white shadow-sm shadow-brand-600/20 transition-colors hover:bg-brand-700"
                      title={`รีเฟรชปฏิทิน — อัปเดตล่าสุด ${fmtUpdated}`}
                    >
                      <Icon name="refresh" className="size-2.5" />
                      {fmtUpdated}
                    </button>
                  </div>

                  {/* View-only + privacy — no PII in share view.
                      Mode-specific pricing:
                       - sell      → show regular ราคาขาย
                       - wholesale → show ราคาส่ง Agent (initialPriceMode='agent')
                       - hide      → no prices at all (hidePrices=true) */}
                  <MiniCalendar
                    variantId={defaultVariant.id}
                    showPriceModeToggle={false}
                    bookingWindowMonths={p.bookingWindowMonths}
                    hideCustomerName
                    hidePrices={mode === 'hide'}
                    initialPriceMode={mode === 'wholesale' ? 'agent' : 'sell'}
                    partnerListing={p.partnerListing}
                    dense
                  />
                </div>
              </Card>
            </div>
          )
        })}
      </div>

      {/* Read-only split panel — slides in from right, shows variant calendars (no cell clicks).
          Same mode-aware pricing rules as the main grid. */}
      <SplitCalendarPanel
        open={!!splitPanel}
        onClose={() => setSplitPanel(null)}
        propertyId={splitPanel?.propertyId ?? null}
        readOnly
        hidePrices={mode === 'hide'}
        initialPriceMode={mode === 'wholesale' ? 'agent' : 'sell'}
      />

      {/* Suppress unused-warning */}
      <span className="hidden">{slug ?? ''}</span>
    </div>
  )
}

// Lightweight cn import shim (unused but kept for parity)
void cn
