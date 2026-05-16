'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { i18n } from '@/i18n'
import type { Language } from '@/types/api'

type I18nStore = {
  uiLang: Language
  setUiLang: (l: Language) => void
}

export const useI18nStore = create<I18nStore>()(
  persist(
    (set) => ({
      uiLang: (typeof navigator !== 'undefined' &&
      navigator.language?.toLowerCase().startsWith('hi')
        ? 'hi'
        : 'en') as Language,
      setUiLang: (l) => {
        void i18n.changeLanguage(l)
        set({ uiLang: l })
      },
    }),
    { name: 'chauki:i18n' }
  )
)
