# Chauki — Word List Strategy

> The single biggest determinant of game feel. Bad word lists = unfair puzzles, dropped players. This doc covers sourcing, cleaning, and validating the Hindi and English word pools.

---

## 1. Goals

- **Hindi (`data/words-hi.json`):** 5,000+ five-akshara Hindi words. Common enough that an average Hindi reader can recognize 80% on sight. No proper nouns, no slurs, no transliterated English ("कंप्यूटर"), no archaic forms.
- **English (`data/words-en.json`):** 5,000+ five-letter English words. The official Wordle answer list (~2,300 words) is too small to support unlimited Practice; we use a larger curated list.
- **No overlap concerns** — the lists are independent.

---

## 2. File format

Both files use the same JSON shape:

```json
[
  { "text": "नमस्ते", "frequencyRank": 142 },
  { "text": "कमल",   "frequencyRank": 89 },
  ...
]
```

- `text` — NFC-normalized raw string.
- `frequencyRank` — integer, lower = more common. From a frequency corpus (see §4). Nullable; entries without rank go last when sorted.

The `WordLoader` at boot upserts each into MongoDB with computed `letters[]` and `length`.

---

## 3. Sourcing — Hindi

### Primary source

**Wiktionary Hindi word frequency lists** (CC-BY-SA, public domain compatible attribution):
- `https://hi.wiktionary.org/wiki/विक्षनरी:आवृत्ति_सूची`
- Extract via the dump API; do not scrape pages.

### Secondary sources (for filling out the list)

- **HindiWordNet** (IIT Bombay) — academic license; check attribution requirements.
- **Indic NLP word lists** (e.g., `anoopkunchukuttan/indic_nlp_library` data files) — covers many Indic words.
- **News corpus frequency lists** — Times of India / Dainik Bhaskar archive frequency counts (commercial use grey area; use only for *frequency ranking*, not as a source of words).

### Filtering rules (applied by `tools/build-words-hi.mjs`)

1. NFC-normalize.
2. Split into akshara with the shared `splitAkshara` function.
3. Keep only entries with exactly 5 akshara.
4. Reject if any akshara contains characters outside Devanagari block `[ऀ-ॿ]`.
5. Reject entries starting with capital-equivalent (proper noun heuristic): if first akshara is rare and the word is rare overall, drop.
6. Reject from `data/hi-stoplist.json` — manually curated list of slurs, communal terms, regional dialects too narrow for a national game.
7. Reject transliterations: words that appear in `data/hi-transliterations.json` (computed by checking if the word's Wiktionary entry says "borrowed from English").
8. Dedupe by NFC text.
9. Sort by ascending `frequencyRank` (most common first).
10. Cap at top 8,000 — beyond that, words get too obscure for a daily game.

### Manual review

Before shipping `words-hi.v1.json`, two native Hindi speakers spot-check 200 random entries. Anything flagged goes to `hi-stoplist.json` and the build is re-run.

---

## 4. Sourcing — English

### Primary source

**Wordle's answer + guess list** (combined ~12k words) — widely mirrored, public.

### Filtering rules (applied by `tools/build-words-en.mjs`)

1. Lowercase, ASCII only.
2. Keep only length === 5.
3. Reject anything in `data/en-stoplist.json` (slurs, plurals of slurs, archaic).
4. Reject proper nouns: rejected if it appears capitalized 95%+ of the time in a frequency corpus.
5. Dedupe.
6. Sort by frequency rank (Google Books n-grams 5-letter words, descending freq).
7. Cap at top 8,000.

The official Wordle *answer* list (~2,300) is the curated "common enough" subset. We use that as the **Daily pool**, and the larger ~8,000 list as the **Practice pool** (so Practice has more variety but Daily stays fair).

---

## 5. Daily vs Practice pool

To avoid Daily ever picking a niche word, the data is split:

```
data/
├── words-hi.json           ← all 5-akshara Hindi words (Practice pool)
├── words-hi-daily.json     ← top 2,000 by frequency (Daily pool)
├── words-en.json           ← all 5-letter English words (Practice pool)
└── words-en-daily.json     ← Wordle answer list (Daily pool)
```

- `WordLoader` loads **both** lists per language. The `daily-pool` field on `WordDocument` is set to `true` for words in the daily file.
- `DailyWordSelector` filters by `lang AND dailyPool=true`.
- `PracticeWordSelector` filters by `lang` only (no `dailyPool` constraint).
- Validation (is-this-a-real-word) accepts **any** word in either pool — never block a valid guess just because it's "Practice-only".

---

## 6. Validation tests

Run as part of CI:

| Test                                                  | Tool          |
|-------------------------------------------------------|---------------|
| Every entry's `splitAkshara(text).length === 5` (hi)  | Node script   |
| Every entry's `text.length === 5` (en)                | Node script   |
| No dupes within file                                  | Node script   |
| All entries pass akshara-tests for split consistency  | Node script   |
| Daily pool ⊆ Practice pool                            | Node script   |
| Stoplist intersection with word list = ∅              | Node script   |

Failure = CI red. The script is in `tools/validate-words.mjs`.

---

## 7. Updating the list

```
1. Edit data/hi-stoplist.json (or whichever).
2. Run: node tools/build-words-hi.mjs
3. Run: node tools/validate-words.mjs
4. If validation passes, commit data/words-hi.v2.json.
5. Bump CHAUKI_WORD_LIST_VERSION=v2 in deployment env.
6. Restart API. WordLoader re-upserts (old retired docs stay).
```

**Never** edit `words-hi.json` by hand — always regenerate from sources. Hand-editing introduces inconsistencies that break the split-equivalence tests.

---

## 8. Edge cases

- **Conjuncts:** Words like "क्रांति" — 2 akshara — would be rejected by the length filter, correctly.
- **Numbers / digits:** Rejected by character-class filter.
- **ZWJ / ZWNJ:** Stripped during normalization.
- **Visually identical akshara:** Hindi has near-homographs (e.g., श vs. ष). Keep both; they're distinct in pronunciation.
- **Common typos in source:** Filter against a known-good NFD ↔ NFC mismatch list.

---

## 9. Open questions (not blocking MVP)

- Should Daily skip a previously-used word for ~90 days? Currently relies on pool size + blocklist. Re-evaluate after launch.
- Add themed weeks (festivals, body parts, foods)? Architecture allows it via a `themeTag` field on `WordDocument` — not implemented for MVP.
- Crowdsource word suggestions? Risky for quality control — wait for traction first.
