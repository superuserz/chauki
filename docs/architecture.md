# Chauki — System Architecture

> Visual / diagram-heavy companion to [HLD.md](./HLD.md). Shows how components fit and how requests flow.

---

## 1. Logical Architecture

```
╔═══════════════════════════════════════════════════════════════════╗
║                          CLIENT (PWA)                             ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │  React app                                                  │  ║
║  │  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌────────┐   │  ║
║  │  │ Picker   │  │ Game board │  │ Keyboard   │  │ Stats  │   │  ║
║  │  │ (lang +  │→ │ (TileGrid) │← │ (akshara/  │  │ modal  │   │  ║
║  │  │  mode)   │  │            │  │  qwerty)   │  │        │   │  ║
║  │  └──────────┘  └─────┬──────┘  └─────┬──────┘  └────────┘   │  ║
║  │                      │                │                     │  ║
║  │            ┌─────────▼────────────────▼─────────┐           │  ║
║  │            │  Zustand stores (game, stats, i18n)│           │  ║
║  │            └─────────┬──────────────────────────┘           │  ║
║  │                      │                                      │  ║
║  │            ┌─────────▼─────────┐                            │  ║
║  │            │  API client       │                            │  ║
║  │            │  (fetch wrapper)  │                            │  ║
║  │            └─────────┬─────────┘                            │  ║
║  └──────────────────────┼──────────────────────────────────────┘  ║
║                         │                                         ║
║              ┌──────────▼──────────┐                              ║
║              │ Service Worker      │                              ║
║              │ (offline cache)     │                              ║
║              └──────────┬──────────┘                              ║
╚═════════════════════════│═════════════════════════════════════════╝
                          │  HTTPS / JSON
╔═════════════════════════▼═════════════════════════════════════════╗
║                      SPRING BOOT API                              ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │ RateLimitFilter →  Controllers                              │  ║
║  │                    ┌─────────────────┐ ┌─────────────────┐  │  ║
║  │                    │ PuzzleController│ │ GuessController │  │  ║
║  │                    └────────┬────────┘ └────────┬────────┘  │  ║
║  │                             │                   │           │  ║
║  │                    ┌────────▼────────┐ ┌────────▼────────┐  │  ║
║  │                    │ PuzzleService   │ │ GuessService    │  │  ║
║  │                    └─┬────────────┬──┘ └────────┬────────┘  │  ║
║  │                      │            │             │           │  ║
║  │              ┌───────▼──┐  ┌──────▼────────┐ ┌──▼────────┐  │  ║
║  │              │ Daily    │  │ Practice      │ │ Grader    │  │  ║
║  │              │ Selector │  │ Selector      │ │ (algo)    │  │  ║
║  │              └────┬─────┘  └──────┬────────┘ └───────────┘  │  ║
║  │                   └────────┬──────┘                         │  ║
║  │                            ▼                                │  ║
║  │              ┌─────────────────────────┐                    │  ║
║  │              │  WordRepository (Mongo) │                    │  ║
║  │              │  PuzzleCache   (Redis)  │                    │  ║
║  │              └─────────────────────────┘                    │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════╝
                  │                        │
                  ▼                        ▼
         ┌────────────────┐       ┌────────────────┐
         │  MongoDB       │       │  Redis         │
         │  - words       │       │  - puzzle      │
         │  - plays (TBD) │       │  - rate-limit  │
         └────────────────┘       └────────────────┘
```

---

## 2. Sequence: Start a Daily round

```
User       Web (PWA)        Service Worker      API           Redis        Mongo
 │              │                  │             │              │            │
 │ open chauki  │                  │             │              │            │
 ├─────────────►│                  │             │              │            │
 │              │ load shell       │             │              │            │
 │              ├─────────────────►│             │              │            │
 │              │◄─────────────────┤ cache hit   │              │            │
 │              │                  │             │              │            │
 │  pick lang/  │                  │             │              │            │
 │  mode=daily  │                  │             │              │            │
 ├─────────────►│ GET /puzzles/today?lang=hi    │              │            │
 │              ├─────────────────────────────►│              │            │
 │              │                              │  GET cache   │            │
 │              │                              ├─────────────►│            │
 │              │                              │◄────────miss─┤            │
 │              │                              │  HMAC pick   │            │
 │              │                              ├──────────────┼───────────►│
 │              │                              │◄─────────────┼─ word doc ─┤
 │              │                              │  SET cache   │            │
 │              │                              ├─────────────►│            │
 │              │ { puzzleId, lang, length:5 } │              │            │
 │              │◄─────────────────────────────┤              │            │
 │              │ render empty grid + keyboard │              │            │
 │◄─────────────┤                              │              │            │
 │              │                              │              │            │
 │  start typing│                              │              │            │
```

Note: the answer never crosses the wire. The client only receives `puzzleId` and metadata.

---

## 3. Sequence: Submit a guess

```
User      Web         API: RateLimit      GuessService     Redis        Mongo
 │           │              │                  │             │             │
 │  submit   │              │                  │             │             │
 ├──────────►│  POST /guess │                  │             │             │
 │           ├─────────────►│                  │             │             │
 │           │              │  INCR rate keys  │             │             │
 │           │              ├──────────────────┼────────────►│             │
 │           │              │◄─────────────────┼──── ok ─────┤             │
 │           │              │  delegate        │             │             │
 │           │              ├─────────────────►│             │             │
 │           │              │                  │  GET puzzle │             │
 │           │              │                  ├────────────►│             │
 │           │              │                  │◄─── hit ────┤             │
 │           │              │                  │  validate guess in dict   │
 │           │              │                  ├──────────────────────────►│
 │           │              │                  │◄────── true / false ──────┤
 │           │              │                  │  grade(guess, answer)     │
 │           │ { statuses, isSolved, ... }     │             │             │
 │           │◄────────────────────────────────┤             │             │
 │           │ animate tile flip + keyboard    │             │             │
 │           │ if solved → modal               │             │             │
 │◄──────────┤                                 │             │             │
```

If solved or attempt 6, the response includes `revealedWord` so the UI can show the answer; otherwise it's null.

---

## 4. Sequence: Practice round

```
User      Web         API           Redis        Mongo
 │           │           │             │             │
 │ "Practice"│           │             │             │
 ├──────────►│ POST /puzzles/practice  │             │
 │           │  body: { lang, excludeRecent: [...] } │
 │           ├──────────►│             │             │
 │           │           │  load pool  │             │
 │           │           ├─────────────┼────────────►│
 │           │           │◄────────────┼─ word list ─┤
 │           │           │  random pick│             │
 │           │           │  SET puzzle │             │
 │           │           ├────────────►│             │
 │           │ { puzzleId, mode: PRACTICE, lang }    │
 │           │◄──────────┤             │             │
 │           │ same play loop as Daily │             │
```

Streak store does **not** subscribe to Practice round completion events.

---

## 5. Data Flow: Word List Loading

At application boot the API runs a `CommandLineRunner` (`WordLoader.java`):

```
1. Read data/words-hi.json and data/words-en.json (from classpath).
2. For each entry:
     compute id = sha256(lang + ":" + text).substring(0, 16)
     compute letters via AksharaUtil.split (hi) or split chars (en)
     upsert into Mongo `words` collection
3. Log: "loaded N hi words, M en words"
4. Mark a boot-time flag in Redis: chauki:bootstrap:done = true
```

Re-running is idempotent — same word produces same id. New words appear naturally on next deploy.

---

## 6. Deployment View

```
                ┌────────────────────────────┐
                │     Vercel (web)           │
                │  static dist/ + edge SW    │
                └─────────────┬──────────────┘
                              │ /api/* rewrites to api host
                              ▼
                ┌────────────────────────────┐
                │   Railway service: api     │
                │   Docker: openjdk:17-jre   │
                │   Env: SEED, MONGO, REDIS  │
                └────┬───────────────┬───────┘
                     │               │
                     ▼               ▼
            ┌────────────┐    ┌────────────┐
            │ MongoDB    │    │ Redis      │
            │ Atlas M0   │    │ Upstash    │
            │ free tier  │    │ free tier  │
            └────────────┘    └────────────┘
```

Frontend rewrites `/api/*` to `https://api.chauki.app/api/*` to keep cookies/origin clean.

Full details in [deployment.md](./deployment.md).

---

## 7. Key Boundaries (security review checklist)

| Boundary                      | Concern                              | Mitigation                                       |
|-------------------------------|--------------------------------------|--------------------------------------------------|
| Client ↔ API                  | Anyone can call API                  | CORS allowlist, rate-limit per IP                |
| API ↔ Mongo                   | DB credentials                       | Env var; no client touches Mongo                 |
| API ↔ Redis                   | Cache poisoning                      | Internal network only; auth required             |
| Puzzle answer in transit      | Cheating                             | Answer never sent until solved/lost              |
| Daily word in logs            | Spoiler leak                         | Logger filter scrubs known seeds & word fields   |
| `excludeRecent` from client   | Client could send giant arrays       | Cap server-side to 50 entries                    |
| Word list in JS bundle        | Spoiler leak                         | Word list lives only on the API; web never sees it|

---

## 8. What's NOT in this diagram

- **Auth / OAuth** — out of MVP scope.
- **Background jobs** — none. Daily rollover is computed on read (deterministic).
- **Push notifications** — not in MVP.
- **Cross-region replication** — single region; acceptable for MVP traffic.

When any of these get added, this diagram must be updated.
