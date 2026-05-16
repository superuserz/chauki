import { createHash, createHmac } from 'crypto'
import { getDailyPool } from './words'
import type { Language } from '@/types/api'

const LAUNCH_DATE = new Date('2026-05-16T00:00:00Z')

function seed(): string {
  return process.env.CHAUKI_SEED ?? 'dev-only-do-not-use-in-production'
}

function wordId(lang: Language, text: string): string {
  const hash = createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex')
  return `${lang}:${hash.slice(0, 16)}`
}

export function selectDailyWord(dateStr: string, lang: Language) {
  const pool = getDailyPool(lang)
  if (pool.length === 0) throw new Error(`Daily pool empty for lang=${lang}`)

  // Sort by SHA-256 word ID, matching the Java implementation's Comparator.comparing(id)
  const sorted = [...pool]
    .map((w) => ({ ...w, id: wordId(lang, w.text) }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  // HMAC-SHA256: message = "YYYY-MM-DD:HI" (uppercase lang, matching Java lang.name())
  const msg = `${dateStr}:${lang.toUpperCase()}`
  const mac = createHmac('sha256', Buffer.from(seed(), 'utf8'))
  mac.update(Buffer.from(msg, 'utf8'))
  const sig = mac.digest()

  // First 8 bytes as signed 64-bit BE, mask sign bit — mirrors Java's & Long.MAX_VALUE
  const n = sig.readBigInt64BE(0) & BigInt('0x7FFFFFFFFFFFFFFF')
  const idx = Number(n % BigInt(sorted.length))
  return sorted[idx]
}

export function computeDailyNumber(dateStr: string): number {
  const today = new Date(`${dateStr}T00:00:00Z`)
  const days = Math.floor((today.getTime() - LAUNCH_DATE.getTime()) / 86_400_000)
  return Math.max(1, days + 1)
}

export function nextUtcMidnightIso(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString()
}
