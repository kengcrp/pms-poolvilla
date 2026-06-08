'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, Icon, type IconName } from '@pms/ui'
import { useT } from '@/lib/i18n'
import { trpc } from '@/lib/trpc'

/** localStorage key — timestamp (ms) of the last time the owner visited the
 *  postpone page. Used to dim the badge once everything has been seen. */
const POSTPONE_SEEN_KEY = 'pms.postpone.seenAt'

interface MenuItem {
  href: string
  /** i18n key for label (looked up via useT) */
  labelKey: string
  icon: IconName
  /** Slug used to look up a per-item live badge count (handled below). */
  badgeKey?: 'postpone'
  /** Premium-only feature — shows a small crown overlay on the icon */
  premium?: boolean
}
interface MenuGroup {
  /** i18n key for group title */
  groupKey: string
  items: MenuItem[]
}

/**
 * Feature-lock list — sidebar items whose pages exist + work but are presented
 * as "ยังไม่เปิดให้ใช้งาน" (greyed, non-clickable, lock badge). All data, routes
 * and code stay intact; this is purely a presentational gate.
 *
 * 🔓 TO UNLOCK EVERYTHING: empty this set → `new Set<string>()`.
 *    (or remove individual hrefs to unlock them one at a time.)
 */
const LOCKED_HREFS = new Set<string>([
  '/manage/listings', // ลิสติ้งที่พัก
  '/manage/housekeeper', // House Keeper
  '/manage/accounting', // ด้านบัญชี
  '/manage/dashboard', // แดชบอร์ด
  '/manage/sale-page/bookings', // ตรวจสอบการจอง
  '/manage/coupons', // คูปอง
  '/manage/sale-page/videos', // อัพโหลดวิดีโอที่พัก
  '/manage/settings', // ตั้งค่าทั่วไป
  '/manage/manual', // คู่มือการใช้งาน
  '/manage/premium', // แพ็กเกจ Premium
])

const menu: MenuGroup[] = [
  {
    groupKey: 'menu.group.manage',
    items: [
      { href: '/manage/calendar', labelKey: 'menu.calendar', icon: 'calendar' },
      { href: '/manage/pricing', labelKey: 'menu.pricing', icon: 'money' },
      { href: '/manage/listings', labelKey: 'menu.listings', icon: 'home' },
      { href: '/manage/postpone', labelKey: 'menu.postpone', icon: 'postpone', badgeKey: 'postpone' },
      { href: '/manage/housekeeper', labelKey: 'menu.housekeeper', icon: 'broom' },
      { href: '/manage/accounting', labelKey: 'menu.accounting', icon: 'invoice' },
    ],
  },
  {
    groupKey: 'menu.group.reports',
    items: [
      { href: '/manage/dashboard', labelKey: 'menu.dashboard', icon: 'dashboard' },
      { href: '/manage/transactions', labelKey: 'menu.transactions', icon: 'history' },
    ],
  },
  {
    // All "เซลเพจ" items are premium-only — crown badge shown on each icon.
    // "ธีม Sale Page" accessible via ตั้งค่าทั่วไป page (card with "จัดการ" link).
    // คูปอง moved here because coupons are issued for Sale Page promotions.
    groupKey: 'menu.group.salePage',
    items: [
      { href: '/manage/sale-page/bookings', labelKey: 'menu.salePageBookings', icon: 'bookings', premium: true },
      { href: '/manage/coupons',            labelKey: 'menu.coupons',          icon: 'ticket',   premium: true },
      { href: '/manage/sale-page/videos',   labelKey: 'menu.salePageVideos',   icon: 'images',   premium: true },
    ],
  },
  {
    groupKey: 'menu.group.other',
    items: [
      // "ช่องทางการรับเงิน" removed from sidebar — accessible via the
      // ตั้งค่าทั่วไป page (card with "จัดการ" link).
      { href: '/manage/settings',  labelKey: 'menu.settings', icon: 'gear', premium: true },
      { href: '/manage/manual',    labelKey: 'menu.manual',   icon: 'info' },
      { href: '/manage/premium',   labelKey: 'menu.premium',  icon: 'star' },
    ],
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
  /** Server action that signs the user out. Optional — when omitted the
   *  logout button is hidden (e.g. on a page that doesn't have auth context). */
  signOutAction?: () => Promise<void>
}

export function Sidebar({ mobileOpen, onClose, signOutAction }: SidebarProps) {
  const pathname = usePathname()
  const t = useT()

  // Live badge counts — only fetch when feature is enabled. Owner procedure
  // returns 0 when unauthenticated, so this is safe at the top level.
  const { data: pendingPostpones } = trpc.booking.pendingPostponeCount.useQuery(
    undefined,
    { refetchOnWindowFocus: true, refetchInterval: 60_000 },
  )

  // Track when the owner last viewed the postpone page so the badge can dim
  // (red → gray) once everything has been seen. Stamp on every visit.
  const [postponeSeenAt, setPostponeSeenAt] = useState<number>(0)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem(POSTPONE_SEEN_KEY)
    setPostponeSeenAt(raw ? Number(raw) || 0 : 0)
  }, [])
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (pathname.startsWith('/manage/postpone')) {
      const now = Date.now()
      localStorage.setItem(POSTPONE_SEEN_KEY, String(now))
      setPostponeSeenAt(now)
    }
  }, [pathname])

  interface BadgeState {
    count: number
    /** When true, render gray (already viewed); when false, render red (new) */
    seen: boolean
  }
  const badgeFor = (key?: 'postpone'): BadgeState | null => {
    if (key === 'postpone') {
      const count = pendingPostpones?.count ?? 0
      const latestMs = pendingPostpones?.latestAt
        ? new Date(pendingPostpones.latestAt).getTime()
        : 0
      const seen = postponeSeenAt >= latestMs && latestMs > 0
      return { count, seen }
    }
    return null
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label={t('shell.closeMenu')}
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 transform flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-out',
          // Desktop: sticky to viewport top so the menu stays visible while the
          // page scrolls (was lg:static — sidebar scrolled away with content).
          'lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-gray-200 px-5">
          <Link
            href="/manage/calendar"
            onClick={onClose}
            className="flex items-center gap-2.5"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/30">
              <Icon name="beach" className="size-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-gray-900">PMS Villa</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:hidden"
            aria-label={t('shell.closeMenu')}
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {menu.map((group) => (
            <div key={group.groupKey} className="mb-5 last:mb-0">
              <div className="px-3 pb-2 text-sm font-bold text-gray-900">
                {t(group.groupKey)}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname.startsWith(item.href)
                  const badge = badgeFor(item.badgeKey)
                  const locked = LOCKED_HREFS.has(item.href)

                  // Locked item — render a non-clickable greyed row with a small
                  // "เร็วๆ นี้" lock pill. Page + route still exist; this only
                  // gates the entry point. Unlock by editing LOCKED_HREFS.
                  if (locked) {
                    return (
                      <li key={item.href}>
                        <div
                          aria-disabled
                          title="ยังไม่เปิดให้ใช้งาน"
                          className="relative flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300"
                        >
                          <span className="relative shrink-0">
                            <Icon name={item.icon} fixedWidth className="size-5 text-gray-300" />
                          </span>
                          <span className="flex-1">{t(item.labelKey)}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-400">
                            <Icon name="lock" className="size-2.5" />
                            เร็วๆ นี้
                          </span>
                        </div>
                      </li>
                    )
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                          active
                            ? 'font-bold text-brand-600'
                            : 'text-gray-700 hover:bg-gray-100',
                        )}
                      >
                        {/* Left accent bar — vertical brand-blue rounded line
                            shown only when this item is the active route. */}
                        {active && (
                          <span
                            aria-hidden
                            className="absolute -left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-brand-600"
                          />
                        )}
                        {/* Icon (relative so the crown overlay anchors to it).
                            Slightly larger so the crown badge fits visibly. */}
                        <span className="relative shrink-0">
                          <Icon
                            name={item.icon}
                            fixedWidth
                            className={cn('size-5', active ? 'text-brand-600' : 'text-gray-700')}
                          />
                          {item.premium && (
                            <span
                              aria-label="premium"
                              title="ฟีเจอร์ Premium"
                              className="absolute -right-1.5 -top-1.5 leading-none drop-shadow-sm"
                            >
                              {/* Flat yellow crown — 3 spikes with circles on top,
                                  wavy base. Inlined SVG for a consistent flat look
                                  across platforms (emoji 👑 renders differently
                                  per OS). */}
                              <svg
                                viewBox="0 0 24 18"
                                aria-hidden
                                className="size-3.5"
                                fill="#FBBF24"
                              >
                                <path d="M3 16 L1.5 6.5 L6.5 10 L12 3 L17.5 10 L22.5 6.5 L21 16 Z" />
                                <circle cx="1.5" cy="5.5" r="1.5" />
                                <circle cx="12" cy="2"   r="1.7" />
                                <circle cx="22.5" cy="5.5" r="1.5" />
                              </svg>
                            </span>
                          )}
                        </span>
                        <span className="flex-1">{t(item.labelKey)}</span>
                        {badge && badge.count > 0 && (
                          <span
                            className={cn(
                              'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none text-white',
                              // Red = new / unseen items, Gray = all already viewed
                              badge.seen ? 'bg-gray-400' : 'bg-red-500',
                            )}
                            title={
                              badge.seen
                                ? `${badge.count} รายการ (ดูแล้ว)`
                                : `${badge.count} รายการรอจัดการ`
                            }
                          >
                            {badge.count > 99 ? '99+' : badge.count}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Logout button removed per UX request — the `signOutAction` prop is
            still accepted on the Sidebar API in case a future surface wants to
            re-enable a logout button without changing the component contract. */}
        {void signOutAction}
      </aside>
    </>
  )
}
