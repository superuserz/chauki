import wordsHiRaw from '@/data/words-hi.json'
import wordsHiDailyRaw from '@/data/words-hi-daily.json'
import wordsEnRaw from '@/data/words-en.json'
import wordsEnDailyRaw from '@/data/words-en-daily.json'
import { splitHindi, splitEnglish } from '@/lib/akshara'
import type { Language } from '@/types/api'

type RawEntry = { text: string; frequencyRank: number }

type Word = { text: string; letters: string[] }

function processEntries(entries: RawEntry[], lang: Language): Word[] {
  const splitter = lang === 'hi' ? splitHindi : splitEnglish
  return entries
    .map((e) => {
      const text = e.text.normalize('NFC')
      return { text, letters: splitter(text) }
    })
    .filter((w) => w.letters.length === 5)
}

const dailyHi = processEntries(wordsHiDailyRaw as RawEntry[], 'hi')
const dailyEn = processEntries(wordsEnDailyRaw as RawEntry[], 'en')

const allHi = processEntries(
  [...(wordsHiRaw as RawEntry[]), ...(wordsHiDailyRaw as RawEntry[])],
  'hi'
)
const allEn = processEntries(
  [...(wordsEnRaw as RawEntry[]), ...(wordsEnDailyRaw as RawEntry[])],
  'en'
)

const dictHi = new Set(allHi.map((w) => w.text))
const dictEn = new Set(allEn.map((w) => w.text))

export function getDailyPool(lang: Language): Word[] {
  return lang === 'hi' ? dailyHi : dailyEn
}

export function getAllWords(lang: Language): Word[] {
  return lang === 'hi' ? allHi : allEn
}

export function wordExists(lang: Language, normalizedText: string): boolean {
  return lang === 'hi' ? dictHi.has(normalizedText) : dictEn.has(normalizedText)
}
