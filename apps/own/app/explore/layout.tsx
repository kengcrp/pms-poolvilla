import { TRPCProvider } from '@/lib/trpc'

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <TRPCProvider>{children}</TRPCProvider>
}
