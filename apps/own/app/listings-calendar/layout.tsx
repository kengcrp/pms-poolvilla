import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { TRPCProvider } from '@/lib/trpc'

export const metadata: Metadata = {
  title: 'ปฏิทินรวมทั้งหมด',
  description: 'มุมมองรวมปฏิทินที่พักทุกหลัง — share-friendly view',
}

/**
 * Minimal layout for the public-style "all listings calendar" view.
 * - Still requires owner auth (data is private to the owner)
 * - Renders WITHOUT the ManageShell sidebar/header so the page can be
 *   screenshotted / shared with a clean look (no nav clutter).
 */
export default async function ListingsCalendarLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <TRPCProvider>
      <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">{children}</main>
    </TRPCProvider>
  )
}
