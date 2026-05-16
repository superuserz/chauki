import { describe, expect, it } from 'vitest';
import corpus from '../../../data/grading-tests.json';
import { grade } from './grade';
import type { LetterStatus } from '@/types/api';

type Case = {
  name: string;
  answer: string[];
  guess: string[];
  expected: LetterStatus[];
};

describe('grade (shared corpus)', () => {
  (corpus as Case[]).forEach(({ name, answer, guess, expected }) => {
    it(name, () => {
      expect(grade(guess, answer)).toEqual(expected);
    });
  });
});
