import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth, signOut } from '@/auth'
import { TRPCProvider } from '@/lib/trpc'
import { ManageShell } from '@/components/ManageShell'

export const metadata: Metadata = {
  title: {
    default: 'Owner Manager',
    template: '%s | Owner Manager',
  },
  description: 'ระบบจัดการที่พัก/โรงแรมสำหรับเจ้าของ',
}

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { name?: string | null; email?: string | null }
  const displayName = user.name ?? user.email ?? 'User'
  const initial = displayName[0]?.toUpperCase() ?? 'U'

  async function signOutAction() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <TRPCProvider>
      <ManageShell userName={displayName} userInitial={initial} signOutAction={signOutAction}>
        {children}
      </ManageShell>
    </TRPCProvider>
  )
}
