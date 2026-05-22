import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth, signOut } from '@/auth'
import { TRPCProvider } from '@/lib/trpc'
import { AdminShell } from '@/components/AdminShell'

export const metadata: Metadata = {
  title: {
    default: 'Company Manage',
    template: '%s | Company Manage',
  },
  description: 'ระบบจัดการสำหรับบริษัท / Admin',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as {
    name?: string | null
    email?: string | null
    role?: string
  }
  const displayName = user.name ?? user.email ?? 'Admin'
  const initial = displayName[0]?.toUpperCase() ?? 'A'
  const role = user.role ?? 'STAFF'

  async function signOutAction() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <TRPCProvider>
      <AdminShell
        userName={displayName}
        userInitial={initial}
        userRole={role}
        signOutAction={signOutAction}
      >
        {children}
      </AdminShell>
    </TRPCProvider>
  )
}
