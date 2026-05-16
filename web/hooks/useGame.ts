'use client'
import { useGameStore } from '@/stores/gameStore'

export function useGame() {
  return useGameStore((s) => ({
    status: s.status,
    lang: s.lang,
    mode: s.mode,
    puzzleId: s.puzzleId,
    dailyNumber: s.dailyNumber,
    guesses: s.guesses,
    currentInput: s.currentInput,
    attemptsRemaining: s.attemptsRemaining,
    revealedWord: s.revealedWord,
    invalidShake: s.invalidShake,
  }))
}
