'use client'
import { create } from 'zustand'
import { api, ApiClientError } from '@/lib/api'
import { appendHindiKey, splitWord } from '@/lib/akshara'
import { utcDateString } from '@/lib/time'
import type { GameMode, Language, LetterStatus } from '@/types/api'
import { useStatsStore } from './statsStore'
import { useToastStore } from './toastStore'

const MAX_ATTEMPTS = 6
const WORD_LENGTH = 5

export type GameStatus = 'picking' | 'loading' | 'playing' | 'won' | 'lost'

export type Guess = { letters: string[]; statuses: LetterStatus[] }

type GameStore = {
  status: GameStatus
  lang: Language | null
  mode: GameMode | null
  puzzleId: string | null
  dailyNumber: number | null
  resetsAtUtc: string | null
  guesses: Guess[]
  currentInput: string[]
  attemptsRemaining: number
  revealedWord: string | null
  invalidShake: boolean

  startRound: (opts: { lang: Language; mode: GameMode }) => Promise<void>
  appendKey: (key: string) => void
  removeLast: () => void
  submitGuess: () => Promise<void>
  reset: () => void
}

const initial = {
  status: 'picking' as GameStatus,
  lang: null,
  mode: null,
  puzzleId: null,
  dailyNumber: null,
  resetsAtUtc: null,
  guesses: [],
  currentInput: [],
  attemptsRemaining: MAX_ATTEMPTS,
  revealedWord: null,
  invalidShake: false,
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initial,

  reset: () => set({ ...initial }),

  startRound: async ({ lang, mode }) => {
    set({ ...initial, status: 'loading', lang, mode })
    try {
      const puzzle =
        mode === 'daily'
          ? await api.todayPuzzle(lang)
          : await api.practicePuzzle(lang, useStatsStore.getState()[lang].recentPracticeWordIds)
      set({
        status: 'playing',
        puzzleId: puzzle.puzzleId,
        dailyNumber: puzzle.dailyNumber ?? null,
        resetsAtUtc: puzzle.resetsAtUtc ?? null,
      })
    } catch (err) {
      useToastStore.getState().show(err instanceof ApiClientError ? err.message : 'Network error')
      set({ status: 'picking' })
    }
  },

  appendKey: (key) => {
    const { status, currentInput, lang } = get()
    if (status !== 'playing') return
    if (lang === 'hi') {
      const next = appendHindiKey(currentInput, key)
      if (next.length > WORD_LENGTH) return
      set({ currentInput: next })
    } else {
      if (currentInput.length >= WORD_LENGTH) return
      set({ currentInput: [...currentInput, key.toLowerCase()] })
    }
  },

  removeLast: () => {
    const { status, currentInput } = get()
    if (status !== 'playing' || currentInput.length === 0) return
    set({ currentInput: currentInput.slice(0, -1) })
  },

  submitGuess: async () => {
    const { status, currentInput, lang, puzzleId, guesses, mode } = get()
    if (status !== 'playing' || !lang || !puzzleId || !mode) return
    if (currentInput.length !== WORD_LENGTH) {
      shake(set)
      useToastStore.getState().show(currentInput.length === 0 ? 'Type a word' : 'Not enough letters')
      return
    }
    const guessText = currentInput.join('')
    const attemptIndex = guesses.length

    try {
      const res = await api.guess({ puzzleId, guess: guessText, attemptIndex })
      const guessRow: Guess = { letters: [...currentInput], statuses: res.statuses }
      const nextGuesses = [...guesses, guessRow]
      const dateUtc = utcDateString()

      if (res.isSolved) {
        set({
          status: 'won',
          guesses: nextGuesses,
          currentInput: [],
          attemptsRemaining: res.attemptsRemaining,
          revealedWord: res.revealedWord ?? guessText,
        })
        if (mode === 'daily') {
          useStatsStore.getState().recordDailyResult(lang, true, res.attemptsUsed, dateUtc)
        } else {
          useStatsStore.getState().recordPracticeResult(lang, true, res.revealedWord)
        }
      } else if (res.attemptsRemaining === 0) {
        set({
          status: 'lost',
          guesses: nextGuesses,
          currentInput: [],
          attemptsRemaining: 0,
          revealedWord: res.revealedWord,
        })
        if (mode === 'daily') {
          useStatsStore.getState().recordDailyResult(lang, false, res.attemptsUsed, dateUtc)
        } else {
          useStatsStore.getState().recordPracticeResult(lang, false, res.revealedWord)
        }
      } else {
        set({ guesses: nextGuesses, currentInput: [], attemptsRemaining: res.attemptsRemaining })
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.apiError.code === 'INVALID_WORD' || err.apiError.code === 'INVALID_GUESS_FORMAT') {
          shake(set)
          useToastStore.getState().show('Not in word list')
          return
        }
        useToastStore.getState().show(err.message)
      } else {
        useToastStore.getState().show('Network error')
      }
    }
  },
}))

function shake(set: (partial: Partial<GameStore>) => void) {
  set({ invalidShake: true })
  setTimeout(() => set({ invalidShake: false }), 400)
}

export const _internal = { MAX_ATTEMPTS, WORD_LENGTH, splitWord }
