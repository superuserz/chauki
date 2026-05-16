import { getAllWords } from './words'
import type { Language } from '@/types/api'

export function pickPracticeWord(lang: Language, excludeRecent: string[]) {
  const excluded = new Set(excludeRecent.map((t) => t.normalize('NFC')))
  const pool = getAllWords(lang).filter((w) => !excluded.has(w.text))
  const source = pool.length > 0 ? pool : getAllWords(lang)
  return source[Math.floor(Math.random() * source.length)]
}
