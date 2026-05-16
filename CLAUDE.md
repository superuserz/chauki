# Chauki — Bilingual Wordle (Hindi + English)

> A word-guessing game with **two modes** in each language:
> - **Daily** — one shared puzzle per language per day, same for every player globally. Drives streaks and shareable results.
> - **Practice** — unlimited random puzzles after (or instead of) the Daily. Does not affect streaks.
>
> Players pick **Hindi** or **English** before each round, then have 6 attempts to guess a 5-letter word.

## Project Identity

- **Name:** Chauki (चौकी) — "checkpoint" / "guard post"
- **Tagline:** Roz ka shabd, jab tak chaho khelo. (A word a day, play as much as you want.)
- **Audience:** Hindi readers/learners + English Wordle fans who want a bilingual option
- **Status:** Pre-MVP — architecture phase

## Tech Stack (locked)

| Layer        | Choice                                          | Why                                                  |
|--------------|-------------------------------------------------|------------------------------------------------------|
| Frontend     | React 18 + Vite + TypeScript                    | Fast HMR, type safety, modern DX                     |
| Styling      | Tailwind CSS                                    | Utility-first, small bundle                          |
| Animations   | Framer Motion                                   | Tile flips, shake, page transitions                  |
| PWA          | vite-plugin-pwa                                 | Offline play, installable                            |
| State        | Zustand                                         | Lightweight, no Redux boilerplate                    |
| i18n         | i18next + react-i18next                         | UI strings in Hindi + English                        |
| Backend      | **Java 17 (LTS) + Spring Boot 3 (Maven)**       | User's preferred stack; mature, fast, well-known     |
| DB           | **MongoDB 7**                                   | Flexible schema for word lists + plays               |
| Cache        | Redis 7                                         | Daily word, rate limits                              |
| Hosting (FE) | Vercel                                          | Free, auto-deploy on push                            |
| Hosting (BE) | Railway (or Render)                             | Java + MongoDB + Redis in one place                  |
| Analytics    | Plausible (optional, later)                     | Privacy-friendly                                     |

**Do not swap any of these without updating this file first.**

## Repository Layout

```
chauki/
├── CLAUDE.md                 # this file — load first
├── README.md                 # public-facing project overview
├── docs/
│   ├── HLD.md                # high-level design
│   ├── LLD.md                # low-level design
│   ├── architecture.md       # system architecture & diagrams
│   ├── api-spec.md           # REST API contract
│   ├── data-model.md         # MongoDB collections
│   ├── frontend-components.md# component breakdown
│   ├── word-list.md          # Hindi + English word sourcing
│   └── deployment.md         # CI/CD and infra
├── web/                      # React frontend (Vite)
│   ├── src/
│   ├── public/
│   └── package.json
├── api/                      # Spring Boot backend (Maven)
│   ├── src/main/java/io/chauki/api/
│   ├── src/main/resources/
│   ├── src/test/java/
│   └── pom.xml
└── data/                     # word lists (committed)
    ├── words-hi.json
    └── words-en.json
```

The frontend and backend are **separate projects** under one repo (not a monorepo with workspaces — keeps tooling simple since the stacks differ).

## Build Order (do not skip)

Each step unblocks the next:

1. **Word lists** (`data/`) — clean 5-letter word JSON files for Hindi and English. No game logic works without them.
2. **API: health + config** (`api/`) — Spring Boot scaffold, `/api/health`, MongoDB + Redis connectivity.
3. **API: daily puzzle** — `GET /api/puzzles/today?lang=hi|en` returns puzzle ID + metadata (never the answer).
4. **API: practice puzzle** — `POST /api/puzzles/practice` returns a fresh random puzzle ID for the requested language. No streak impact.
5. **API: validate guess** — `POST /api/guess` checks Hindi/English word validity and returns per-letter feedback. Works for both Daily and Practice puzzles via `puzzleId`.
6. **Frontend: language picker + mode picker + tile grid + keyboard** (`web/`) — pure UI, mock API responses.
7. **Frontend: wire to API** — replace mocks with real fetch calls.
8. **Animations** — tile flip on submit, shake on invalid, win/lose modal.
9. **PWA** — service worker, manifest, offline cache of today's Daily puzzle (Practice requires network).
10. **Stats (local)** — store streaks (Daily only) + history (both modes, separated) in localStorage, per language.
11. **Auth + cloud streaks** — only if step 10 shows daily-return users.

## Game Modes (critical)

### Daily mode
- One shared puzzle per `(date, lang)` — same word for every player worldwide.
- Solving it counts toward the **streak** for that language.
- Stored deterministically (no DB write needed to "publish"). See LLD §3.
- Shareable result card mentions "Daily #N".

### Practice mode
- Unlimited random puzzles. Each `POST /api/puzzles/practice` returns a fresh random word from the pool.
- **Does NOT** affect streaks.
- Win/loss is recorded in local history (separate "Practice" bucket) for win-rate stats only.
- Available even before the Daily is attempted.

### Language picker
- A **modal/landing screen** shown when the app loads (or on "New round").
- Two big buttons: **हिन्दी** and **English**, plus a Mode toggle (Daily / Practice).
- Once a round starts, language **and mode** are locked until win/lose or give-up.
- Picker remembers the last choice in localStorage as a default, but always confirms.

### Per-language streaks
Streaks are tracked **separately per language** — and **only for Daily**. A player can have a 10-day Hindi Daily streak and a 3-day English Daily streak simultaneously, plus any number of Practice puzzles played that don't affect either.

### Hindi-specific handling

Hindi words are made of **akshara** (syllabic clusters), not individual code points. A "5-letter Hindi word" means **5 akshara**, which can be 5–15 Unicode code points.

- Use a custom **akshara splitter** (`web/src/lib/akshara.ts` + mirror in `api/.../AksharaUtil.java`).
- Never use `string.length` for Hindi. Always count akshara.
- Word equality compares **normalized akshara arrays**, not raw strings.
- The Hindi keyboard renders **consonants + matra (vowel signs) as separate keys** — players compose akshara as they type. See `docs/LLD.md` §4.
- English mode uses the standard QWERTY-style keyboard and plain `char[]` comparison.

### Shared logic vs. branched logic

Branch on `lang` at the **edges** (input parsing, display) only. Core guess-result computation works on **arrays of "letters"** (akshara for Hindi, chars for English) and is language-agnostic.

## Daily Word Selection

Deterministic, not random. For date `D` and language `L`:

```
wordIndex = hash(D + ":" + L, SECRET_SEED) % wordList[L].length
```

This means:
- Every player gets the same word for `(D, L)`.
- Hindi and English picks are independent.
- The seed lives in `api/src/main/resources/application.yml` (overridden by env var in prod) — never commit the real seed.

Full algorithm + collision/repeat-avoidance in `docs/LLD.md` §3.

## Coding Standards

### Frontend (TS/React)
- **TypeScript strict mode.** No `any` without an eslint-disable comment + reason.
- **No default exports** in shared code. Named exports only.
- **Components are functions**, hooks at the top, no class components.
- **State in Zustand stores**, one store per concern (`gameStore`, `statsStore`, `i18nStore`).

### Backend (Java/Spring Boot)
- **Java 17 (LTS)**, records for DTOs, sealed interfaces where possible.
- **Constructor injection only** — no `@Autowired` on fields.
- **DTOs separate from MongoDB documents** — never expose the document directly via REST.
- **Validation:** `jakarta.validation` annotations on request DTOs.
- **Errors:** `@RestControllerAdvice` mapping typed exceptions to consistent error envelope.
- **No Lombok in core modules** — be explicit. (Allowed in test helpers only.)

### Shared
- **API responses always enveloped:** `{ data, error }`. Never bare objects.
- **Tests:** Vitest (web), JUnit 5 + Mockito + Testcontainers (api). Cover validation logic first, UI last.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`, `docs:`).
- **Never log the daily word.** Even in dev. Use `[REDACTED]` placeholder. CI grep blocks PRs containing leaked answers.

## What NOT to Build (yet)

Out of scope for MVP — adding any of these is scope creep:
- User accounts / OAuth
- Multiplayer / head-to-head
- Hard mode / themed weeks / additional languages beyond hi & en
- In-app purchases
- Push notifications
- Cloud leaderboards

## Glossary

- **Akshara (अक्षर):** Syllabic unit in Hindi — base consonant + optional matra + optional halant. E.g., क, का, क्र.
- **Matra (मात्रा):** Vowel sign attached to a consonant.
- **Halant (्):** Diacritic suppressing the inherent vowel.
- **Schwa:** The implicit "a" sound after every consonant.
- **Round:** A single player's attempt at one puzzle (one language, one date, up to 6 guesses).

## When in doubt

1. Read the relevant `docs/*.md` file.
2. Prefer simpler — this is an MVP.
3. **Hindi correctness > English parity > visual polish > feature count.**
