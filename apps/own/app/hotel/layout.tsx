import { TRPCProvider } from '@/lib/trpc'

export default function HotelLayout({ children }: { children: React.ReactNode }) {
  return <TRPCProvider>{children}</TRPCProvider>
}
