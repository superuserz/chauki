export type Language = 'hi' | 'en'
export type GameMode = 'daily' | 'practice'
export type LetterStatus = 'CORRECT' | 'PRESENT' | 'ABSENT'
export type PuzzleMode = 'DAILY' | 'PRACTICE'

export type ApiEnvelope<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: ApiError }

export type ApiError = {
  code:
    | 'INVALID_LANGUAGE'
    | 'INVALID_GUESS_FORMAT'
    | 'INVALID_WORD'
    | 'INVALID_EXCLUDE_LIST'
    | 'PUZZLE_NOT_FOUND'
    | 'RATE_LIMITED'
    | 'INTERNAL'
  message: string
  details?: Record<string, unknown>
}

export type PuzzleResponse = {
  puzzleId: string
  mode: PuzzleMode
  lang: Language
  length: number
  dailyNumber?: number
  resetsAtUtc?: string
}

export type GuessRequest = {
  puzzleId: string
  guess: string
  attemptIndex: number
}

export type GuessResponse = {
  statuses: LetterStatus[]
  isSolved: boolean
  attemptsUsed: number
  attemptsRemaining: number
  revealedWord: string | null
}

export type PracticePuzzleRequest = {
  lang: Language
  excludeRecent?: string[]
}

export type HealthResponse = {
  status: 'ok'
  service: string
  version: string
  uptimeSeconds: number
}
