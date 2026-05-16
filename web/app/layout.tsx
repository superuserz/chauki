import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chauki — Bilingual Wordle',
  description: 'A word a day, play as much as you want.',
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
