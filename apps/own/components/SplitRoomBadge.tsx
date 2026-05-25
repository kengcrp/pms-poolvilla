import Link from 'next/link'
import { Icon } from '@pms/ui'

interface BadgeProps {
  count: number
  /** When set, renders as a clickable link. */
  href?: string
  /** When set, renders as a button — takes priority over `href`. */
  onClick?: () => void
  /** When true, badge becomes unclickable + shows a lock icon instead of chevron.
   *  Use when the property is closed for split sale (e.g. all weekly days are Locked). */
  locked?: boolean
}

/**
 * Dark rounded-rectangle badge "แบ่งห้อง N ›" — used above property cards.
 * Designed as a solid dark chip with crisp rounded corners (not a pill).
 * `onClick` wins over `href` so callers can swap a Link for a panel trigger.
 * When `locked=true`, badge is shown grayed-out + with lock icon and is NOT clickable.
 */
export function SplitRoomBadge({ count, href, onClick, locked = false }: BadgeProps) {
  const baseClass =
    'inline-flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-semibold text-white shadow-md ring-1 ring-inset ring-white/5 transition-colors'
  const liveClass = `${baseClass} bg-gray-900 hover:bg-gray-800`
  const lockedClass = `${baseClass} bg-gray-500 cursor-not-allowed opacity-80`

  const body = (
    <>
      <span>แบ่งห้อง {count}</span>
      <Icon name={locked ? 'lock' : 'chevronRight'} className="size-3.5" />
    </>
  )

  // Locked → always render as a non-interactive div (no click, no link)
  if (locked) {
    return (
      <div className={lockedClass} title="ปิดการแบ่งห้อง — ทุกวันถูกล็อก">
        {body}
      </div>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={liveClass}>
        {body}
      </button>
    )
  }
  if (href) {
    return (
      <Link href={href} className={liveClass}>
        {body}
      </Link>
    )
  }
  return <div className={liveClass}>{body}</div>
}

interface BlockProps {
  count: number
  href?: string
  locked?: boolean
  /** When true, draws as a sticker on the top-right of a cover image (absolute positioning). */
  variant?: 'banner' | 'overlay'
}

/**
 * Top-right "แบ่งห้อง" pill anchored above the property card cover.
 * Just the dark pill — no background banner.
 */
export function SplitRoomBlock({ count, href, locked = false, variant = 'banner' }: BlockProps) {
  if (variant === 'overlay') {
    return (
      <div className="absolute right-3 top-3 z-10">
        <SplitRoomBadge count={count} href={href} locked={locked} />
      </div>
    )
  }
  return (
    <div className="flex justify-end px-3 pt-3">
      <SplitRoomBadge count={count} href={href} locked={locked} />
    </div>
  )
}
