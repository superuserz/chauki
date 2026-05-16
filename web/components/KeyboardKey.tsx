'use client'
import type { LetterStatus } from '@/types/api'

type Width = 'normal' | 'wide'

const colorByStatus: Record<LetterStatus, string> = {
  CORRECT: 'bg-tile-correct text-white',
  PRESENT: 'bg-tile-present text-white',
  ABSENT: 'bg-tile-absent text-white',
}

type Props = {
  symbol: string
  label?: string
  width?: Width
  status?: LetterStatus | null
  onPress: () => void
}

export function KeyboardKey({ symbol, label, width = 'normal', status, onPress }: Props) {
  const widthClass = width === 'wide' ? 'flex-[1.5]' : 'flex-1'
  const colorClass = status ? colorByStatus[status] : 'bg-bg-panel text-white'
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label ?? symbol}
      className={`${widthClass} ${colorClass} rounded-md min-h-[48px] text-base font-semibold active:opacity-80`}
    >
      {symbol}
    </button>
  )
}
