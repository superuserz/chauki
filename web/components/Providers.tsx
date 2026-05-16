'use client'
import '@/i18n'
import { Header } from './Header'
import { Toast } from './Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        {children}
      </main>
      <Toast />
    </>
  )
}
