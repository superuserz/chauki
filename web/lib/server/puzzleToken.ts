import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import type { Language } from '@/types/api'

type PracticePayload = {
  letters: string[]
  lang: Language
  exp: number
}

const PRACTICE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getKey(): Buffer {
  const seed = process.env.CHAUKI_SEED ?? 'dev-only-do-not-use-in-production'
  return createHash('sha256').update(seed).digest()
}

export function encryptPracticeToken(letters: string[], lang: Language): string {
  const payload: PracticePayload = { letters, lang, exp: Date.now() + PRACTICE_TTL_MS }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const data = Buffer.from(JSON.stringify(payload), 'utf8')
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64url')
}

export function decryptPracticeToken(token: string): PracticePayload | null {
  try {
    const buf = Buffer.from(token, 'base64url')
    if (buf.length < 29) return null
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const encrypted = buf.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', getKey(), iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    const payload = JSON.parse(decrypted.toString('utf8')) as PracticePayload
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
