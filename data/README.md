# Chauki word data

This directory holds the source-of-truth word lists shipped with the repo.

| File                   | Pool       | Lang | Notes                                                |
|------------------------|------------|------|------------------------------------------------------|
| `words-hi.json`        | Practice   | hi   | All 5-akshara Hindi words. Loaded into `words`.      |
| `words-hi-daily.json`  | Daily      | hi   | Top-frequency subset of `words-hi.json`.             |
| `words-en.json`        | Practice   | en   | All 5-letter English words. Loaded into `words`.     |
| `words-en-daily.json`  | Daily      | en   | Wordle answer-list subset of `words-en.json`.        |
| `akshara-tests.json`   | shared     | hi   | Test corpus for the akshara splitter. JUnit+Vitest.  |
| `grading-tests.json`   | shared     | both | Test corpus for the guess grader (duplicate-letter). |

**Format** (`words-*.json`): array of `{ "text": "...", "frequencyRank": <int|null> }`.

`text` is NFC-normalized. Hindi entries split to exactly 5 akshara via the regex
in `web/src/lib/akshara.ts` / `api/.../AksharaUtil.java`.

These seeded files are **starter-sized**, not the production corpus. The full
sourcing/cleaning pipeline lives in `tools/build-words-*.mjs` (per
`docs/word-list.md`) and produces the real `v1` lists.

Never edit these by hand once `tools/build-words-*.mjs` exists — always
regenerate, per `docs/word-list.md` §7.
