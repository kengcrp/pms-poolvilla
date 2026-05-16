'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, Icon, type IconName } from '@pms/ui'

interface MenuItem {
  href: string
  label: string
  icon: IconName
}
interface MenuGroup {
  group: string
  items: MenuItem[]
}

const menu: MenuGroup[] = [
  {
    group: 'จัดการข้อมูล',
    items: [
      { href: '/manage/calendar', label: 'ปฏิทิน', icon: 'calendar' },
      { href: '/manage/bookings', label: 'การจอง', icon: 'bookings' },
      { href: '/manage/pricing', label: 'ปรับราคา', icon: 'money' },
      { href: '/manage/listings', label: 'ลิสติ้งที่พัก', icon: 'home' },
      { href: '/manage/postpone', label: 'เลื่อนวันเข้าพัก', icon: 'postpone' },
      { href: '/manage/housekeeper', label: 'House Keeper', icon: 'broom' },
      { href: '/manage/coupons', label: 'คูปอง', icon: 'ticket' },
      { href: '/manage/accounting', label: 'ด้านบัญชี', icon: 'invoice' },
    ],
  },
  {
    group: 'รายงาน',
    items: [
      { href: '/manage/dashboard', label: 'แดชบอร์ด', icon: 'dashboard' },
      { href: '/manage/transactions', label: 'ประวัติการทำรายการ', icon: 'history' },
    ],
  },
  {
    group: 'อื่นๆ',
    items: [{ href: '/manage/payout-channels', label: 'ช่องทางรับเงิน', icon: 'bank' }],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-200 px-5">
        <Link href="/manage/dashboard" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/30">
            <Icon name="beach" className="size-4" />
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
                      <Icon name={item.icon} fixedWidth className="size-4 text-gray-500" />
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
