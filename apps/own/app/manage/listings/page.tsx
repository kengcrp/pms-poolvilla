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

export default function ListingsPage() {
  const { data, isPending, error } = trpc.property.list.useQuery()
  const properties = data?.properties ?? []
  const slug = data?.ownerSaleSlug

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">ลิสติ้งที่พัก</h1>
          <p className="mt-0.5 text-xs text-gray-600 sm:mt-1 sm:text-sm">
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

      {/* 2 columns even on phone — owner sees more properties per screen.
          Cards adapt: tighter padding, smaller name, share rows still readable. */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
    showOnSalePage: boolean
    reviewStatus: string
    variants: { id: string; isDefault: boolean }[]
    images: { url: string }[]
    location: {
      location?: { name: string } | null
      lat?: unknown
      lng?: unknown
      gmapUrl?: string | null
    } | null
  }
  slug: string | null | undefined
  status: { label: string; variant: 'pending' | 'success' | 'danger' | 'default' }
}

function PropertyCard({ p, slug, status }: PropertyCardProps) {
  const utils = trpc.useUtils()
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Sale Page visibility — persisted via property.showOnSalePage column.
  // Optimistic update so the switch flips instantly even on slow connections.
  // We snapshot the current cache, write the inverted value, then reconcile
  // with the server response (rolling back on error).
  const toggleSalePage = trpc.property.toggleSalePage.useMutation({
    onMutate: async ({ id }) => {
      await utils.property.list.cancel()
      const prev = utils.property.list.getData()
      utils.property.list.setData(undefined, (curr) =>
        curr
          ? {
              ...curr,
              properties: curr.properties.map((item) =>
                item.id === id ? { ...item, showOnSalePage: !item.showOnSalePage } : item,
              ),
            }
          : curr,
      )
      return { prev }
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) utils.property.list.setData(undefined, ctx.prev)
    },
    onSettled: () => utils.property.list.invalidate(),
  })
  const remove = trpc.property.delete.useMutation({
    onSuccess: () => {
      utils.property.list.invalidate()
      setConfirmOpen(false)
    },
  })
  const name = (p.name as { th?: string })?.th ?? p.code
  const cover = p.images[0]?.url
  const baseSale = slug ? `/sale/${slug}/${p.code}` : null
  // Per-property share URLs use the owner-side listings-calendar view (filtered to this one
  // property) — owner shares this with an agent / partner; sees a clean per-property calendar
  // with mode-specific pricing (sell / wholesale / hide).
  const shareBase = `/listings-calendar`
  const calCode = p.code
  // Prefer the owner's original Google Maps link (so they can copy the exact shareable
  // URL they pasted into the edit form). Fall back to a constructed Maps URL from
  // the saved lat/lng if no gmapUrl is stored yet.
  const lat = p.location?.lat ? Number(p.location.lat) : null
  const lng = p.location?.lng ? Number(p.location.lng) : null
  const mapsUrl =
    p.location?.gmapUrl
      ? p.location.gmapUrl
      : lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)
        ? `https://www.google.com/maps?q=${lat},${lng}`
        : null

  return (
    <Card hover className="overflow-hidden">
      {/* ── Cover image — even shorter on mobile (16/6) to fit more above the fold ── */}
      <div className="relative aspect-[16/6] bg-gradient-to-br from-gray-100 to-gray-200 sm:aspect-[16/8]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-4xl text-gray-300">
            <Icon name="home" />
          </div>
        )}
        {/* Location chip — top-left over image */}
        {p.location?.location && (
          <div className="absolute left-2 top-2 inline-flex max-w-[60%] items-center gap-1 truncate rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-medium text-gray-700 shadow-sm backdrop-blur sm:left-3 sm:top-3 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs">
            <Icon name="pin" className="size-2.5 shrink-0 text-brand-600 sm:size-3" />
            <span className="truncate">{p.location.location.name}</span>
          </div>
        )}
        {/* Action buttons — top-right over image. Edit (primary) + trash icon (destructive).
            Both are pill-shaped with backdrop blur so they sit cleanly over any cover. */}
        <div className="absolute right-2 top-2 flex items-center gap-1.5 sm:right-3 sm:top-3">
          <Link
            href={`/manage/listings/${p.id}/edit`}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-gray-800 shadow-md ring-1 ring-inset ring-gray-200 backdrop-blur transition-all hover:bg-brand-600 hover:text-white hover:ring-brand-600 sm:px-4 sm:py-2 sm:text-sm"
            title="แก้ไขข้อมูลที่พัก"
          >
            <Icon name="edit" className="size-3.5 sm:size-4" />
            {/* Hide "แก้ไข" text on tight cards (phone 2-col) — icon is enough. */}
            <span className="hidden sm:inline">แก้ไข</span>
          </Link>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={remove.isPending}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/95 text-red-500 shadow-md ring-1 ring-inset ring-gray-200 backdrop-blur transition-all hover:bg-red-500 hover:text-white hover:ring-red-500 disabled:opacity-50 sm:size-9"
            title="ลบที่พักนี้"
            aria-label="ลบที่พัก"
          >
            <Icon name="trash" className="size-3.5 sm:size-4" />
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {/* ── Header: name + status under the name ────────────────── */}
        <h3 className="truncate text-base font-bold tracking-tight text-gray-900 sm:text-lg">
          {name}
        </h3>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.variant} dot>
              {status.label}
            </Badge>
            {!p.isActive && <Badge variant="default">หยุดให้บริการ</Badge>}
          </div>

          {/* Sale Page toggle — when ON, this property + its full details show
              on the public Sale Page (/s/[code]). OFF hides it from customers. */}
          <SalePageToggle
            on={p.showOnSalePage}
            disabled={toggleSalePage.isPending}
            onChange={() => toggleSalePage.mutate({ id: p.id })}
          />
        </div>

        {/* ── Sharable price links (label removed for a cleaner layout) ── */}
        <div className="mt-3 space-y-1.5">
          <SaleLinkRow label="ราคาขาย"     icon="cash"     url={`${shareBase}/sell/${calCode}`} />
          <SaleLinkRow label="ราคาส่ง Agent" icon="cashStack" url={`${shareBase}/wholesale/${calCode}`} />
          <SaleLinkRow label="ไม่โชว์ราคา"  icon="eye"      url={`${shareBase}/hide/${calCode}`} />
        </div>

        {/* ── Primary actions — booking + map ───────────────────────── */}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
          <SaleLinkChip label="ลิงก์จอง" icon="calendarCheck" url={baseSale} accent="warning" />
          <SaleLinkChip label="แผนที่"   icon="pin"           url={mapsUrl}  accent="primary-solid" />
        </div>
      </div>

      {/* Confirm-delete modal — replaces the native browser confirm() with a
          styled dialog. Centered overlay, red accent for destructive action. */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !remove.isPending && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — destructive icon + title */}
            <div className="flex items-start gap-3 px-6 pt-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Icon name="alert" className="size-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900">ลบที่พักนี้?</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                  คุณกำลังจะลบ <strong className="text-gray-900">"{name}"</strong> ออกจากระบบ —
                  การลบจะนำที่พักออกจากรายการทั้งหมด
                  <span className="font-semibold text-red-600"> ไม่สามารถกู้คืนได้ภายหลัง</span>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/40 px-6 py-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={remove.isPending}
              >
                ยกเลิก
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={() => remove.mutate({ id: p.id })}
                disabled={remove.isPending}
              >
                {remove.isPending ? 'กำลังลบ...' : 'ลบที่พัก'}
              </Button>
            </div>
          </div>
        </div>
      )}
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
    // Two distinct sibling buttons side-by-side — the main label "open in new tab" + a copy
    // companion. Both have clear button styling so the row reads as actionable, not just text.
    <div
      className={cn(
        'flex items-stretch',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        title={url ?? 'ยังไม่ได้ตั้ง sale slug'}
        className={cn(
          'group flex flex-1 items-center justify-start rounded-lg bg-brand-600 px-3 py-2 text-left text-sm font-semibold text-white shadow-sm transition-colors',
          !disabled && 'hover:bg-brand-700',
          disabled && 'cursor-not-allowed',
        )}
      >
        <span className="truncate">{label}</span>
      </button>
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        title={copied ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}
        className={cn(
          'flex w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm ring-1 ring-inset ring-gray-200 transition-all',
          !disabled && 'hover:bg-gray-50 hover:text-brand-700 hover:shadow-md',
          disabled && 'cursor-not-allowed',
          copied && 'text-emerald-600 ring-emerald-300',
        )}
      >
        <Icon name={copied ? 'check' : 'copy'} className="size-4" />
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const buttons: {
    key: string
    label: string
    query: string
    accent: 'primary' | 'accent'
    /** Internal route to navigate to on left-button click. If omitted, opens the public sale page. */
    internalHref?: string
    /** Show the small crown overlay (premium feature). */
    premium?: boolean
  }[] = [
    { key: 'sell',      label: 'รวมโชว์ราคาขาย', query: '?price=sell',      accent: 'primary', internalHref: '/listings-calendar/sell' },
    { key: 'wholesale', label: 'รวมโชว์ราคาส่ง', query: '?price=wholesale', accent: 'primary', internalHref: '/listings-calendar/wholesale' },
    { key: 'hide',      label: 'รวมไม่โชว์ราคา', query: '?price=hide',      accent: 'primary', internalHref: '/listings-calendar/hide' },
    { key: 'default',   label: 'ที่พัก SalePage', query: '',                accent: 'accent', internalHref: slug ? `/s/${slug}` : '/s/demo', premium: true },
  ]
  return (
    <div className="mb-5">
      {/* Mobile collapse toggle — saves vertical space; tap to expand. */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm sm:hidden"
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="copy" className="size-4 text-brand-600" />
          แชร์ลิงก์ที่พัก
        </span>
        <Icon
          name={mobileOpen ? 'chevronUp' : 'chevronDown'}
          className="size-4 text-gray-400"
        />
      </button>

      {/* Buttons grid — always visible on sm+; on phone only when expanded. */}
      <div
        className={cn(
          'grid grid-cols-1 gap-2 sm:mt-0 sm:grid-cols-2 sm:grid lg:grid-cols-4',
          mobileOpen ? 'mt-2 grid' : 'hidden sm:grid',
        )}
      >
        {buttons.map((b) => (
          <ShareLinkSplitButton
            key={b.key}
            label={b.label}
            slug={slug}
            query={b.query}
            accent={b.accent}
            internalHref={b.internalHref}
            premium={b.premium}
          />
        ))}
      </div>
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
  premium,
}: {
  label: string
  slug: string | null | undefined
  query: string
  accent: 'primary' | 'accent'
  /** If set, the LEFT button navigates here internally instead of opening the public sale page. */
  internalHref?: string
  /** Show a flat-yellow crown badge in the corner — premium feature marker. */
  premium?: boolean
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
    <div className="relative">
      {/* Premium crown — flat yellow SVG, sits outside the rounded clip. */}
      {premium && (
        <span
          aria-label="premium"
          title="ฟีเจอร์ Premium"
          className="pointer-events-none absolute -right-1.5 -top-2 z-10 drop-shadow-sm"
        >
          <svg
            viewBox="0 0 24 18"
            aria-hidden
            className="size-4"
            fill="#FBBF24"
          >
            <path d="M3 16 L1.5 6.5 L6.5 10 L12 3 L17.5 10 L22.5 6.5 L21 16 Z" />
            <circle cx="1.5" cy="5.5" r="1.5" />
            <circle cx="12" cy="2"   r="1.7" />
            <circle cx="22.5" cy="5.5" r="1.5" />
          </svg>
        </span>
      )}

      <div className="flex h-12 overflow-hidden rounded-xl shadow-sm">
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
    </div>
  )
}

/** Sale Page on/off toggle — labelled switch. ON = property visible on the
 *  public sale page with full details; OFF = hidden from customers.
 *  Currently UI-only state; add `showOnSalePage` to Property model + mutation
 *  to make it persistent.
 */
function SalePageToggle({
  on,
  disabled,
  onChange,
}: {
  on: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        // Guard against accidental parent click-handlers (Card hover, etc.)
        e.preventDefault()
        e.stopPropagation()
        onChange(!on)
      }}
      className={cn(
        'relative z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-wait disabled:opacity-60',
        on
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100'
          : 'bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-200',
      )}
      title={on ? 'แสดงบนหน้า Sale Page' : 'ซ่อนจากหน้า Sale Page'}
      aria-pressed={on}
    >
      {/* Mini switch track */}
      <span
        className={cn(
          'relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
          on ? 'bg-emerald-500' : 'bg-gray-300',
        )}
      >
        <span
          className={cn(
            'inline-block size-3 rounded-full bg-white shadow-sm transition-transform',
            on ? 'translate-x-3.5' : 'translate-x-0.5',
          )}
        />
      </span>
      Sale Page {on ? 'On' : 'Off'}
    </button>
  )
}
