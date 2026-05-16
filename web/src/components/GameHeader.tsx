import type { Language, GameMode } from '@/types/api';

type Props = {
  mode: GameMode;
  lang: Language;
  dailyNumber?: number | null;
  attemptsRemaining: number;
};

export function GameHeader({ mode, lang, dailyNumber, attemptsRemaining }: Props) {
  const label =
    mode === 'daily'
      ? `Daily${dailyNumber ? ' #' + dailyNumber : ''}`
      : 'Practice';
  const langBadge = lang === 'hi' ? 'हि' : 'EN';
  const dots = Array.from({ length: 6 }, (_, i) =>
    i < attemptsRemaining ? '●' : '○'
  ).join(' ');
  return (
    <div className="flex items-center justify-between px-4 py-2 text-sm opacity-80">
      <span>
        {label} · {langBadge}
      </span>
      <span aria-label={`${attemptsRemaining} attempts remaining`}>{dots}</span>
    </div>
  );
}
