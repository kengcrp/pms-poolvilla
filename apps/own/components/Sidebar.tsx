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
}
interface MenuGroup {
  /** i18n key for group title */
  groupKey: string
  items: MenuItem[]
}

const menu: MenuGroup[] = [
  {
    groupKey: 'menu.group.manage',
    items: [
      { href: '/manage/calendar', labelKey: 'menu.calendar', icon: 'calendar' },
      { href: '/manage/pricing', labelKey: 'menu.pricing', icon: 'money' },
      { href: '/manage/listings', labelKey: 'menu.listings', icon: 'home' },
      { href: '/manage/postpone', labelKey: 'menu.postpone', icon: 'postpone', badgeKey: 'postpone' },
      { href: '/manage/housekeeper', labelKey: 'menu.housekeeper', icon: 'broom' },
      { href: '/manage/coupons', labelKey: 'menu.coupons', icon: 'ticket' },
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
    groupKey: 'menu.group.other',
    items: [{ href: '/manage/payout-channels', labelKey: 'menu.payoutChannels', icon: 'bank' }],
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
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
          'fixed inset-y-0 left-0 z-40 w-64 shrink-0 transform border-r border-gray-200 bg-white transition-transform duration-200 ease-out',
          'lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-gray-200 px-5">
          <Link
            href="/manage/dashboard"
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

        <nav className="overflow-y-auto px-3 py-4" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
          {menu.map((group) => (
            <div key={group.groupKey} className="mb-5 last:mb-0">
              <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {t(group.groupKey)}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname.startsWith(item.href)
                  const badge = badgeFor(item.badgeKey)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                          active
                            ? 'bg-brand-50 font-semibold text-brand-700'
                            : 'text-gray-700 hover:bg-gray-100',
                        )}
                      >
                        <Icon name={item.icon} fixedWidth className="size-4 text-gray-500" />
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
      </aside>
    </>
  )
}
