import { NextRequest, NextResponse } from 'next/server'
import { pickPracticeWord } from '@/lib/server/practice'
import { encryptPracticeToken } from '@/lib/server/puzzleToken'
import type { Language } from '@/types/api'

export async function POST(req: NextRequest) {
  let body: { lang?: unknown; excludeRecent?: unknown }
  try {
    body = (await req.json()) as { lang?: unknown; excludeRecent?: unknown }
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const lang = body.lang as Language | undefined
  if (lang !== 'hi' && lang !== 'en') {
    return NextResponse.json(
      { error: { code: 'INVALID_LANGUAGE', message: 'lang must be hi or en' } },
      { status: 400 }
    )
  }

  const excludeRecent = Array.isArray(body.excludeRecent)
    ? (body.excludeRecent as string[]).filter((x) => typeof x === 'string').slice(0, 50)
    : []

  const word = pickPracticeWord(lang, excludeRecent)
  const token = encryptPracticeToken(word.letters, lang)
  const puzzleId = `practice.${token}`

  return NextResponse.json({
    data: {
      puzzleId,
      mode: 'PRACTICE',
      lang,
      length: word.letters.length,
    },
  })
}
