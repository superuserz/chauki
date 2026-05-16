# Chauki — REST API Specification

> Base URL (prod): `https://api.chauki.app/api`
> Base URL (dev):  `http://localhost:8080/api`
> All requests/responses are JSON. UTF-8. `Content-Type: application/json` required for POSTs.

---

## Conventions

### Envelope

Every response body has one of these shapes:

**Success:**
```json
{ "data": { ... } }
```

**Error:**
```json
{
  "error": {
    "code": "INVALID_WORD",
    "message": "Not a recognized Hindi word",
    "details": { "guess": "abcde" }
  }
}
```

### Status codes

| Code | When                                        |
|------|---------------------------------------------|
| 200  | Successful read                             |
| 201  | Resource created (e.g., Practice puzzle)    |
| 400  | Validation / client error                   |
| 404  | Resource missing                            |
| 429  | Rate-limited (header: `Retry-After`)        |
| 500  | Server bug; logged                          |

### Headers

| Header                | Direction | Purpose                                   |
|-----------------------|-----------|-------------------------------------------|
| `Content-Type`        | both      | `application/json; charset=utf-8`         |
| `X-Request-Id`        | both      | UUID echoed back for tracing              |
| `Retry-After`         | response  | Seconds to wait when 429                  |
| `Cache-Control`       | response  | `no-store` on all endpoints (no proxies)  |

---

## Endpoints

### 1. `GET /api/health`

Sanity check.

**Response 200:**
```json
{ "data": { "status": "ok", "version": "1.0.0", "uptimeSeconds": 12345 } }
```

---

### 2. `GET /api/puzzles/today`

Fetch today's Daily puzzle metadata for a language. Idempotent. Cached server-side until UTC midnight.

**Query params:**
| Name | Type             | Required | Notes                             |
|------|------------------|----------|-----------------------------------|
| lang | `"hi" \| "en"`   | yes      | Language for the Daily puzzle     |

**Response 200:**
```json
{
  "data": {
    "puzzleId": "daily:2026-05-16:hi",
    "mode": "DAILY",
    "lang": "hi",
    "length": 5,
    "dailyNumber": 134,
    "resetsAtUtc": "2026-05-17T00:00:00Z"
  }
}
```

| Field          | Type     | Notes                                              |
|----------------|----------|----------------------------------------------------|
| `puzzleId`     | string   | Opaque; pass back to `/api/guess`                  |
| `mode`         | enum     | Always `DAILY` for this endpoint                   |
| `lang`         | enum     | `hi` or `en`                                       |
| `length`       | integer  | Always 5 in MVP                                    |
| `dailyNumber`  | integer  | "Daily #N" since launch. Useful for share text.    |
| `resetsAtUtc`  | ISO 8601 | When the next Daily becomes available              |

**Errors:**
- 400 `INVALID_LANGUAGE` — `lang` missing or not in enum.

---

### 3. `POST /api/puzzles/practice`

Create a fresh Practice puzzle. Each call returns a new random word from the language pool.

**Request body:**
```json
{
  "lang": "hi",
  "excludeRecent": ["abc1234567890def", "fed0987654321cba"]
}
```

| Field             | Type           | Required | Notes                                                  |
|-------------------|----------------|----------|--------------------------------------------------------|
| `lang`            | `"hi" \| "en"` | yes      | Language for the Practice puzzle                       |
| `excludeRecent`   | string[]       | no       | Up to 50 recently-seen `wordId`s to avoid repeating    |

**Response 201:**
```json
{
  "data": {
    "puzzleId": "practice:01HV9F2K3M4N5P6Q7R8S9T",
    "mode": "PRACTICE",
    "lang": "hi",
    "length": 5
  }
}
```

PuzzleIds for Practice are UUIDv7 — time-sortable, unique. Server caches the answer in Redis with a 1-hour TTL; if the player abandons mid-round, the puzzle expires.

**Errors:**
- 400 `INVALID_LANGUAGE`
- 400 `INVALID_EXCLUDE_LIST` — list > 50 entries
- 429 `RATE_LIMITED`
- 500 `INTERNAL` — pool exhausted (excludeRecent covers all words). Server falls back to ignoring excludeRecent before erroring.

---

### 4. `POST /api/guess`

Submit a guess against a puzzle (Daily or Practice).

**Request body:**
```json
{
  "puzzleId": "daily:2026-05-16:hi",
  "guess": "नमस्ते",
  "attemptIndex": 0
}
```

| Field           | Type    | Required | Notes                                                             |
|-----------------|---------|----------|-------------------------------------------------------------------|
| `puzzleId`      | string  | yes      | From `/api/puzzles/today` or `/api/puzzles/practice`              |
| `guess`         | string  | yes      | Raw word string. Server splits by language.                       |
| `attemptIndex`  | integer | yes      | 0-5; for logging only — server doesn't enforce sequence           |

**Response 200:**
```json
{
  "data": {
    "statuses": ["CORRECT", "PRESENT", "ABSENT", "ABSENT", "CORRECT"],
    "isSolved": false,
    "attemptsUsed": 1,
    "attemptsRemaining": 5,
    "revealedWord": null
  }
}
```

| Field               | Type                          | Notes                                                  |
|---------------------|-------------------------------|--------------------------------------------------------|
| `statuses`          | `LetterStatus[]` of length 5  | One per letter position                                |
| `isSolved`          | boolean                       | True when all statuses are CORRECT                     |
| `attemptsUsed`      | integer                       | Matches `attemptIndex + 1` typically                   |
| `attemptsRemaining` | integer                       | 5..0                                                   |
| `revealedWord`      | string \| null                | Set when `isSolved` or `attemptsUsed === 6`. Else null |

`LetterStatus` ∈ `"CORRECT" | "PRESENT" | "ABSENT"`.

**Errors:**
- 400 `INVALID_GUESS_FORMAT` — wrong length, disallowed characters
- 400 `INVALID_WORD` — well-formed but not in dictionary
- 404 `PUZZLE_NOT_FOUND` — `puzzleId` expired (Practice TTL) or unknown
- 429 `RATE_LIMITED`

**Notes:**
- The server is stateless about a *player's* progress. It validates `guess` against the puzzle's answer and returns statuses. The client tracks attempt counts.
- For Daily puzzles, the API does not prevent submitting the same guess twice — that's a UX concern; the client should warn.
- For Practice, the puzzleId is single-round but multi-guess. Six guesses against the same puzzleId is the contract; nothing prevents more, but the client should not allow it.

---

### 5. `GET /api/puzzles/{puzzleId}` *(optional — phase 2)*

Re-fetch metadata for a puzzleId. Useful for share-link replays, where someone opens a shared result. **Does not reveal the answer.**

**Response 200:**
```json
{
  "data": {
    "puzzleId": "daily:2026-05-16:hi",
    "mode": "DAILY",
    "lang": "hi",
    "length": 5,
    "dailyNumber": 134
  }
}
```

Errors mirror `/api/puzzles/today` plus 404 for expired Practice puzzles.

---

## Rate limits

Two buckets per IP, both apply to `POST /api/guess` and `POST /api/puzzles/practice`:

| Bucket          | Limit          | Window | Header on 429              |
|-----------------|----------------|--------|----------------------------|
| Short           | 10 requests    | 60 s   | `Retry-After: <seconds>`   |
| Long            | 200 requests   | 24 h   | `Retry-After: <seconds>`   |

`GET` endpoints are unlimited (cached, cheap). `OPTIONS` (CORS preflight) is always free.

---

## Error code reference

| Code                  | HTTP | Meaning                                         |
|-----------------------|------|-------------------------------------------------|
| `INVALID_LANGUAGE`    | 400  | `lang` missing or not in `{hi, en}`             |
| `INVALID_GUESS_FORMAT`| 400  | Length mismatch or disallowed characters        |
| `INVALID_WORD`        | 400  | Well-formed but not in the dictionary           |
| `INVALID_EXCLUDE_LIST`| 400  | `excludeRecent` length > 50                     |
| `PUZZLE_NOT_FOUND`    | 404  | Unknown or expired puzzleId                     |
| `RATE_LIMITED`        | 429  | Bucket exhausted; obey `Retry-After`            |
| `INTERNAL`            | 500  | Unhandled exception; logged with `requestId`    |

---

## OpenAPI

Spring Boot serves an OpenAPI 3 spec at `/v3/api-docs` and Swagger UI at `/swagger-ui.html` (dev profile only). The committed file `api/openapi.yaml` is regenerated by `./mvnw verify` and used by the frontend's type-generator to keep `web/src/types/api.ts` in sync.

---

## Example end-to-end flow

```http
GET /api/puzzles/today?lang=hi
→ 200 { data: { puzzleId: "daily:2026-05-16:hi", ... } }

POST /api/guess
Content-Type: application/json
{
  "puzzleId": "daily:2026-05-16:hi",
  "guess": "कमल",
  "attemptIndex": 0
}
→ 200 { data: { statuses: ["ABSENT","PRESENT","CORRECT"], isSolved: false, ... } }
```

(In real Hindi gameplay the guess would have 5 akshara; example shortened for readability.)
