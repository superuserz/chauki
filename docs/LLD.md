# Chauki — Low-Level Design (LLD)

> Implementation-level spec. Read [HLD.md](./HLD.md) first for context. This document covers algorithms, class shapes, and module-level structure on both sides.

---

## 1. Package / Module Structure

### Backend (`api/`) — Spring Boot, Java 17, Maven

```
io.chauki.api
├── ChaukiApplication.java        # @SpringBootApplication entry point
├── config/
│   ├── MongoConfig.java          # codec registry, indexes
│   ├── RedisConfig.java          # template + serializers
│   ├── SecurityConfig.java       # CORS, rate-limit filter
│   └── AppProperties.java        # @ConfigurationProperties("chauki")
├── puzzle/
│   ├── PuzzleController.java     # GET /api/puzzles/today, POST /api/puzzles/practice
│   ├── PuzzleService.java        # daily + practice selection
│   ├── DailyWordSelector.java    # deterministic hash (Daily)
│   ├── PracticeWordSelector.java # uniform random (Practice)
│   └── dto/
│       ├── PuzzleResponse.java   # record
│       ├── PuzzleMode.java       # enum DAILY, PRACTICE
│       └── Language.java         # enum HI, EN
├── guess/
│   ├── GuessController.java      # POST /api/guess
│   ├── GuessService.java         # validate + grade
│   ├── GuessGrader.java          # green/yellow/gray logic
│   └── dto/
│       ├── GuessRequest.java
│       ├── GuessResponse.java
│       └── LetterStatus.java     # enum CORRECT, PRESENT, ABSENT
├── word/
│   ├── WordRepository.java       # Spring Data Mongo
│   ├── WordDocument.java
│   ├── WordLoader.java           # CommandLineRunner: load JSON at boot
│   └── AksharaUtil.java          # Hindi splitter
├── error/
│   ├── ApiException.java         # base
│   ├── InvalidWordException.java
│   ├── RateLimitException.java
│   └── GlobalExceptionHandler.java # @RestControllerAdvice
└── common/
    ├── ApiResponse.java          # { data, error } envelope
    └── RateLimiter.java          # Redis token bucket
```

### Frontend (`web/`) — React 18, TypeScript, Vite

```
src/
├── main.tsx
├── App.tsx
├── routes.tsx
├── pages/
│   ├── LanguagePicker.tsx
│   ├── Game.tsx
│   └── Stats.tsx
├── components/
│   ├── TileGrid.tsx
│   ├── Tile.tsx
│   ├── Keyboard.tsx
│   ├── KeyboardKey.tsx
│   ├── ResultModal.tsx
│   ├── Toast.tsx
│   └── Header.tsx
├── stores/
│   ├── gameStore.ts             # zustand: guesses, statuses, status
│   ├── statsStore.ts            # zustand: streaks, history (persist)
│   └── i18nStore.ts             # current UI language
├── lib/
│   ├── api.ts                   # fetch wrappers, response envelope
│   ├── akshara.ts               # Hindi splitter (mirror of Java)
│   ├── grade.ts                 # client-side green/yellow/gray
│   └── time.ts                  # UTC date helpers
├── hooks/
│   ├── useGame.ts
│   ├── useKeyboard.ts
│   └── useCountdownToReset.ts
├── i18n/
│   ├── en.json
│   └── hi.json
└── types/
    └── api.ts                   # mirror of backend DTOs
```

---

## 2. Core Domain Types

### `Language` enum (both sides)

```java
public enum Language {
    HI, EN;
}
```

```ts
export type Language = 'hi' | 'en';
```

### `WordDocument` (Mongo)

```java
@Document(collection = "words")
public record WordDocument(
    @Id String id,
    Language lang,
    String text,            // raw string (NFC normalized)
    List<String> letters,   // akshara for hi; single chars for en
    int length,             // letters.size() — always 5 for MVP
    Integer frequencyRank,  // nullable; lower = more common
    Instant addedAt
) {}
```

### `LetterStatus`

```java
public enum LetterStatus { CORRECT, PRESENT, ABSENT }
```

`CORRECT` = green (right letter, right position), `PRESENT` = yellow (right letter, wrong position), `ABSENT` = gray (not in word).

### `GuessResult` (response from POST /api/guess)

```java
public record GuessResponse(
    List<LetterStatus> statuses,  // one per letter in guess
    boolean isSolved,
    Integer attemptsRemaining,
    String revealedWord           // only populated on final attempt or solve
) {}
```

---

## 3. Daily Word Selection

### Algorithm

```
input:  date D (UTC, yyyy-mm-dd), lang L, secret seed S, blocklist B
output: WordDocument

1. h = HMAC_SHA256(key=S, msg=D + ":" + L.name())
2. n = first 8 bytes of h, big-endian → unsigned long
3. wordList = all WordDocuments where lang=L AND id NOT IN B
4. index = n mod wordList.size()
5. return wordList[index]
```

### Java implementation (`DailyWordSelector.java`)

```java
@Component
public class DailyWordSelector {
    private final WordRepository repo;
    private final AppProperties props;

    public WordDocument selectFor(LocalDate dateUtc, Language lang) {
        byte[] mac = hmacSha256(
            props.seed().getBytes(StandardCharsets.UTF_8),
            (dateUtc.toString() + ":" + lang.name()).getBytes(StandardCharsets.UTF_8)
        );
        long n = ByteBuffer.wrap(mac, 0, 8).getLong() & Long.MAX_VALUE;
        List<WordDocument> pool = repo.findAllByLangAndIdNotIn(lang, props.blocklist());
        if (pool.isEmpty()) throw new IllegalStateException("empty pool: " + lang);
        return pool.get((int) (n % pool.size()));
    }
}
```

### Repeat-avoidance (later, not MVP)

Track recently-used word IDs per language in Mongo `recent_picks` collection (TTL 60 days). Selector skips any index whose word ID appears in recent picks. For MVP, the word lists are large enough (>5,000 each) that natural collisions are rare.

### Caching (Daily)

Cache the resolved Daily puzzle for 24 hours in Redis:

```
key:   chauki:puzzle:daily:{date}:{lang}   (e.g., chauki:puzzle:daily:2026-05-16:hi)
value: { puzzleId, wordId, letters: [...] }
ttl:   until next UTC midnight + 1 hour buffer
```

The `wordId` and `letters` are needed server-side to grade guesses; they NEVER leave the server intact (only per-letter statuses do).

### Practice puzzles

`POST /api/puzzles/practice` returns a fresh random puzzle, scoped to the requested language.

```
1. pool   = WordRepository.findAllByLang(lang) minus blocklist
2. word   = pool[secureRandom.nextInt(pool.size())]
3. puzzleId = UUIDv7 (time-sortable)
4. cache in Redis:
     key   = chauki:puzzle:practice:{puzzleId}
     value = { wordId, letters: [...], lang, mode: PRACTICE }
     ttl   = 1 hour  (a practice round is short-lived; if abandoned, expires)
5. return { puzzleId, mode: PRACTICE, lang, length: 5 }
```

Practice puzzleIds are required by `POST /api/guess` — the API looks up the answer by puzzleId, so it can grade guesses without ever revealing the word.

To avoid trivially repeating the same Practice word for the same player, the client passes an optional `excludeRecent: [wordId, ...]` of the last ~20 wordIds it has seen. The server filters those out of the pool before picking. (Best-effort; nothing prevents resetting localStorage.)

**No rate-limit on Practice issuance specifically** — the same general guess rate limit (§7) bounds abuse.

---

## 4. Akshara Splitting (Hindi)

### Definition

A single akshara is the regex:

```
(consonant cluster) (matra)? | (independent vowel)
```

More precisely:
```
[ं-ः]? [क-ह]  (?:[़]? ् [क-ह])* [ा-ौ]? [ं-ः]? [़]?
  | [अ-औ] [ं-ः]?
```

The full regex lives in `akshara.ts` and `AksharaUtil.java` — kept identical.

### TypeScript (`web/src/lib/akshara.ts`)

```ts
const AKSHARA_RE = /(?:[क-ह़](?:्[क-ह])*[ा-ौ]?[ंः]?)|[अ-औ][ंः]?|./gu;

export function splitAkshara(word: string): string[] {
  const normalized = word.normalize('NFC');
  const matches = normalized.match(AKSHARA_RE);
  return matches ? matches.filter(s => s.trim().length > 0) : [];
}
```

### Java (`AksharaUtil.java`)

```java
public final class AksharaUtil {
    private static final Pattern AKSHARA = Pattern.compile(
        "(?:[क-ह़](?:्[क-ह])*[ा-ौ]?[ंः]?)" +
        "|[अ-औ][ंः]?" +
        "|."
    );

    public static List<String> split(String word) {
        String normalized = Normalizer.normalize(word, Normalizer.Form.NFC);
        List<String> out = new ArrayList<>();
        Matcher m = AKSHARA.matcher(normalized);
        while (m.find()) {
            String s = m.group();
            if (!s.isBlank()) out.add(s);
        }
        return out;
    }
}
```

### Shared test corpus

`data/akshara-tests.json`:
```json
[
  { "word": "नमस्ते", "expected": ["न", "म", "स्ते"] },
  { "word": "कमल",   "expected": ["क", "म", "ल"] },
  { "word": "क्रांति","expected": ["क्रां", "ति"] }
]
```

Both Vitest and JUnit tests load this file. A failure on either side blocks merge.

---

## 5. Guess Grading

Classic Wordle two-pass algorithm — first pass assigns CORRECT, second pass assigns PRESENT respecting duplicate-letter caps.

### Algorithm (language-agnostic; operates on `List<String>`)

```
input:  guess[] of length 5, answer[] of length 5
output: status[] of length 5

1. counts = frequency map of answer letters
2. for i in 0..4:
     if guess[i] == answer[i]:
        status[i] = CORRECT
        counts[guess[i]] -= 1
     else:
        status[i] = ABSENT  (tentative)
3. for i in 0..4:
     if status[i] == ABSENT and counts[guess[i]] > 0:
        status[i] = PRESENT
        counts[guess[i]] -= 1
4. return status
```

### Java (`GuessGrader.java`)

```java
public List<LetterStatus> grade(List<String> guess, List<String> answer) {
    if (guess.size() != answer.size()) throw new IllegalArgumentException("size mismatch");
    int n = guess.size();
    LetterStatus[] out = new LetterStatus[n];
    Map<String, Integer> remaining = new HashMap<>();
    for (String s : answer) remaining.merge(s, 1, Integer::sum);

    for (int i = 0; i < n; i++) {
        if (guess.get(i).equals(answer.get(i))) {
            out[i] = LetterStatus.CORRECT;
            remaining.merge(guess.get(i), -1, Integer::sum);
        } else {
            out[i] = LetterStatus.ABSENT;
        }
    }
    for (int i = 0; i < n; i++) {
        if (out[i] == LetterStatus.ABSENT && remaining.getOrDefault(guess.get(i), 0) > 0) {
            out[i] = LetterStatus.PRESENT;
            remaining.merge(guess.get(i), -1, Integer::sum);
        }
    }
    return Arrays.asList(out);
}
```

The frontend reimplements the same algorithm in `web/src/lib/grade.ts` for animation preview (optimistic), but **trusts only server-returned statuses** when finalizing tile state.

---

## 6. Guess Validation

Before grading, a guess must:
1. Have exactly 5 letters (akshara for Hindi, chars for English — after splitting).
2. Be in the language's word list (the `words` collection).
3. Not be a duplicate of a prior guess in this round (server has no session, so this is enforced client-side; not a security boundary).

If (1) or (2) fail, return `400 INVALID_WORD`. The frontend shakes the row instead of submitting.

---

## 7. Rate Limiting

Token bucket per IP, two buckets:

| Key                              | Tokens | Window |
|----------------------------------|--------|--------|
| `rate:guess:1m:{ip}`             | 10     | 60s    |
| `rate:guess:1d:{ip}`             | 100    | 24h    |

Implementation: Redis `INCR` + `EXPIRE` on first increment. Filter runs before `GuessController`. Exceeding either bucket → HTTP 429 with `Retry-After` header.

---

## 8. Frontend State Machine (game)

```
                ┌──────────┐
                │  PICKING │ (language picker shown)
                └────┬─────┘
                     │ user picks lang
                     ▼
                ┌──────────┐
                │ LOADING  │ (fetching /api/puzzles/today)
                └────┬─────┘
                     │ success
                     ▼
                ┌──────────┐
       ┌────────│  PLAYING │◄──────┐
       │        └────┬─────┘       │
       │             │             │
       │ correct     │ wrong/      │ submit
       │ guess       │ invalid     │ guess
       ▼             ▼             │
  ┌─────────┐  ┌─────────┐         │
  │   WON   │  │  LOST   │         │
  └────┬────┘  └────┬────┘         │
       │            │              │
       └────────────┴──────────────┘
                ▼
         ┌──────────┐
         │ COMPLETE │ (show result modal, share button)
         └──────────┘
```

State held in Zustand `gameStore`:

```ts
type GameMode = 'daily' | 'practice';

type GameState = {
  status: 'picking' | 'loading' | 'playing' | 'won' | 'lost';
  lang: Language | null;
  mode: GameMode | null;
  puzzleId: string | null;
  guesses: Array<{ letters: string[]; statuses: LetterStatus[] }>;
  currentInput: string[];          // akshara/chars composed so far
  attemptsRemaining: number;       // starts at 6
  revealedWord: string | null;
};
```

After a round ends, the result modal offers:
- **Daily completed** → "Share" + "Play Practice" + (next day) "Daily resets in HH:MM:SS".
- **Practice completed** → "Play another" (starts a new Practice round in the same language) + "Back to menu".

Streak updates only fire on `mode === 'daily'`.

---

## 9. Error Envelope

All API responses use:

```json
{ "data": { ... } }
```
or
```json
{ "error": { "code": "INVALID_WORD", "message": "Not a recognized word" } }
```

Error codes (closed set):

| Code               | HTTP | Meaning                                  |
|--------------------|------|------------------------------------------|
| INVALID_LANGUAGE   | 400  | `lang` not in {hi, en}                   |
| INVALID_GUESS_FORMAT| 400 | Wrong length or disallowed characters    |
| INVALID_WORD       | 400  | Well-formed but not in dictionary        |
| PUZZLE_NOT_FOUND   | 404  | No puzzle for date (shouldn't happen)    |
| RATE_LIMITED       | 429  | Too many requests                        |
| INTERNAL           | 500  | Catch-all; logged                        |

---

## 10. Logging

- **Request log:** path, method, status, latency (ms), IP hash.
- **NEVER log:** the daily word, raw guesses for valid puzzles, IPs (only SHA-256 truncated to 8 chars).
- **Format:** JSON lines. Spring Boot's default logback config replaced with `logback-spring.xml` producing JSON.
- **Levels:** `INFO` for requests, `WARN` for 4xx, `ERROR` for 5xx with stack.

---

## 11. Testing Strategy

| Layer          | Tooling                          | What we test                                  |
|----------------|----------------------------------|-----------------------------------------------|
| Backend unit   | JUnit 5, AssertJ, Mockito        | Grader, akshara splitter, selector            |
| Backend slice  | `@WebMvcTest`, `@DataMongoTest`  | Controllers, repositories                     |
| Backend integration | Testcontainers (Mongo, Redis)| End-to-end happy paths + rate limit           |
| Frontend unit  | Vitest                           | Akshara splitter, grader, time helpers        |
| Frontend component | React Testing Library         | Tile grid, keyboard input, game store         |
| Frontend e2e   | Playwright (later)               | Full round in Hindi + English                 |

**Required test corpora** (live in `data/`):
- `akshara-tests.json` — 100+ Hindi words with expected splits
- `grading-tests.json` — answer + guess + expected statuses (covers duplicates)

---

## 12. Build & Run

### Backend
```bash
cd api
./mvnw clean verify       # build + tests
./mvnw spring-boot:run    # local run on :8080
```

`application-local.yml` points to `mongodb://localhost:27017/chauki` and `redis://localhost:6379`.

### Frontend
```bash
cd web
pnpm install
pnpm dev                  # vite on :5173
pnpm test                 # vitest
pnpm build                # production bundle to dist/
```

`VITE_API_BASE_URL` controls the API endpoint (defaults to `http://localhost:8080`).
