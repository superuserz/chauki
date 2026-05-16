import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chauki — Bilingual Wordle',
  description: 'A word a day, play as much as you want.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Chauki',
  },
}

export const viewport: Viewport = {
  themeColor: '#121213',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex flex-col h-full bg-bg-dark text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
