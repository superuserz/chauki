import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { GameHeader } from '@/components/GameHeader';
import { Keyboard } from '@/components/Keyboard';
import { ResultModal } from '@/components/ResultModal';
import { TileGrid } from '@/components/TileGrid';
import { useGame } from '@/hooks/useGame';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useGameStore } from '@/stores/gameStore';
import type { LetterStatus } from '@/types/api';

export function Game() {
  const g = useGame();
  const appendKey = useGameStore((s) => s.appendKey);
  const removeLast = useGameStore((s) => s.removeLast);
  const submitGuess = useGameStore((s) => s.submitGuess);
  const startRound = useGameStore((s) => s.startRound);
  const reset = useGameStore((s) => s.reset);
  const [modalDismissed, setModalDismissed] = useState(false);

  useKeyboard();

  useEffect(() => {
    setModalDismissed(false);
  }, [g.status]);

  const letterStatuses = useMemo(() => deriveLetterStatuses(g.guesses), [g.guesses]);

  if (g.status === 'picking' || !g.lang || !g.mode) {
    return <Navigate to="/" replace />;
  }

  const showModal = (g.status === 'won' || g.status === 'lost') && !modalDismissed;

  return (
    <div className="flex flex-1 flex-col">
      <GameHeader
        mode={g.mode}
        lang={g.lang}
        dailyNumber={g.dailyNumber}
        attemptsRemaining={g.attemptsRemaining}
      />
      <div className="flex flex-1 flex-col justify-between">
        <TileGrid
          guesses={g.guesses}
          currentInput={g.currentInput}
          invalidShake={g.invalidShake}
          lang={g.lang}
        />
        <Keyboard
          lang={g.lang}
          letterStatuses={letterStatuses}
          onKey={appendKey}
          onEnter={() => void submitGuess()}
          onBackspace={removeLast}
        />
      </div>
      <AnimatePresence>
        {showModal && (
          <ResultModal
            mode={g.mode}
            outcome={g.status === 'won' ? 'won' : 'lost'}
            lang={g.lang}
            dailyNumber={g.dailyNumber}
            attemptsUsed={g.guesses.length}
            revealedWord={g.revealedWord ?? ''}
            onShare={() => void navigator.clipboard?.writeText(buildShareText(g))}
            onPlayPractice={() => void startRound({ lang: g.lang!, mode: 'practice' })}
            onPlayAnotherPractice={() => void startRound({ lang: g.lang!, mode: 'practice' })}
            onClose={() => {
              setModalDismissed(true);
              if (g.mode === 'practice') reset();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function deriveLetterStatuses(
  guesses: Array<{ letters: string[]; statuses: LetterStatus[] }>
): Map<string, LetterStatus> {
  const out = new Map<string, LetterStatus>();
  const rank: Record<LetterStatus, number> = { ABSENT: 0, PRESENT: 1, CORRECT: 2 };
  for (const g of guesses) {
    for (let i = 0; i < g.letters.length; i++) {
      const k = g.letters[i];
      const s = g.statuses[i];
      const prev = out.get(k);
      if (!prev || rank[s] > rank[prev]) out.set(k, s);
    }
  }
  return out;
}

function buildShareText(g: ReturnType<typeof useGame>): string {
  const label = g.mode === 'daily' ? `Chauki Daily${g.dailyNumber ? ' #' + g.dailyNumber : ''}` : 'Chauki Practice';
  const score = g.status === 'won' ? `${g.guesses.length}/6` : 'X/6';
  const grid = g.guesses
    .map((row) =>
      row.statuses
        .map((s) => (s === 'CORRECT' ? '🟩' : s === 'PRESENT' ? '🟨' : '⬛'))
        .join('')
    )
    .join('\n');
  return `${label} ${score}\n${grid}`;
}
