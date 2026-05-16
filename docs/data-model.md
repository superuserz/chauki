# Chauki — Data Model

> MongoDB collections + Redis keys. Schema described in JSON Schema-ish notation. Spring Data Mongo annotations shown for the Java side.

---

## MongoDB

Database name: `chauki`

### Collection: `words`

Holds every valid playable word for both languages. Source of truth at runtime.

**Document shape:**

```json
{
  "_id": "hi:a1b2c3d4e5f60718",
  "lang": "hi",
  "text": "नमस्ते",
  "letters": ["न", "म", "स्ते"],
  "length": 3,
  "frequencyRank": 142,
  "addedAt": "2026-05-16T12:00:00Z",
  "sourceList": "words-hi.v1.json"
}
```

| Field           | Type     | Notes                                                          |
|-----------------|----------|----------------------------------------------------------------|
| `_id`           | string   | `{lang}:{sha256(text).substring(0,16)}` — deterministic        |
| `lang`          | enum     | `"hi" \| "en"`                                                 |
| `text`          | string   | NFC-normalized raw word                                        |
| `letters`       | string[] | Akshara (hi) or chars (en); length must equal `length`         |
| `length`        | int      | MVP: always 5                                                  |
| `frequencyRank` | int?     | Lower = more common; nullable                                  |
| `addedAt`       | Instant  | First time it was upserted                                     |
| `sourceList`    | string   | Which `data/words-*.json` it came from (for audit)             |

**Indexes:**

```js
db.words.createIndex({ lang: 1, _id: 1 });           // pool fetch
db.words.createIndex({ lang: 1, text: 1 }, { unique: true });  // dictionary lookup
db.words.createIndex({ lang: 1, length: 1 });        // future: word length variants
```

**Spring Data class:**

```java
@Document(collection = "words")
public record WordDocument(
    @Id String id,
    @Indexed Language lang,
    String text,
    List<String> letters,
    int length,
    Integer frequencyRank,
    Instant addedAt,
    String sourceList
) {}
```

---

### Collection: `daily_blocklist`

Words that should never appear as the Daily answer (slurs, ambiguous, recently used, etc.). The `DailyWordSelector` filters these out before computing the modulo.

```json
{
  "_id": "hi:abc123...",
  "wordId": "hi:abc123...",
  "reason": "ambiguous spelling",
  "blockedAt": "2026-05-10T00:00:00Z",
  "blockedBy": "admin"
}
```

| Field       | Type    | Notes                                |
|-------------|---------|--------------------------------------|
| `_id`       | string  | Same as `wordId` to keep set semantics|
| `wordId`    | string  | Matches `words._id`                  |
| `reason`    | string  | Human-readable                       |
| `blockedAt` | Instant |                                      |
| `blockedBy` | string  | Operator                             |

A blocked word is still a **valid guess** (players can guess it), it's just never selected as the answer.

**Indexes:** `_id` only (default).

---

### Collection: `plays` *(phase 2 — anonymized telemetry)*

Out of MVP scope. Documented here so the model is forward-compatible.

```json
{
  "_id": "...",
  "anonId": "uuid",              // localStorage-generated, no PII
  "mode": "DAILY",
  "lang": "hi",
  "puzzleId": "daily:2026-05-16:hi",
  "guesses": 4,
  "solved": true,
  "playedAt": "2026-05-16T12:34:56Z"
}
```

When introduced, it powers global stats ("X% of players solved today's Hindi Daily") without identifying anyone.

---

## Redis

Single keyspace. All keys prefixed `chauki:`.

### Daily puzzle cache

```
key:   chauki:puzzle:daily:{yyyy-mm-dd}:{lang}
type:  JSON string
value: { "puzzleId": "...", "wordId": "...", "letters": ["..."], "dailyNumber": 134 }
ttl:   86400 + 3600  (24h + 1h buffer)
```

Set on first read of the day; reused for every subsequent request on that date/lang.

### Practice puzzle cache

```
key:   chauki:puzzle:practice:{uuidv7}
type:  JSON string
value: { "puzzleId": "...", "wordId": "...", "letters": ["..."], "lang": "hi" }
ttl:   3600  (1 hour — abandoned puzzles expire)
```

Created on `POST /api/puzzles/practice`. Read on each `POST /api/guess` for that puzzleId.

### Rate limit buckets

```
key:   chauki:rate:guess:1m:{ipHash}
type:  integer (INCR)
ttl:   60s   (set on first INCR, never refreshed)
limit: 10

key:   chauki:rate:guess:1d:{ipHash}
type:  integer (INCR)
ttl:   86400
limit: 200
```

`ipHash = sha256(ip + DAILY_SALT).substring(0, 16)` — rotated daily so historical hashes can't be correlated.

### Daily number counter

```
key:   chauki:daily-number:{lang}
type:  integer
```

Manually seeded at launch (`SET chauki:daily-number:hi 1`). Auto-incremented by a UTC-midnight job (when added). MVP can compute on the fly: `dailyNumber = (today - launchDate).days + 1`.

### Bootstrap flag

```
key:   chauki:bootstrap:done
type:  string "true"
ttl:   none (persistent)
```

Set after `WordLoader` finishes its first successful load. Health endpoint checks this before returning 200.

---

## Application properties (`application.yml`)

```yaml
chauki:
  seed: ${CHAUKI_SEED:dev-only-do-not-use}      # 32+ random bytes hex
  daily-salt: ${CHAUKI_DAILY_SALT:dev-salt}     # rotated daily by env var bump
  launch-date: 2026-05-16
  mode:
    daily: true
    practice: true
  cors:
    allowed-origins: ${CHAUKI_CORS_ORIGINS:http://localhost:5173}

spring:
  data:
    mongodb:
      uri: ${MONGODB_URI:mongodb://localhost:27017/chauki}
  data.redis:
    url: ${REDIS_URL:redis://localhost:6379}
```

---

## Data sizing estimates

| Item                          | Size         | Notes                                  |
|-------------------------------|--------------|----------------------------------------|
| Single `WordDocument`         | ~250 bytes   | Hindi avg slightly larger              |
| 10,000 Hindi + 10,000 English | ~5 MB        | Comfortable for free-tier Atlas        |
| Daily puzzle cache            | ~200 bytes/d | Trivial                                |
| Practice cache, peak          | ~10k entries | ~2 MB at peak; Upstash free tier OK    |

---

## Migrations

No traditional migrations — MongoDB schemaless + `WordLoader` upserts. Word list versioning:

1. Add `data/words-hi.v2.json` (do not modify v1).
2. Bump `CHAUKI_WORD_LIST_VERSION` env var to `v2`.
3. `WordLoader` reads the version env var and loads the matching file.
4. Old word docs that no longer appear in the new list are **kept** (so historical Daily answers stay reproducible) but marked `retired: true`.
5. Daily selector excludes `retired: true` from new picks via the existing blocklist mechanism.

---

## Backups

- MongoDB Atlas: daily automated backups, 7-day retention (free tier).
- Redis (Upstash): not backed up; treated as cache. Loss = a regenerated Daily puzzle (same word, deterministic) + cleared Practice rounds in flight.
- `data/words-*.json`: source-controlled in git. Recoverable from any clone.
