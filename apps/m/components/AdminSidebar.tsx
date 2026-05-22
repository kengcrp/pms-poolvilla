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
    group: 'จัดการข้อมูลที่พัก',
    items: [
      { href: '/manage-accommodation/check', label: 'ตรวจสอบข้อมูลที่พัก', icon: 'check' },
      { href: '/manage-accommodation/list', label: 'รายการที่พัก', icon: 'home' },
      { href: '/manage-accommodation/hotels', label: 'โรงแรม', icon: 'bed' },
      { href: '/manage-accommodation/pricing', label: 'ปรับราคา', icon: 'money' },
      { href: '/manage-accommodation/postpone', label: 'เลื่อนวันเข้าพัก', icon: 'postpone' },
      { href: '/manage-accommodation/location', label: 'โลเคชัน', icon: 'pin' },
    ],
  },
  {
    group: 'ตั้งค่าจัดการที่พัก',
    items: [
      { href: '/setting-accommodation/property-types', label: 'ประเภทที่พัก', icon: 'home' },
      { href: '/setting-accommodation/hotel-types', label: 'ประเภทโรงแรม', icon: 'bed' },
      { href: '/setting-accommodation/facilities', label: 'สิ่งอำนวยความสะดวก', icon: 'tags' },
      { href: '/setting-accommodation/connect-api', label: 'เชื่อมต่อ API', icon: 'link' },
    ],
  },
  {
    group: 'จัดการผู้ใช้งาน',
    items: [
      { href: '/manage-user/staff', label: 'พนักงาน', icon: 'user' },
      { href: '/manage-user/owners', label: 'เจ้าของที่พัก', icon: 'users' },
      { href: '/manage-user/service-additional', label: 'บริการเสริม', icon: 'shop' },
    ],
  },
  {
    group: 'รายงาน',
    items: [
      { href: '/report/dashboard', label: 'แดชบอร์ด', icon: 'dashboard' },
      { href: '/report/transactions', label: 'ประวัติการทำรายการ', icon: 'history' },
      { href: '/report/pollvilla-city', label: 'จองผ่าน Marketplace', icon: 'globe' },
    ],
  },
  {
    group: 'ตั้งค่าระบบ',
    items: [
      { href: '/setting/function', label: 'ฟังก์ชันการทำงาน', icon: 'sliders' },
      { href: '/setting/commission', label: 'ค่าคอมมิชชัน', icon: 'percent' },
      { href: '/setting/theme', label: 'ธีมสีและโลโก้', icon: 'image' },
    ],
  },
]

interface Props {
  mobileOpen: boolean
  onClose: () => void
}

export function AdminSidebar({ mobileOpen, onClose }: Props) {
  const pathname = usePathname()

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="ปิดเมนู"
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
          <Link href="/report/dashboard" onClick={onClose} className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/30">
              <Icon name="shield" className="size-4" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-gray-900">PMS Manager</div>
              <div className="text-[10.5px] text-gray-500">Admin Console</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:hidden"
            aria-label="ปิดเมนู"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>

        <nav className="overflow-y-auto px-3 py-4" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
          {menu.map((group) => (
            <div key={group.group} className="mb-4 last:mb-0">
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
                        onClick={onClose}
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
    </>
  )
}
