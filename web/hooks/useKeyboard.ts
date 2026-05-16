'use client'
import { useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'

export function useKeyboard() {
  const lang = useGameStore((s) => s.lang)
  const status = useGameStore((s) => s.status)

  useEffect(() => {
    if (lang !== 'en' || status !== 'playing') return
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Enter') {
        void useGameStore.getState().submitGuess()
        e.preventDefault()
        return
      }
      if (e.key === 'Backspace') {
        useGameStore.getState().removeLast()
        e.preventDefault()
        return
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        useGameStore.getState().appendKey(e.key)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lang, status])
}
