'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@pms/ui'

interface MenuItem {
  href: string
  label: string
  icon: string
}
interface MenuGroup {
  group: string
  items: MenuItem[]
}

const menu: MenuGroup[] = [
  {
    group: 'จัดการข้อมูล',
    items: [
      { href: '/manage/calendar', label: 'ปฏิทิน', icon: '📅' },
      { href: '/manage/bookings', label: 'การจอง', icon: '📋' },
      { href: '/manage/pricing', label: 'ปรับราคา', icon: '💰' },
      { href: '/manage/listings', label: 'ลิสติ้งที่พัก', icon: '🏠' },
      { href: '/manage/postpone', label: 'เลื่อนวันเข้าพัก', icon: '🔁' },
      { href: '/manage/housekeeper', label: 'House Keeper', icon: '🧹' },
      { href: '/manage/coupons', label: 'คูปอง', icon: '🎟️' },
      { href: '/manage/accounting', label: 'ด้านบัญชี', icon: '📊' },
    ],
  },
  {
    group: 'รายงาน',
    items: [
      { href: '/manage/dashboard', label: 'แดชบอร์ด', icon: '📈' },
      { href: '/manage/transactions', label: 'ประวัติการทำรายการ', icon: '📜' },
    ],
  },
  {
    group: 'อื่นๆ',
    items: [{ href: '/manage/payout-channels', label: 'ช่องทางรับเงิน', icon: '🏦' }],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-200 px-5">
        <Link href="/manage/dashboard" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white shadow-sm shadow-brand-600/30">
            🏖️
          </div>
          <span className="text-base font-bold tracking-tight text-gray-900">PMS Villa</span>
        </Link>
      </div>

      <nav className="px-3 py-4">
        {menu.map((group) => (
          <div key={group.group} className="mb-5 last:mb-0">
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {group.group}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-brand-50 font-semibold text-brand-700'
                          : 'text-gray-700 hover:bg-gray-100',
                      )}
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
