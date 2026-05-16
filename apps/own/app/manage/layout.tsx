import { redirect } from 'next/navigation'
import { auth, signOut } from '@/auth'
import { TRPCProvider } from '@/lib/trpc'
import { Sidebar } from '@/components/Sidebar'
import { Icon } from '@pms/ui'

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
                  <Icon name="logout" className="size-4" />
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
