'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { Badge, Button, Card, Icon, cn } from '@pms/ui'

const reviewStatusLabel: Record<string, { label: string; variant: 'pending' | 'success' | 'danger' | 'default' }> = {
  PENDING: { label: 'รอการตรวจสอบ', variant: 'pending' },
  ACTIVE: { label: 'เปิดใช้งาน', variant: 'success' },
  INACTIVE: { label: 'ปิดใช้งาน', variant: 'default' },
  REJECTED: { label: 'ปฏิเสธ', variant: 'danger' },
}

const typeLabel: Record<string, string> = {
  POOL_VILLA: 'พูลวิลล่า',
  LOFT: 'ลอฟ',
  BNB: 'B&B',
}

export default function ListingsPage() {
  const { data, isPending, error } = trpc.property.list.useQuery()
  const properties = data?.properties ?? []
  const slug = data?.ownerSaleSlug

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">ลิสติ้งที่พัก</h1>
          <p className="mt-1 text-sm text-gray-600">
            {isPending ? 'กำลังโหลด...' : `ที่พักทั้งหมด ${properties.length} รายการ`}
          </p>
        </div>
        <Link href="/manage/listings/new">
          <Button>
            <Icon name="plus" className="size-3.5" />
            เพิ่มที่พัก
          </Button>
        </Link>
      </div>

      {/* Share link toolbar — copy URLs for different price modes */}
      <ShareLinkToolbar slug={slug} />

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          เกิดข้อผิดพลาด: {error.message}
        </div>
      )}

      {!isPending && properties.length === 0 && (
        <Card className="flex flex-col items-center p-12 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-400">
            <Icon name="home" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">ยังไม่มีที่พัก</h3>
          <p className="mt-1 text-sm text-gray-500">เริ่มต้นเพิ่มที่พักหลังแรกของคุณ</p>
          <Link href="/manage/listings/new" className="mt-5">
            <Button>
              <Icon name="plus" className="size-3.5" /> เพิ่มที่พักหลังแรก
            </Button>
          </Link>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {properties.map((p) => {
          const status = reviewStatusLabel[p.reviewStatus] ?? reviewStatusLabel.PENDING!
          return <PropertyCard key={p.id} p={p} slug={slug} status={status} />
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// Property card
// ──────────────────────────────────────────

interface PropertyCardProps {
  p: {
    id: string
    code: string
    name: unknown
    type: string
    totalBedrooms: number
    totalBathrooms: number
    isActive: boolean
    reviewStatus: string
    variants: { id: string; isDefault: boolean }[]
    images: { url: string }[]
    location: { location?: { name: string } | null; lat?: unknown; lng?: unknown } | null
  }
  slug: string | null | undefined
  status: { label: string; variant: 'pending' | 'success' | 'danger' | 'default' }
}

function PropertyCard({ p, slug, status }: PropertyCardProps) {
  const name = (p.name as { th?: string })?.th ?? p.code
  const cover = p.images[0]?.url
  const baseSale = slug ? `/sale/${slug}/${p.code}` : null
  const lat = p.location?.lat ? Number(p.location.lat) : null
  const lng = p.location?.lng ? Number(p.location.lng) : null
  const mapsUrl =
    lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : null

  return (
    <Card hover className="overflow-hidden">
      {/* ── Cover image — clean visual top ───────────────────────────── */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-200">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-5xl text-gray-300">
            <Icon name="home" />
          </div>
        )}
        {/* Location chip — top-left over image */}
        {p.location?.location && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm backdrop-blur">
            <Icon name="pin" className="size-3 text-brand-600" />
            {p.location.location.name}
          </div>
        )}
        {/* Edit pencil — top-right over image */}
        <Link
          href={`/manage/listings/${p.id}/edit`}
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg bg-white/95 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-brand-700"
          title="แก้ไขข้อมูลที่พัก"
        >
          <Icon name="edit" className="size-4" />
        </Link>
      </div>

      <div className="p-5">
        {/* ── Header: status + name ─────────────────────────────────── */}
        <div className="mb-1 flex items-center gap-2">
          <Badge variant={status.variant} dot>
            {status.label}
          </Badge>
          {!p.isActive && <Badge variant="default">หยุดให้บริการ</Badge>}
        </div>
        <h3 className="truncate text-lg font-bold tracking-tight text-gray-900">{name}</h3>

        {/* Info chips — code · type · bedrooms · bathrooms */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <code className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px]">{p.code}</code>
          <span className="text-gray-300">·</span>
          <span>{typeLabel[p.type] ?? p.type}</span>
          <span className="ml-auto inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Icon name="bed" className="size-3.5 text-gray-400" />
              <span className="font-medium tabular-nums">{p.totalBedrooms}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="bath" className="size-3.5 text-gray-400" />
              <span className="font-medium tabular-nums">{p.totalBathrooms}</span>
            </span>
          </span>
        </div>

        {/* ── Section: ลิงก์แชร์ราคา ────────────────────────────────── */}
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2">
            <Icon name="link" className="size-3 text-gray-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              ลิงก์แชร์ราคา
            </span>
          </div>
          <div className="space-y-1.5">
            <SaleLinkRow label="ราคาขาย"     icon="cash"     url={baseSale ? `${baseSale}?price=sell` : null} />
            <SaleLinkRow label="ราคาส่ง Agent" icon="cashStack" url={baseSale ? `${baseSale}?price=wholesale` : null} />
            <SaleLinkRow label="ไม่โชว์ราคา"  icon="eye"      url={baseSale ? `${baseSale}?price=hide` : null} />
          </div>
        </div>

        {/* ── Primary actions — booking + map ───────────────────────── */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
          <SaleLinkChip label="ลิงก์จอง" icon="calendarCheck" url={baseSale} accent="warning" />
          <SaleLinkChip label="แผนที่"   icon="pin"           url={mapsUrl}  accent="primary-solid" />
        </div>
      </div>
    </Card>
  )
}

/**
 * Compact row used inside the "ลิงก์แชร์ราคา" section — icon + label on the left,
 * single "open + copy" combo on the right. Clearer hierarchy than three pill buttons
 * fighting for attention.
 */
function SaleLinkRow({
  label,
  icon,
  url,
}: {
  label: string
  icon: 'cash' | 'cashStack' | 'eye'
  url: string | null
}) {
  const [copied, setCopied] = useState(false)
  const disabled = !url

  function handleOpen() {
    if (!url) return
    const full = url.startsWith('http') ? url : `${window.location.origin}${url}`
    window.open(full, '_blank', 'noopener,noreferrer')
  }
  async function handleCopy() {
    if (!url) return
    const full = url.startsWith('http') ? url : `${window.location.origin}${url}`
    try {
      await navigator.clipboard.writeText(full)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('คัดลอกลิงก์:', full)
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-brand-300 hover:bg-brand-50/40',
      )}
    >
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className="flex flex-1 items-center gap-2 text-left text-sm font-medium text-gray-700 disabled:cursor-not-allowed"
        title={url ?? 'ยังไม่ได้ตั้ง sale slug'}
      >
        <Icon name={icon} className="size-3.5 text-gray-400" />
        <span className="truncate">{label}</span>
        <Icon name="external" className="size-3 text-gray-300" />
      </button>
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed"
        title={copied ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}
      >
        <Icon name={copied ? 'check' : 'copy'} className="size-3.5" />
      </button>
    </div>
  )
}

/**
 * Split-button chip — left zone opens URL in a new tab, right zone copies URL.
 * Disabled (gray) when URL is null (e.g. no slug, no map coords).
 */
function SaleLinkChip({
  label,
  icon,
  url,
  accent,
}: {
  label: string
  icon?: 'calendarCheck' | 'pin'
  url: string | null
  accent: 'primary' | 'primary-solid' | 'warning'
}) {
  const [copied, setCopied] = useState(false)
  const disabled = !url

  function handleOpen() {
    if (!url) return
    const full = url.startsWith('http') ? url : `${window.location.origin}${url}`
    window.open(full, '_blank', 'noopener,noreferrer')
  }

  async function handleCopy() {
    if (!url) return
    const full = url.startsWith('http') ? url : `${window.location.origin}${url}`
    try {
      await navigator.clipboard.writeText(full)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('คัดลอกลิงก์:', full)
    }
  }

  const leftBg =
    accent === 'warning'
      ? 'bg-amber-400 hover:bg-amber-500'
      : accent === 'primary-solid'
        ? 'bg-brand-600 hover:bg-brand-700'
        : 'bg-brand-50 hover:bg-brand-100 ring-1 ring-inset ring-brand-200'
  const leftText =
    accent === 'warning' || accent === 'primary-solid' ? 'text-white' : 'text-brand-700'
  const iconColor =
    accent === 'warning' ? 'text-amber-600' : 'text-brand-600'

  return (
    <div
      className={cn(
        'flex h-11 overflow-hidden rounded-xl shadow-sm',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={cn(
          'flex flex-1 items-center justify-center gap-1.5 truncate px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed',
          leftBg,
          leftText,
        )}
      >
        {icon && <Icon name={icon} className="size-3.5" />}
        <span className="truncate">{label}</span>
      </button>
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        className={cn(
          'flex w-11 shrink-0 items-center justify-center bg-white transition-colors hover:bg-gray-50 disabled:cursor-not-allowed',
          iconColor,
        )}
        title={copied ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}
      >
        <Icon name={copied ? 'check' : 'copy'} className="size-4" />
      </button>
    </div>
  )
}

// ──────────────────────────────────────────
// Share-link toolbar
// 4 quick-copy buttons that share the owner's sale page with different
// pricing modes encoded via ?price=sell|wholesale|hide.
// ──────────────────────────────────────────

interface ShareLinkToolbarProps {
  slug: string | null | undefined
}

function ShareLinkToolbar({ slug }: ShareLinkToolbarProps) {
  const buttons: {
    key: string
    label: string
    query: string
    accent: 'primary' | 'accent'
    /** Internal route to navigate to on left-button click. If omitted, opens the public sale page. */
    internalHref?: string
  }[] = [
    { key: 'sell',      label: 'รวมโชว์ราคาขาย', query: '?price=sell',      accent: 'primary', internalHref: '/listings-calendar/sell' },
    { key: 'wholesale', label: 'รวมโชว์ราคาส่ง', query: '?price=wholesale', accent: 'primary', internalHref: '/listings-calendar/wholesale' },
    { key: 'hide',      label: 'รวมไม่โชว์ราคา', query: '?price=hide',      accent: 'primary', internalHref: '/listings-calendar/hide' },
    { key: 'default',   label: 'ที่พัก SalePage', query: '',                accent: 'accent'  },
  ]
  return (
    <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {buttons.map((b) => (
        <ShareLinkSplitButton
          key={b.key}
          label={b.label}
          slug={slug}
          query={b.query}
          accent={b.accent}
          internalHref={b.internalHref}
        />
      ))}
    </div>
  )
}

/**
 * Split button — left zone opens new tab, right zone copies link.
 * Two separate <button> elements inside a flex container.
 */
function ShareLinkSplitButton({
  label,
  slug,
  query,
  accent,
  internalHref,
}: {
  label: string
  slug: string | null | undefined
  query: string
  accent: 'primary' | 'accent'
  /** If set, the LEFT button navigates here internally instead of opening the public sale page. */
  internalHref?: string
}) {
  const [copied, setCopied] = useState(false)
  // Both buttons share the same target URL — disabled when there's nothing to point at
  const targetUrl = (() => {
    if (typeof window === 'undefined') return null
    if (internalHref) return `${window.location.origin}${internalHref}`
    if (slug) return `${window.location.origin}/sale/${slug}${query}`
    return null
  })()
  const leftDisabled = !slug && !internalHref
  const copyDisabled = leftDisabled

  function handleLeftClick() {
    if (!targetUrl) return
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleCopy() {
    // Copy the same URL that the LEFT button would open (internal page when available, else sale page)
    if (!targetUrl) return
    try {
      await navigator.clipboard.writeText(targetUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('คัดลอกลิงก์:', targetUrl)
    }
  }

  const leftBg =
    accent === 'primary'
      ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/20'
      : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
  const iconText = accent === 'primary' ? 'text-brand-600' : 'text-amber-600'

  return (
    <div
      className={cn(
        'flex h-12 overflow-hidden rounded-xl shadow-sm',
      )}
    >
      {/* LEFT — internal navigation (when internalHref set) OR open public sale tab */}
      <button
        type="button"
        onClick={handleLeftClick}
        disabled={leftDisabled}
        title={
          leftDisabled
            ? 'ยังไม่ได้ตั้ง sale slug — แก้ที่โปรไฟล์'
            : internalHref
              ? `เปิดแท็บใหม่: ${internalHref}`
              : `เปิดแท็บใหม่: /sale/${slug}${query}`
        }
        className={cn(
          'flex flex-1 items-center justify-start truncate px-4 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
          leftBg,
        )}
      >
        <span className="truncate">{label}</span>
      </button>

      {/* RIGHT — copy public sale link only */}
      <button
        type="button"
        onClick={handleCopy}
        disabled={copyDisabled}
        title={
          copyDisabled
            ? 'ยังไม่ได้ตั้ง sale slug — แก้ที่โปรไฟล์'
            : copied
              ? '✓ คัดลอกแล้ว'
              : `คัดลอก: ${targetUrl}`
        }
        className={cn(
          'group flex w-12 shrink-0 items-center justify-center bg-white transition-colors hover:bg-gray-50 active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
          iconText,
        )}
      >
        <Icon
          name={copied ? 'check' : 'copy'}
          className="size-5 transition-transform group-hover:scale-110"
        />
      </button>
    </div>
  )
}
