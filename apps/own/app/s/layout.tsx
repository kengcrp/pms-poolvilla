/**
 * Public sale-page layout — no auth, no sidebar shell, but provides TRPCProvider
 * so client components inside /s/* can use trpc.useQuery hooks.
 */

import { TRPCProvider } from '@/lib/trpc'

export default function SalePageLayout({ children }: { children: React.ReactNode }) {
  return <TRPCProvider>{children}</TRPCProvider>
}
