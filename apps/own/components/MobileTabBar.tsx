'use client'

/**
 * Bottom tab bar — native-app style navigation for mobile.
 * Visible only below `lg` breakpoint; desktop keeps the sidebar.
 *
 * 4 primary destinations + 1 "เมนู" tab that opens the full sidebar drawer
 * (where less-used pages — settings, sale-page admin, etc. — live).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, Icon, type IconName } from '@pms/ui'

interface TabItem {
  key: string
  href?: string
  label: string
  icon: IconName
  /** Active when pathname starts with any of these prefixes. */
  match?: string[]
}

const TABS: TabItem[] = [
  { key: 'calendar', href: '/manage/calendar', label: 'ปฏิทิน',     icon: 'calendar', match: ['/manage/calendar'] },
  { key: 'pricing',  href: '/manage/pricing',  label: 'ปรับราคา',   icon: 'money',    match: ['/manage/pricing'] },
  { key: 'listings', href: '/manage/listings', label: 'ลิสติ้งที่พัก', icon: 'home',     match: ['/manage/listings'] },
  { key: 'postpone', href: '/manage/postpone', label: 'เลื่อนวัน',  icon: 'postpone', match: ['/manage/postpone'] },
  { key: 'menu',     label: 'เมนู',           icon: 'menu' }, // opens drawer
]

interface Props {
  onMenuClick: () => void
}

export function MobileTabBar({ onMenuClick }: Props) {
  const pathname = usePathname()

  function isActive(item: TabItem): boolean {
    if (!item.match) return false
    return item.match.some((p) => pathname.startsWith(p))
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden"
      // Account for iOS home indicator safe area
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-screen-sm items-stretch">
        {TABS.map((item) => {
          const active = isActive(item)
          const labelColor = active ? 'text-brand-600' : 'text-gray-500'
          const iconColor = active ? 'text-brand-600' : 'text-gray-500'

          const inner = (
            <div className="flex flex-col items-center justify-center gap-0.5 px-1 py-2">
              <Icon name={item.icon} className={cn('size-5', iconColor)} />
              <span className={cn('truncate text-[10.5px] font-medium', labelColor)}>
                {item.label}
              </span>
            </div>
          )

          return (
            <li key={item.key} className="flex-1">
              {item.href ? (
                <Link
                  href={item.href}
                  className="block"
                  aria-current={active ? 'page' : undefined}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onMenuClick}
                  className="block w-full"
                  aria-label={item.label}
                >
                  {inner}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
