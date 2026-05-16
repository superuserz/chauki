'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '@/stores/gameStore'

export function Header() {
  const { t } = useTranslation()
  const lang = useGameStore((s) => s.lang)
  return (
    <header className="flex items-center justify-between border-b border-bg-panel px-4 py-3">
      <Link href="/" className="text-lg font-semibold tracking-wide">
        {t('app.name')}
      </Link>
      <div className="flex items-center gap-3">
        {lang && (
          <span className="rounded-full bg-bg-panel px-2 py-0.5 text-xs uppercase">
            {lang === 'hi' ? 'हि' : 'EN'}
          </span>
        )}
        <Link href="/stats" aria-label="Stats" className="text-sm opacity-70 hover:opacity-100">
          ☰
        </Link>
      </div>
    </header>
  )
}
