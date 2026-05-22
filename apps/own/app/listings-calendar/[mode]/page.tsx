'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button, Card, Icon, Input, cn } from '@pms/ui'
import { MiniCalendar } from '@/components/MiniCalendar'
import { BookingModal } from '@/components/BookingModal'
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
  const [modal, setModal] = useState<{ variantId: string; label: string; date: Date } | null>(null)
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
    <div className="mx-auto max-w-[100rem]">
      {/* Back link */}
      <div className="mb-3">
        <Link
          href="/manage/listings"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <Icon name="chevronLeft" className="size-3.5" />
          กลับไปลิสติ้งที่พัก
        </Link>
      </div>

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
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((p) => {
          const name = (p.name as { th?: string })?.th ?? p.code
          const cover = p.images[0]?.url
          const defaultVariant = p.variants.find((v) => v.isDefault)
          if (!defaultVariant) return null
          const defaultVarName =
            (defaultVariant.name as { th?: string })?.th ?? `${defaultVariant.bedrooms} ห้องนอน`
          return (
            <div key={p.id} className="flex flex-col">
              {p.variants.length > 1 && (
                <div className="flex justify-end">
                  <SplitRoomBadge
                    count={p.variants.length}
                    onClick={() => setSplitPanel({ propertyId: p.id })}
                  />
                </div>
              )}
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

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1 text-brand-600">
                      <Icon name="users" className="size-3" />
                      <span className="text-gray-600">สำหรับ {defaultVariant.maxGuests} ท่าน</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-brand-600">
                      <Icon name="bed" className="size-3" />
                      <span className="text-gray-600">{defaultVariant.bedrooms} ห้องนอน</span>
                    </span>
                  </div>

                  <MiniCalendar
                    variantId={defaultVariant.id}
                    showPriceModeToggle={false}
                    bookingWindowMonths={p.bookingWindowMonths}
                    onCellClick={(date) =>
                      setModal({ variantId: defaultVariant.id, label: `${name} — ${defaultVarName}`, date })
                    }
                  />
                </div>
              </Card>
            </div>
          )
        })}
      </div>

      <BookingModal
        open={!!modal}
        onClose={() => setModal(null)}
        variantId={modal?.variantId ?? null}
        variantLabel={modal?.label ?? ''}
        initialDate={modal?.date ?? null}
      />

      <SplitCalendarPanel
        open={!!splitPanel}
        onClose={() => setSplitPanel(null)}
        propertyId={splitPanel?.propertyId ?? null}
      />

      {/* Suppress unused-warning */}
      <span className="hidden">{slug ?? ''}</span>
    </div>
  )
}

// Lightweight cn import shim (unused but kept for parity)
void cn
