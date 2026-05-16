'use client'
import { motion } from 'framer-motion'
import type { LetterStatus } from '@/types/api'

type TileProps = {
  letter: string | null
  status: LetterStatus | 'pending' | 'editing'
  flipDelayMs?: number
}

const colorByStatus: Record<LetterStatus, string> = {
  CORRECT: 'bg-tile-correct border-tile-correct text-white',
  PRESENT: 'bg-tile-present border-tile-present text-white',
  ABSENT: 'bg-tile-absent border-tile-absent text-white',
}

export function Tile({ letter, status, flipDelayMs = 0 }: TileProps) {
  const isGraded = status === 'CORRECT' || status === 'PRESENT' || status === 'ABSENT'
  const baseClass =
    'flex items-center justify-center border-2 aspect-square w-full text-2xl font-bold uppercase select-none'
  const editClass =
    status === 'editing'
      ? 'border-tile-edit text-white'
      : status === 'pending'
        ? 'border-bg-panel text-transparent'
        : ''
  const gradedClass = isGraded ? colorByStatus[status as LetterStatus] : ''

  return (
    <motion.div
      className={`${baseClass} ${editClass} ${gradedClass}`}
      initial={isGraded ? { rotateX: 0 } : false}
      animate={
        isGraded
          ? { rotateX: [0, 90, 0] }
          : { scale: status === 'editing' ? [1, 1.05, 1] : 1 }
      }
      transition={
        isGraded
          ? { duration: 0.5, delay: flipDelayMs / 1000, times: [0, 0.5, 1] }
          : { duration: 0.08 }
      }
      aria-label={letter ?? 'empty'}
    >
      {letter ?? ''}
    </motion.div>
  )
}
