import type { Language } from '@/types/api'

// Mirror of api/.../AksharaUtil.java. Keep regex identical.
const AKSHARA_RE =
  /(?:[क-ह़](?:्[क-ह])*[ा-ौ]?[ंः]?)|[अ-औ][ंः]?|./gu

export function splitHindi(word: string): string[] {
  const normalized = word.normalize('NFC')
  const matches = normalized.match(AKSHARA_RE)
  return matches ? matches.filter((s) => s.trim().length > 0) : []
}

export function splitEnglish(word: string): string[] {
  return word.toLowerCase().split('')
}

export function splitWord(lang: Language, word: string): string[] {
  return lang === 'hi' ? splitHindi(word) : splitEnglish(word)
}

export function joinLetters(letters: string[]): string {
  return letters.join('')
}

export function isHindiMatra(ch: string): boolean {
  if (ch.length !== 1) return false
  const code = ch.charCodeAt(0)
  return (
    (code >= 0x093e && code <= 0x094c) ||
    code === 0x0902 ||
    code === 0x0903 ||
    code === 0x094d
  )
}

export function isHindiConsonant(ch: string): boolean {
  if (ch.length !== 1) return false
  const code = ch.charCodeAt(0)
  return code >= 0x0915 && code <= 0x0939
}

export function isHindiVowel(ch: string): boolean {
  if (ch.length !== 1) return false
  const code = ch.charCodeAt(0)
  return code >= 0x0905 && code <= 0x0914
}

export function appendHindiKey(buffer: string[], key: string): string[] {
  if (isHindiMatra(key) && buffer.length > 0) {
    const last = buffer[buffer.length - 1]
    return [...buffer.slice(0, -1), last + key]
  }
  return [...buffer, key]
}
