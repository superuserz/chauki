import { NextRequest, NextResponse } from 'next/server'
import { selectDailyWord, computeDailyNumber, nextUtcMidnightIso } from '@/lib/server/daily'
import type { Language } from '@/types/api'

export function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get('lang') as Language | null
  if (lang !== 'hi' && lang !== 'en') {
    return NextResponse.json(
      { error: { code: 'INVALID_LANGUAGE', message: 'lang must be hi or en' } },
      { status: 400 }
    )
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const word = selectDailyWord(dateStr, lang)
  const dailyNumber = computeDailyNumber(dateStr)
  const resetsAtUtc = nextUtcMidnightIso(dateStr)
  const puzzleId = `daily:${dateStr}:${lang}`

  return NextResponse.json({
    data: {
      puzzleId,
      mode: 'DAILY',
      lang,
      length: word.letters.length,
      dailyNumber,
      resetsAtUtc,
    },
  })
}
