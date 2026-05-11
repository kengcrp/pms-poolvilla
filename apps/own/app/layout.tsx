import type { Metadata } from 'next'
import { Inter, Noto_Sans_Thai } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const thai = Noto_Sans_Thai({ variable: '--font-thai', subsets: ['thai'] })

export const metadata: Metadata = {
  title: 'PMS Pool Villa',
  description: 'ระบบจัดการที่พักสำหรับเจ้าของวิลล่า',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${inter.variable} ${thai.variable} h-full antialiased`}>
      <body className="min-h-full font-[var(--font-thai)]">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
