# Chauki — High-Level Design (HLD)

> Audience: anyone (human or AI) joining the project. This doc explains **what** the system is and **why** it's shaped the way it is. For implementation detail, see [LLD.md](./LLD.md).

---

## 1. Goals & Non-Goals

### Goals (MVP)
- **G1.** Bilingual Wordle in Hindi + English.
- **G2.** Two modes per language:
  - **Daily** — one shared puzzle per (date, lang); same word globally; drives streaks.
  - **Practice** — unlimited random puzzles; no streak impact.
- **G3.** Same daily word globally — no cheating by changing device clock.
- **G4.** Six guesses per puzzle, per-letter feedback (green / yellow / gray).
- **G5.** Hindi mode counts akshara, not code points.
- **G6.** Daily puzzle playable offline once loaded (PWA). Practice requires network.
- **G7.** Streaks (Daily only) + win-rate history stored locally per language.
- **G8.** Mobile-first responsive UI (designed for 360–414 px width).

### Non-Goals (MVP)
- User accounts, auth, social login.
- Multiplayer or head-to-head.
- Languages beyond Hindi & English.
- Push notifications.
- Cloud-synced stats / leaderboards.
- In-app purchases.

If a feature isn't in **Goals**, it's not in MVP.

---

## 2. Personas

| Persona      | Description                                         | Primary need                              |
|--------------|-----------------------------------------------------|-------------------------------------------|
| Hindi Wordler| Hindi reader who wants Wordle in their own script   | Akshara-correct, daily, shareable result  |
| English Wordler| Casual Wordle player                              | Familiar, fast, daily                     |
| Hindi Learner| Studying Hindi, knows English Wordle                | Difficulty toggle, can switch back        |
| Returning fan| Streak chaser                                       | Reliable daily reset, history per language|

---

## 3. System Overview

```
┌────────────────────┐     HTTPS      ┌─────────────────────────┐
│  Browser / PWA     │  ───────────►  │  Spring Boot REST API   │
│  (React, Vite)     │  ◄───────────  │  Java 17                │
│                    │   JSON         │                         │
└────────────────────┘                └─────┬───────────┬───────┘
       │                                    │           │
       │  localStorage                      │           │
       │  (streak, history)                 ▼           ▼
       │                              ┌─────────┐  ┌─────────┐
       │                              │ MongoDB │  │  Redis  │
       │                              │  Atlas  │  │ Upstash │
       │                              └─────────┘  └─────────┘
```

### Components

| #  | Component        | Responsibility                                              |
|----|------------------|-------------------------------------------------------------|
| C1 | Web app (PWA)    | Renders UI, manages game state, calls API, caches offline   |
| C2 | API (Spring Boot)| Serves daily puzzle, validates guesses, manages word lists  |
| C3 | MongoDB          | Stores word lists + (eventually) anonymized play records    |
| C4 | Redis            | Caches today's puzzle per language; per-IP rate limits      |
| C5 | Word data        | Versioned JSON files in `data/`, loaded into Mongo at boot  |

---

## 4. Key Design Decisions (and trade-offs)

### D1. Server picks the daily word, not the client
**Why:** Prevents tampering, lets us change the word for every player atomically, and keeps the answer out of the client bundle.
**Trade-off:** Requires the server to be reachable for a *new* puzzle. Mitigated by aggressive PWA caching: once today's puzzle is loaded, you can play offline.

### D2. Two independent daily puzzles (Hindi, English) + unlimited Practice
**Why:** Bilingual users get more value; streaks are per-language; word pools have different sizes and difficulties. Practice mode lets engaged players keep playing after the Daily without diluting the streak mechanic (which requires scarcity to feel meaningful).
**Trade-off:** 2x word-list curation work, plus a separate code path for random puzzle issuance. Acceptable — practice issuance is just `selectRandom(pool)`, almost free.

### D2a. Streaks only count the Daily
**Why:** If Practice puzzles counted, "playing 50 today" would make streaks meaningless. The Daily's scarcity is what makes it shareable and brand-defining.
**Trade-off:** Players who only play Practice see no streak progression. That's fine — Practice has its own win-rate stat.

### D3. Deterministic word selection (hash of date + lang + seed)
**Why:** No DB write needed to "publish" a puzzle. Reproducible. Easy to test.
**Trade-off:** A weak hash could leak future answers. Use HMAC-SHA256 with a server-side secret seed.

### D4. MongoDB over PostgreSQL
**Why:** User preference. Schema-flexible — word documents differ between Hindi (akshara array) and English (char array). Plays/stats fit naturally as documents.
**Trade-off:** Weaker for complex relational queries. Not needed for MVP.

### D5. Akshara handling lives in **both** frontend and backend
**Why:** Frontend needs it for input/display; backend needs it for validation. We cannot trust the client to send pre-split akshara.
**Trade-off:** Two implementations to keep in sync. Mitigated by a shared test corpus (`data/akshara-tests.json`) that both sides run against.

### D6. PWA, not native apps (yet)
**Why:** One codebase, instant updates, no app-store gatekeeping. Wordle's original success was a webpage — no need for native at MVP.
**Trade-off:** No background notifications, slightly worse install UX on iOS. Acceptable.

### D7. Server-validated guesses
**Why:** Word-list lookup must be server-side (don't ship the whole dictionary to clients). Keeps "is this a real word?" honest.
**Trade-off:** Every guess is a round-trip. ~100 ms typical; cached aggressively.

### D8. Pre-game language picker (locked per round)
**Why:** Switching mid-game causes guess-state ambiguity. Forcing a choice up front is simpler to model and test.
**Trade-off:** One extra tap per round. Default to "last chosen" to make it painless.

---

## 5. Non-Functional Requirements

| NFR              | Target                              | How we get there                          |
|------------------|-------------------------------------|-------------------------------------------|
| Availability     | 99% (single-region, MVP)            | Vercel + Railway managed infra            |
| Latency (p95)    | < 250 ms guess validation           | Redis cache, single index lookup          |
| Cold start       | < 3 s first paint on 4G             | Vite code-split, prefetched font subset   |
| Offline play     | Today's puzzle fully playable       | Service worker caches puzzle + assets     |
| Bundle size      | < 200 KB gz initial JS              | No big libs; tree-shaken Framer Motion    |
| Hindi font       | < 80 KB subset                      | Noto Sans Devanagari subset to game glyphs|
| Security         | No leaked answers; rate-limited     | Server-side selection, HMAC, Redis IP cap |

---

## 6. Security & Privacy

- **No PII collected at MVP.** Streaks live in localStorage only.
- **Daily word never on the wire.** Server returns puzzle ID + metadata; the answer leaves the server only as part of guess-result computation.
- **Rate limiting** — Redis-backed token bucket per IP (10 guesses/min, 100/day). Returns HTTP 429 with `Retry-After`.
- **Secrets** — `SEED`, Mongo URI, Redis URL only in env vars. Never in repo. CI scans for accidental commits of strings matching the seed format.
- **CORS** — API allows only the production web origin and `localhost:5173`.
- **Input validation** — all `lang` params constrained to enum `[hi, en]`; guesses validated for length, characters in allowed Unicode blocks.

---

## 7. Deployment Topology

```
            ┌──────────────────────┐
            │  Cloudflare DNS      │
            └────────┬─────────────┘
                     │
       ┌─────────────┴───────────────┐
       ▼                             ▼
 ┌───────────┐                ┌───────────┐
 │  Vercel   │ ──── HTTPS ───►│ Railway   │
 │  (web)    │                │  (api)    │
 └───────────┘                └───┬───────┘
                                  │
                       ┌──────────┴──────────┐
                       ▼                     ▼
                 ┌──────────┐          ┌──────────┐
                 │ MongoDB  │          │  Redis   │
                 │ (managed)│          │ (managed)│
                 └──────────┘          └──────────┘
```

- **`chauki.app`** (or chosen domain) → Vercel
- **`api.chauki.app`** → Railway service
- One environment for MVP: production. (We can add `staging` later via Vercel preview deploys + Railway env clone.)

Full details in [deployment.md](./deployment.md).

---

## 8. Out-of-band concerns

- **Daily word rollover:** uses **UTC midnight**. Display the next-reset countdown in user's local time, but the "day" is always UTC. This mirrors NYT Wordle's behavior and avoids per-timezone drift.
- **Word-list updates:** versioned in git. Bumping the list creates a new `data/words-{lang}.v{N}.json`. Old versions retained for puzzle reproducibility.
- **Bug in daily word:** if a word is unfair (slur, ambiguity, dup), we ship a `block-list` patch and the deterministic selector skips blocked indices. Never re-roll silently.

---

## 9. Future considerations (NOT MVP — for context only)

- Optional sign-in (email magic link) to sync streaks cross-device.
- Hard mode (revealed hints must be reused).
- Themed weeks (e.g., Diwali week — all Hindi words from a category).
- Additional Indic languages (Marathi, Bengali) — architecture already supports `lang` enum extension.
- Achievement badges.
- Social share card (canvas-rendered PNG of result).

These should pull from the same patterns; do not pre-build the abstractions until they're needed.
