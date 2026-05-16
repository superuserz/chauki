import { NextRequest, NextResponse } from 'next/server'
import { selectDailyWord } from '@/lib/server/daily'
import { decryptPracticeToken } from '@/lib/server/puzzleToken'
import { wordExists } from '@/lib/server/words'
import { splitWord } from '@/lib/akshara'
import { grade } from '@/lib/grade'
import type { Language } from '@/types/api'

const MAX_ATTEMPTS = 6

export async function POST(req: NextRequest) {
  let body: { puzzleId?: unknown; guess?: unknown; attemptIndex?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const { puzzleId, guess, attemptIndex } = body
  if (typeof puzzleId !== 'string' || typeof guess !== 'string' || typeof attemptIndex !== 'number') {
    return NextResponse.json(
      { error: { code: 'INVALID_GUESS_FORMAT', message: 'Missing or invalid fields' } },
      { status: 400 }
    )
  }
  if (attemptIndex < 0 || attemptIndex >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: { code: 'INVALID_GUESS_FORMAT', message: 'attemptIndex out of range' } },
      { status: 400 }
    )
  }

  // Resolve puzzle to get answer letters + lang
  let answerLetters: string[]
  let lang: Language

  if (puzzleId.startsWith('daily:')) {
    // Format: daily:YYYY-MM-DD:hi
    const parts = puzzleId.split(':')
    if (parts.length !== 3) {
      return NextResponse.json(
        { error: { code: 'PUZZLE_NOT_FOUND', message: 'Invalid puzzle ID' } },
        { status: 404 }
      )
    }
    const dateStr = parts[1]
    lang = parts[2] as Language
    if (lang !== 'hi' && lang !== 'en') {
      return NextResponse.json(
        { error: { code: 'PUZZLE_NOT_FOUND', message: 'Invalid puzzle ID' } },
        { status: 404 }
      )
    }
    const word = selectDailyWord(dateStr, lang)
    answerLetters = word.letters
  } else if (puzzleId.startsWith('practice.')) {
    const token = puzzleId.slice('practice.'.length)
    const payload = decryptPracticeToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: { code: 'PUZZLE_NOT_FOUND', message: 'Puzzle expired or not found' } },
        { status: 404 }
      )
    }
    answerLetters = payload.letters
    lang = payload.lang
  } else {
    return NextResponse.json(
      { error: { code: 'PUZZLE_NOT_FOUND', message: 'Unknown puzzle ID format' } },
      { status: 404 }
    )
  }

  // Normalize and split guess
  const normalizedGuess = lang === 'hi' ? guess.normalize('NFC') : guess.toLowerCase()
  const guessLetters = splitWord(lang, normalizedGuess)

  if (guessLetters.length !== answerLetters.length) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_GUESS_FORMAT',
          message: `Guess must be ${answerLetters.length} letters; got ${guessLetters.length}`,
        },
      },
      { status: 422 }
    )
  }

  if (!wordExists(lang, normalizedGuess)) {
    return NextResponse.json(
      { error: { code: 'INVALID_WORD', message: 'Not in dictionary' } },
      { status: 422 }
    )
  }

  const statuses = grade(guessLetters, answerLetters)
  const isSolved = statuses.every((s) => s === 'CORRECT')
  const attemptsUsed = attemptIndex + 1
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - attemptsUsed)
  const revealedWord = isSolved || attemptsUsed >= MAX_ATTEMPTS ? answerLetters.join('') : null

  return NextResponse.json({
    data: { statuses, isSolved, attemptsUsed, attemptsRemaining, revealedWord },
  })
}
