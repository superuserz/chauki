import { useMemo } from 'react';
import { KeyboardKey } from './KeyboardKey';
import type { Language, LetterStatus } from '@/types/api';

type KeyboardProps = {
  lang: Language;
  letterStatuses: Map<string, LetterStatus>;
  onKey: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
};

const ENGLISH_ROWS: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const HINDI_ROWS: string[][] = [
  ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ'],
  ['क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ', 'ट', 'ठ'],
  ['ड', 'ढ', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब'],
  ['भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह'],
  ['ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ', 'ं', 'ः', '्'],
];

export function Keyboard({ lang, letterStatuses, onKey, onEnter, onBackspace }: KeyboardProps) {
  const rows = useMemo(() => (lang === 'hi' ? HINDI_ROWS : ENGLISH_ROWS), [lang]);
  const fontClass = lang === 'hi' ? 'font-deva' : 'font-latin';

  return (
    <div className={`mx-auto w-full max-w-md p-2 flex flex-col gap-1.5 ${fontClass}`}>
      {rows.map((row, idx) => (
        <div key={idx} className="flex gap-1.5">
          {row.map((k) => (
            <KeyboardKey
              key={k}
              symbol={k}
              status={letterStatuses.get(k) ?? null}
              onPress={() => onKey(k)}
            />
          ))}
        </div>
      ))}
      <div className="flex gap-1.5">
        <KeyboardKey symbol="↵" label="Enter" width="wide" onPress={onEnter} />
        <KeyboardKey symbol="⌫" label="Backspace" width="wide" onPress={onBackspace} />
      </div>
    </div>
  );
}
