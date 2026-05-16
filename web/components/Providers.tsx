'use client'
import '@/i18n'
import { Header } from './Header'
import { Toast } from './Toast'
import { PwaInit } from './PwaInit'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaInit />
      <Header />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        {children}
      </main>
      <Toast />
    </>
  )
}
