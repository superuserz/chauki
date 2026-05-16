'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '@/stores/gameStore'
import { useStatsStore } from '@/stores/statsStore'
import { useI18nStore } from '@/stores/i18nStore'
import { utcDateString } from '@/lib/time'
import type { GameMode, Language } from '@/types/api'

export default function HomePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const startRound = useGameStore((s) => s.startRound)
  const setUiLang = useI18nStore((s) => s.setUiLang)
  const stats = useStatsStore()

  const [lang, setLang] = useState<Language>(useI18nStore.getState().uiLang)
  const [mode, setMode] = useState<GameMode>('daily')

  const today = utcDateString()
  const dailyDone = stats.hasCompletedDailyToday(lang, today)

  const onStart = async () => {
    setUiLang(lang)
    router.push('/play')
    await startRound({ lang, mode })
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight font-deva">{t('app.name')}</h1>
        <p className="mt-2 text-sm opacity-70">{t('app.tagline')}</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <label className="text-xs uppercase opacity-60">{t('picker.languageLabel')}</label>
        <div className="flex gap-2">
          <LangButton active={lang === 'hi'} onClick={() => setLang('hi')} label="हिन्दी" font="font-deva" />
          <LangButton active={lang === 'en'} onClick={() => setLang('en')} label="English" font="font-latin" />
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <label className="text-xs uppercase opacity-60">{t('picker.modeLabel')}</label>
        <div className="flex gap-2">
          <ModeButton
            active={mode === 'daily'}
            onClick={() => setMode('daily')}
            label={t('picker.daily')}
            badge={dailyDone ? t('picker.dailyDoneBadge') : undefined}
          />
          <ModeButton
            active={mode === 'practice'}
            onClick={() => setMode('practice')}
            label={t('picker.practice')}
          />
        </div>
      </div>

      <button
        className="w-full max-w-xs rounded-md bg-tile-correct py-3 font-semibold text-white"
        onClick={() => void onStart()}
      >
        {t('picker.start')}
      </button>
    </div>
  )
}

function LangButton({
  active, onClick, label, font,
}: {
  active: boolean; onClick: () => void; label: string; font: string
}) {
  return (
    <button
      onClick={onClick}
      className={`${font} flex-1 rounded-md py-4 text-xl border-2 ${
        active ? 'border-tile-correct bg-tile-correct/10' : 'border-bg-panel'
      }`}
    >
      {label}
    </button>
  )
}

function ModeButton({
  active, onClick, label, badge,
}: {
  active: boolean; onClick: () => void; label: string; badge?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md py-3 text-base border-2 relative ${
        active ? 'border-tile-correct bg-tile-correct/10' : 'border-bg-panel'
      }`}
    >
      {label}
      {badge && (
        <span className="absolute -right-2 -top-2 rounded-full bg-tile-present px-2 py-0.5 text-[10px] font-semibold">
          {badge}
        </span>
      )}
    </button>
  )
}
