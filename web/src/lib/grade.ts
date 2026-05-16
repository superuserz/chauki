import type { LetterStatus } from '@/types/api';

/** Two-pass Wordle grader. Mirror of api/.../GuessGrader.java. */
export function grade(guess: string[], answer: string[]): LetterStatus[] {
  if (guess.length !== answer.length) {
    throw new Error(`size mismatch: guess=${guess.length} answer=${answer.length}`);
  }
  const out: LetterStatus[] = new Array(guess.length).fill('ABSENT');
  const remaining = new Map<string, number>();
  for (const a of answer) remaining.set(a, (remaining.get(a) ?? 0) + 1);

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) {
      out[i] = 'CORRECT';
      remaining.set(guess[i], (remaining.get(guess[i]) ?? 0) - 1);
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (out[i] === 'ABSENT' && (remaining.get(guess[i]) ?? 0) > 0) {
      out[i] = 'PRESENT';
      remaining.set(guess[i], (remaining.get(guess[i]) ?? 0) - 1);
    }
  }
  return out;
}
