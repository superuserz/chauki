'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/types/api'

export type LangStats = {
  dailyCurrentStreak: number
  dailyMaxStreak: number
  dailyWins: number
  dailyPlayed: number
  dailyDistribution: [number, number, number, number, number, number]
  practiceWins: number
  practicePlayed: number
  lastDailyDateUtc: string | null
  lastDailySolvedDateUtc: string | null
  recentPracticeWordIds: string[]
}

const emptyLangStats = (): LangStats => ({
  dailyCurrentStreak: 0,
  dailyMaxStreak: 0,
  dailyWins: 0,
  dailyPlayed: 0,
  dailyDistribution: [0, 0, 0, 0, 0, 0],
  practiceWins: 0,
  practicePlayed: 0,
  lastDailyDateUtc: null,
  lastDailySolvedDateUtc: null,
  recentPracticeWordIds: [],
})

type StatsStore = {
  hi: LangStats
  en: LangStats
  recordDailyResult: (lang: Language, won: boolean, attemptsUsed: number, dateUtc: string) => void
  recordPracticeResult: (lang: Language, won: boolean, wordText: string | null) => void
  hasCompletedDailyToday: (lang: Language, dateUtc: string) => boolean
}

function isYesterday(prev: string | null, today: string): boolean {
  if (!prev) return false
  const prevDate = new Date(prev + 'T00:00:00Z')
  const todayDate = new Date(today + 'T00:00:00Z')
  return todayDate.getTime() - prevDate.getTime() === 86_400_000
}

export const useStatsStore = create<StatsStore>()(
  persist(
    (set, get) => ({
      hi: emptyLangStats(),
      en: emptyLangStats(),

      recordDailyResult: (lang, won, attemptsUsed, dateUtc) => {
        const cur = get()[lang]
        if (cur.lastDailyDateUtc === dateUtc) return
        const next = { ...cur }
        next.dailyPlayed += 1
        next.lastDailyDateUtc = dateUtc
        if (won) {
          next.dailyWins += 1
          const idx = Math.max(0, Math.min(5, attemptsUsed - 1))
          const dist = [...cur.dailyDistribution] as LangStats['dailyDistribution']
          dist[idx] += 1
          next.dailyDistribution = dist
          next.dailyCurrentStreak = isYesterday(cur.lastDailySolvedDateUtc, dateUtc)
            ? cur.dailyCurrentStreak + 1
            : 1
          next.dailyMaxStreak = Math.max(cur.dailyMaxStreak, next.dailyCurrentStreak)
          next.lastDailySolvedDateUtc = dateUtc
        } else {
          next.dailyCurrentStreak = 0
        }
        set({ [lang]: next } as Pick<StatsStore, 'hi' | 'en'>)
      },

      recordPracticeResult: (lang, won, wordText) => {
        const cur = get()[lang]
        const next = { ...cur }
        next.practicePlayed += 1
        if (won) next.practiceWins += 1
        if (wordText) {
          const recent = [wordText, ...cur.recentPracticeWordIds.filter((id) => id !== wordText)]
          next.recentPracticeWordIds = recent.slice(0, 50)
        }
        set({ [lang]: next } as Pick<StatsStore, 'hi' | 'en'>)
      },

      hasCompletedDailyToday: (lang, dateUtc) => get()[lang].lastDailyDateUtc === dateUtc,
    }),
    { name: 'chauki:stats' }
  )
)
