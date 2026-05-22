import Link from 'next/link'
import { Icon } from '@pms/ui'

interface BadgeProps {
  count: number
  /** When set, renders as a clickable link. */
  href?: string
  /** When set, renders as a button — takes priority over `href`. */
  onClick?: () => void
}

/**
 * Dark rounded-rectangle badge "แบ่งห้อง N ›" — used above property cards.
 * Designed as a solid dark chip with crisp rounded corners (not a pill).
 * `onClick` wins over `href` so callers can swap a Link for a panel trigger.
 */
export function SplitRoomBadge({ count, href, onClick }: BadgeProps) {
  const className =
    'inline-flex items-center gap-2 rounded-t-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-md ring-1 ring-inset ring-white/5 transition-colors hover:bg-gray-800'

  const body = (
    <>
      <span>แบ่งห้อง {count}</span>
      <Icon name="chevronRight" className="size-3.5" />
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    )
  }
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    )
  }
  return <div className={className}>{body}</div>
}

interface BlockProps {
  count: number
  href?: string
  /** When true, draws as a sticker on the top-right of a cover image (absolute positioning). */
  variant?: 'banner' | 'overlay'
}

/**
 * Top-right "แบ่งห้อง" pill anchored above the property card cover.
 * Just the dark pill — no background banner.
 */
export function SplitRoomBlock({ count, href, variant = 'banner' }: BlockProps) {
  if (variant === 'overlay') {
    return (
      <div className="absolute right-3 top-3 z-10">
        <SplitRoomBadge count={count} href={href} />
      </div>
    )
  }
  return (
    <div className="flex justify-end px-3 pt-3">
      <SplitRoomBadge count={count} href={href} />
    </div>
  )
}
