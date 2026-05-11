import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth, signOut } from '@/auth'
import { TRPCProvider } from '@/lib/trpc'

const menu = [
  { group: 'จัดการข้อมูล', items: [
    { href: '/manage/calendar', label: 'ปฏิทิน', icon: '📅' },
    { href: '/manage/pricing', label: 'ปรับราคา', icon: '💰' },
    { href: '/manage/listings', label: 'ลิสติ้งที่พัก', icon: '🏠' },
    { href: '/manage/postpone', label: 'เลื่อนวันเข้าพัก', icon: '🔁' },
    { href: '/manage/housekeeper', label: 'House Keeper', icon: '🧹' },
    { href: '/manage/coupons', label: 'คูปอง', icon: '🎟️' },
    { href: '/manage/accounting', label: 'ด้านบัญชี', icon: '📊' },
  ]},
  { group: 'รายงาน', items: [
    { href: '/manage/dashboard', label: 'แดชบอร์ด', icon: '📈' },
    { href: '/manage/transactions', label: 'ประวัติการทำรายการ', icon: '📜' },
  ]},
  { group: 'อื่นๆ', items: [
    { href: '/manage/payout-channels', label: 'ช่องทางรับเงิน', icon: '🏦' },
  ]},
]

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { name?: string | null; email?: string | null }

  return (
    <TRPCProvider>
      <div className="flex min-h-screen bg-gray-50">
        <aside className="w-64 shrink-0 border-r border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-5">
            <Link href="/manage/dashboard" className="text-lg font-bold text-blue-600">
              PMS Pool Villa
            </Link>
          </div>
          <nav className="px-3 py-4">
            {menu.map((group) => (
              <div key={group.group} className="mb-4">
                <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {group.group}
                </div>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <span className="text-base">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
            <div />
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">สวัสดี, {user.name ?? user.email}</span>
              <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
                <button className="text-sm text-gray-600 hover:text-gray-900" type="submit">
                  ออกจากระบบ
                </button>
              </form>
            </div>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </TRPCProvider>
  )
}
