# Chauki (चौकी)

> A bilingual daily Wordle in **Hindi** and **English**.
> One puzzle per language per day. Six guesses. Same words globally.

---

## What is Chauki?

Chauki is a Wordle-style word-guessing game with first-class support for both **Hindi (हिन्दी)** and **English**. Players pick their language before each round; streaks are tracked separately per language.

- **Hindi mode** uses akshara-aware logic so a 5-letter word means 5 akshara, not 5 Unicode code points.
- **English mode** is the classic 5-letter Wordle experience.
- Two daily puzzles, same words for every player worldwide on a given date.

## Tech stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind + Framer Motion (PWA)
- **Backend:** Java 17 + Spring Boot 3 (Maven)
- **Data:** MongoDB 7 (word lists, plays) + Redis 7 (daily word cache, rate limits)
- **Hosting:** Vercel (web) + Railway (api + Mongo + Redis)

## Repository layout

```
chauki/
├── CLAUDE.md            # full context for Claude Code — read first
├── docs/                # HLD, LLD, API spec, data model, etc.
├── web/                 # React frontend (Vite)
├── api/                 # Spring Boot backend (Maven)
└── data/                # Hindi + English word lists (JSON)
```

## Quick start (after scaffolding)

### Backend
```bash
cd api
./mvnw spring-boot:run
# API on http://localhost:8080
```

### Frontend
```bash
cd web
pnpm install
pnpm dev
# Web on http://localhost:5173
```

You'll need MongoDB and Redis running locally (or use the `docker-compose.yml` from `docs/deployment.md`).

## Documentation map

| Document                                          | Purpose                                              |
|---------------------------------------------------|------------------------------------------------------|
| [CLAUDE.md](./CLAUDE.md)                          | Single source of truth for Claude Code               |
| [docs/HLD.md](./docs/HLD.md)                      | High-level design                                    |
| [docs/LLD.md](./docs/LLD.md)                      | Low-level design, algorithms                         |
| [docs/architecture.md](./docs/architecture.md)    | System diagrams, data flow                           |
| [docs/api-spec.md](./docs/api-spec.md)            | REST contract                                        |
| [docs/data-model.md](./docs/data-model.md)        | MongoDB collections, Redis keys                      |
| [docs/frontend-components.md](./docs/frontend-components.md) | Component tree, state stores              |
| [docs/word-list.md](./docs/word-list.md)          | Hindi + English word sourcing                        |
| [docs/deployment.md](./docs/deployment.md)        | CI/CD, infra, env vars                               |

## License

TBD.
