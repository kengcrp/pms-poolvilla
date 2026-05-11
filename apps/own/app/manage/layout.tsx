import { redirect } from 'next/navigation'
import { auth, signOut } from '@/auth'
import { TRPCProvider } from '@/lib/trpc'
import { Sidebar } from '@/components/Sidebar'

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { name?: string | null; email?: string | null }

  return (
    <TRPCProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur-md">
            <div />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-200">
                <div className="flex size-6 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
                  {user.name?.[0]?.toUpperCase() ?? 'O'}
                </div>
                <span className="text-gray-700">{user.name ?? user.email}</span>
              </div>
              <form
                action={async () => {
                  'use server'
                  await signOut({ redirectTo: '/login' })
                }}
              >
                <button
                  type="submit"
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  title="ออกจากระบบ"
                >
                  <svg className="size-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" /><path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" /></svg>
                </button>
              </form>
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </TRPCProvider>
  )
}
