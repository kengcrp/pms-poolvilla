import { TRPCProvider } from '@/lib/trpc'

export default function SaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <div className="min-h-screen bg-gradient-to-b from-white to-brand-50/30">{children}</div>
    </TRPCProvider>
  )
}
