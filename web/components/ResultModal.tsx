'use client'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useCountdownToReset } from '@/hooks/useCountdownToReset'
import type { GameMode, Language } from '@/types/api'

type Props = {
  mode: GameMode
  outcome: 'won' | 'lost'
  lang: Language
  dailyNumber?: number | null
  attemptsUsed: number
  revealedWord: string
  onShare: () => void
  onPlayPractice: () => void
  onPlayAnotherPractice: () => void
  onClose: () => void
}

export function ResultModal({
  mode,
  outcome,
  lang,
  dailyNumber,
  attemptsUsed,
  revealedWord,
  onShare,
  onPlayPractice,
  onPlayAnotherPractice,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const { hours, minutes, seconds } = useCountdownToReset()
  const hms = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  const fontClass = lang === 'hi' ? 'font-deva' : 'font-latin'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-sm rounded-t-2xl bg-bg-panel p-6 text-white sm:rounded-2xl ${fontClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold">
          {outcome === 'won' ? t('result.won') : t('result.lost', { word: revealedWord })}
        </h2>
        <p className="mt-2 text-sm opacity-80">
          {mode === 'daily' ? `Daily${dailyNumber ? ' #' + dailyNumber : ''}` : 'Practice'} ·{' '}
          {lang === 'hi' ? 'हि' : 'EN'} · {attemptsUsed}/6
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {mode === 'daily' ? (
            <>
              <button
                className="w-full rounded-md bg-tile-correct py-2 font-semibold"
                onClick={onShare}
              >
                {t('result.share')}
              </button>
              <button
                className="w-full rounded-md border border-white/20 py-2"
                onClick={onPlayPractice}
              >
                {t('result.playPractice')}
              </button>
              <p className="mt-3 text-center text-xs opacity-70">
                {t('result.nextDailyIn', { hms })}
              </p>
            </>
          ) : (
            <>
              <button
                className="w-full rounded-md bg-tile-correct py-2 font-semibold"
                onClick={onPlayAnotherPractice}
              >
                {t('result.playAnother')}
              </button>
              <button
                className="w-full rounded-md border border-white/20 py-2"
                onClick={onClose}
              >
                {t('result.back')}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}
