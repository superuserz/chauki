import { describe, expect, it } from 'vitest';
import corpus from '../../../data/akshara-tests.json';
import { splitHindi, appendHindiKey } from './akshara';

type Case = { word: string; expected: string[] };

describe('splitHindi (shared corpus)', () => {
  (corpus as Case[]).forEach(({ word, expected }) => {
    it(`splits ${word}`, () => {
      expect(splitHindi(word)).toEqual(expected);
    });
  });
});

describe('appendHindiKey', () => {
  it('attaches a matra to the previous akshara', () => {
    expect(appendHindiKey(['क'], 'ा')).toEqual(['का']);
  });

  it('starts a new akshara for a fresh consonant', () => {
    expect(appendHindiKey(['क'], 'म')).toEqual(['क', 'म']);
  });

  it('does nothing with a leading matra (no preceding akshara)', () => {
    expect(appendHindiKey([], 'ा')).toEqual(['ा']);
  });
});
