'use client'
import { motion } from 'framer-motion'
import { Tile } from './Tile'
import type { LetterStatus } from '@/types/api'

const ROWS = 6
const COLS = 5

type TileGridProps = {
  guesses: Array<{ letters: string[]; statuses: LetterStatus[] }>
  currentInput: string[]
  invalidShake: boolean
  lang: 'hi' | 'en' | null
}

export function TileGrid({ guesses, currentInput, invalidShake, lang }: TileGridProps) {
  const fontClass = lang === 'hi' ? 'font-deva' : 'font-latin'
  return (
    <div className={`grid grid-rows-6 gap-1.5 mx-auto w-full max-w-xs p-3 ${fontClass}`}>
      {Array.from({ length: ROWS }).map((_, rowIdx) => {
        const isCurrent = rowIdx === guesses.length
        const rowGuess = guesses[rowIdx]
        return (
          <motion.div
            key={rowIdx}
            className="grid grid-cols-5 gap-1.5"
            animate={isCurrent && invalidShake ? { x: [0, -10, 10, -8, 8, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
          >
            {Array.from({ length: COLS }).map((__, colIdx) => {
              if (rowGuess) {
                return (
                  <Tile
                    key={colIdx}
                    letter={rowGuess.letters[colIdx] ?? null}
                    status={rowGuess.statuses[colIdx] ?? 'pending'}
                    flipDelayMs={colIdx * 300}
                  />
                )
              }
              if (isCurrent) {
                const ch = currentInput[colIdx] ?? null
                return <Tile key={colIdx} letter={ch} status={ch ? 'editing' : 'pending'} />
              }
              return <Tile key={colIdx} letter={null} status="pending" />
            })}
          </motion.div>
        )
      })}
    </div>
  )
}
