# Chauki — Frontend Component Spec

> React component tree, props, and state stores for `web/`. Use this with [LLD.md §1](./LLD.md) for the file layout.

---

## 1. Component Tree

```
<App>
├── <Header>                  (title, language badge, stats button)
├── <Routes>
│   ├── /              → <LanguagePicker>
│   ├── /play          → <Game>
│   │   ├── <GameHeader>      (Daily #N / Practice, attempts remaining)
│   │   ├── <TileGrid>
│   │   │   └── <Tile> × 30   (6 rows × 5 cols)
│   │   ├── <Keyboard>
│   │   │   └── <KeyboardKey> × N
│   │   ├── <Toast>           (invalid word, network errors)
│   │   └── <ResultModal>     (win/lose + share + next)
│   └── /stats         → <Stats>
└── <PWAInstallPrompt>        (one-time)
```

---

## 2. Components

### `<App>` (`src/App.tsx`)
- Sets up `i18next` from `i18nStore`.
- Wraps in `<BrowserRouter>` and providers.
- Mounts service worker registration once.

No props. No local state.

### `<Header>`
```ts
type HeaderProps = { onOpenStats: () => void }
```
- Shows app name, current language pill ("हि" or "EN"), and a stats icon button.
- Hidden on `<LanguagePicker>` page.

### `<LanguagePicker>` (`src/pages/LanguagePicker.tsx`)

```ts
// No props; reads/writes gameStore directly.
```

Layout:
```
┌─────────────────────────────┐
│       चौकी / Chauki         │
│                             │
│  [ हिन्दी ]    [ English ]    │
│                             │
│  Mode:                      │
│  ( ● Daily )   ( ○ Practice )│
│                             │
│       [ Start ]             │
└─────────────────────────────┘
```

Behavior:
- Default language = last picked (localStorage), else `hi`.
- Default mode = `daily`.
- Daily button shows a badge if **today's Daily** is already completed for that language (read from `statsStore`).
- "Start" calls `gameStore.startRound({ lang, mode })` and navigates to `/play`.

### `<Game>` (`src/pages/Game.tsx`)

```ts
// No props. Reads gameStore.
// If gameStore.status === 'picking', redirects to /.
```

Effects:
- On mount, if status is `'loading'`, calls API (`getTodayPuzzle` or `createPracticePuzzle`) and transitions to `'playing'`.
- Hooks up `useKeyboard` for physical keyboard input.

Children render based on `status`:
- `loading`: skeleton grid + "Loading…"
- `playing`: `<TileGrid> + <Keyboard>`
- `won` / `lost`: `<TileGrid>` (final state) + `<ResultModal>`

### `<GameHeader>`
```ts
type GameHeaderProps = {
  mode: 'daily' | 'practice';
  lang: Language;
  dailyNumber?: number;
  attemptsRemaining: number;
};
```
- "Daily #134 · हि" or "Practice · EN".
- Attempts dot indicator: ● ● ● ● ● ●.

### `<TileGrid>`
```ts
type TileGridProps = {
  guesses: Array<{ letters: string[]; statuses: LetterStatus[] }>;
  currentInput: string[];
  invalidShake: boolean;
};
```
- Always renders exactly 6 rows × 5 cols.
- Row 0..(guesses.length-1) = past guesses with statuses.
- Row guesses.length = currentInput (no statuses yet).
- Remaining rows: empty.
- `invalidShake` triggers Framer Motion shake animation on current row.

### `<Tile>`
```ts
type TileProps = {
  letter: string | null;     // displayed string (akshara for hi)
  status: LetterStatus | 'pending' | 'editing';
  flipDelayMs?: number;
};
```
- `editing`: outline animates as letter appears.
- `pending`: no color (current input row before submit).
- `CORRECT | PRESENT | ABSENT`: flip animation with `flipDelayMs` per column for staggered reveal.

### `<Keyboard>`
```ts
type KeyboardProps = {
  lang: Language;
  letterStatuses: Map<string, LetterStatus>;
  onKey: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
};
```

Renders two different layouts based on `lang`:

**English (QWERTY):**
```
Q W E R T Y U I O P
 A S D F G H J K L
   Z X C V B N M
[Enter]         [⌫]
```

**Hindi (compositional):**
- Row 1: vowels (अ आ इ ई उ ऊ ए ऐ ओ औ)
- Row 2: consonants 1 (क ख ग घ च छ ज झ ट ठ)
- Row 3: consonants 2 (ड ढ त थ द ध न प फ ब)
- Row 4: consonants 3 (भ म य र ल व श ष स ह)
- Row 5: matra row (ा ि ी ु ू े ै ो ौ ं ः ्)
- Bottom: [Enter] [⌫]

Each key calls `onKey(key)`. The game store handles akshara composition (`combineWithLastLetter`).

`letterStatuses` colors the keyboard keys after each guess. Only individual *base letters* are colored (e.g., the consonant क is colored, not कि — matras are never colored).

### `<KeyboardKey>`
```ts
type KeyboardKeyProps = {
  symbol: string;
  width?: 'normal' | 'wide';
  status?: LetterStatus | null;
  onPress: () => void;
};
```

### `<Toast>`
- Bottom-center notification. Used for: "Not in word list", "Network error", "Daily already solved — playing Practice".
- Auto-dismisses after 1.5 s.
- Imperative API: `toast.show(message)` (zustand store with a transient `currentToast`).

### `<ResultModal>`
```ts
type ResultModalProps = {
  mode: 'daily' | 'practice';
  outcome: 'won' | 'lost';
  lang: Language;
  dailyNumber?: number;
  attemptsUsed: number;
  revealedWord: string;
  shareText: string;
  onShare: () => void;
  onPlayPractice: () => void;
  onPlayAnotherPractice?: () => void;
  onClose: () => void;
};
```

Daily layout:
```
┌─────────────────────────────┐
│   ✓ Solved!  (or  ✗ Word: नमस्ते) │
│                             │
│   Daily #134 · हि           │
│   Attempts: 4 / 6           │
│                             │
│   [grid emoji preview]      │
│                             │
│  [ Share ]  [ Play Practice ]│
│                             │
│   Next Daily in 14:23:08    │
└─────────────────────────────┘
```

Practice layout:
```
│  [ Play another ]  [ Back ] │
```

### `<Stats>` (`src/pages/Stats.tsx`)

Shows per-language:
- Current Daily streak
- Max Daily streak
- Daily wins / Daily played
- Practice wins / Practice played
- Guess distribution (Daily only): bars for 1–6 attempts

Strictly client-side from `statsStore` (localStorage).

---

## 3. State Stores (Zustand)

### `gameStore`
```ts
import { create } from 'zustand';

type GameStatus = 'picking' | 'loading' | 'playing' | 'won' | 'lost';
type GameMode = 'daily' | 'practice';

type GameStore = {
  status: GameStatus;
  lang: Language | null;
  mode: GameMode | null;
  puzzleId: string | null;
  dailyNumber: number | null;
  guesses: Array<{ letters: string[]; statuses: LetterStatus[] }>;
  currentInput: string[];
  attemptsRemaining: number;
  revealedWord: string | null;
  invalidShake: boolean;

  startRound: (opts: { lang: Language; mode: GameMode }) => Promise<void>;
  appendKey: (key: string) => void;
  removeLast: () => void;
  submitGuess: () => Promise<void>;
  reset: () => void;
};
```

Not persisted — every load starts at `'picking'`.

### `statsStore` (persisted via `zustand/middleware`)
```ts
type LangStats = {
  dailyCurrentStreak: number;
  dailyMaxStreak: number;
  dailyWins: number;
  dailyPlayed: number;
  dailyDistribution: [number, number, number, number, number, number]; // attempts 1..6
  practiceWins: number;
  practicePlayed: number;
  lastDailyDateUtc: string | null; // yyyy-mm-dd; for streak continuity check
  recentPracticeWordIds: string[]; // capped at 50; sent in excludeRecent
};

type StatsStore = {
  hi: LangStats;
  en: LangStats;
  recordDailyResult: (lang: Language, won: boolean, attemptsUsed: number, dateUtc: string) => void;
  recordPracticeResult: (lang: Language, won: boolean, wordId: string) => void;
};
```

**Streak rules:**
- A Daily win increments `dailyCurrentStreak` IF `lastDailyDateUtc` was yesterday, ELSE resets to 1.
- A Daily loss resets `dailyCurrentStreak` to 0.
- `lastDailyDateUtc` is the UTC date of the last Daily attempt for that language.
- `dailyMaxStreak = max(dailyMaxStreak, dailyCurrentStreak)`.

### `i18nStore`
```ts
type I18nStore = {
  uiLang: Language;          // affects UI strings, separate from game language
  setUiLang: (l: Language) => void;
};
```

UI language defaults to `navigator.language.startsWith('hi') ? 'hi' : 'en'`.

---

## 4. Hooks

### `useKeyboard()`
Attaches a global keydown listener while `<Game>` is mounted. Maps key codes to `gameStore.appendKey/removeLast/submitGuess`. Disabled in Hindi mode (touch keyboard only — physical keyboard composition is too painful for MVP).

### `useGame()`
Slim selector hook bundling `gameStore` fields needed by `<Game>`.

### `useCountdownToReset()`
Returns `{ hours, minutes, seconds }` to next UTC midnight. Re-renders every second while mounted.

---

## 5. Styling

- **Tailwind utility classes** everywhere; no CSS modules.
- **Dark mode** by default (matches Wordle's aesthetic); light mode toggled later.
- **Fonts:**
  - English: `Inter` variable, subset to Latin Basic.
  - Hindi: `Noto Sans Devanagari` variable, subset to game glyphs (~80 KB after subset).
  - Both self-hosted under `public/fonts/` — no Google Fonts call.

### Color tokens (Tailwind config extension)

```js
theme: {
  extend: {
    colors: {
      tile: {
        empty: 'transparent',
        edit: '#878a8c',
        correct: '#6aaa64',
        present: '#c9b458',
        absent: '#787c7e',
      },
    },
  },
}
```

---

## 6. Animations (Framer Motion)

| Action                | Animation                                          |
|-----------------------|----------------------------------------------------|
| Letter typed          | Tile scale 1.05 → 1.0 over 80 ms                   |
| Submit (reveal row)   | Each tile rotateX 0 → 180° staggered 300 ms apart  |
| Invalid word          | Row shake (translateX ±10 px, 3 cycles, 400 ms)    |
| Win                   | Solved row tiles bounce in sequence (delay × col)  |
| Result modal          | Fade + scale 0.95 → 1.0                            |

Disable animations when `prefers-reduced-motion: reduce`.

---

## 7. Accessibility

- Every tile has `aria-label` like "row 1 column 3, letter K, correct".
- Keyboard keys are real `<button>`s.
- `ResultModal` traps focus while open.
- Color is never the only status indicator — tiles also have distinct shapes/icons for color-blind mode (toggle in settings).

---

## 8. Out of scope (do not build yet)

- Themes (color customization)
- Sound effects
- Account syncing UI
- Multi-language UI beyond hi/en
- Hard mode toggle
