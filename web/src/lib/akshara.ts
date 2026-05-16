import type { Language } from '@/types/api';

// Mirror of api/.../AksharaUtil.java. Keep regex identical.
const AKSHARA_RE =
  /(?:[क-ह़](?:्[क-ह])*[ा-ौ]?[ंः]?)|[अ-औ][ंः]?|./gu;

export function splitHindi(word: string): string[] {
  const normalized = word.normalize('NFC');
  const matches = normalized.match(AKSHARA_RE);
  return matches ? matches.filter((s) => s.trim().length > 0) : [];
}

export function splitEnglish(word: string): string[] {
  return word.toLowerCase().split('');
}

export function splitWord(lang: Language, word: string): string[] {
  return lang === 'hi' ? splitHindi(word) : splitEnglish(word);
}

export function joinLetters(letters: string[]): string {
  return letters.join('');
}

/** True if the given key is a Devanagari matra (vowel sign) or anusvara/visarga. */
export function isHindiMatra(ch: string): boolean {
  if (ch.length !== 1) return false;
  const code = ch.charCodeAt(0);
  return (
    (code >= 0x093e && code <= 0x094c) || // matras
    code === 0x0902 ||                     // anusvara
    code === 0x0903 ||                     // visarga
    code === 0x094d                        // halant
  );
}

/** True if the given key is a Devanagari base consonant. */
export function isHindiConsonant(ch: string): boolean {
  if (ch.length !== 1) return false;
  const code = ch.charCodeAt(0);
  return code >= 0x0915 && code <= 0x0939;
}

/** True if the given key is a Devanagari independent vowel. */
export function isHindiVowel(ch: string): boolean {
  if (ch.length !== 1) return false;
  const code = ch.charCodeAt(0);
  return code >= 0x0905 && code <= 0x0914;
}

/**
 * Append a Hindi key to a buffer of akshara, composing matras into the
 * preceding akshara when applicable. Returns a new buffer.
 */
export function appendHindiKey(buffer: string[], key: string): string[] {
  if (isHindiMatra(key) && buffer.length > 0) {
    const last = buffer[buffer.length - 1];
    return [...buffer.slice(0, -1), last + key];
  }
  return [...buffer, key];
}
