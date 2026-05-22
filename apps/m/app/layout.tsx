import type { Metadata } from 'next'
import { Inter, Noto_Sans_Thai } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import './globals.css'

config.autoAddCss = false

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' })
const thai = Noto_Sans_Thai({
  variable: '--font-thai',
  subsets: ['thai'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'PMS Manager — Admin',
  description: 'ระบบจัดการสำหรับบริษัท / Admin',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${inter.variable} ${thai.variable}`}>
      <body className="min-h-screen">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
