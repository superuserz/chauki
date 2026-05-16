# Chauki — Deployment Guide

> How to take Chauki from "works on my machine" to "anyone can play it." Covers local dev, CI, prod infra, and operational runbook.

---

## 1. Local development

### Prerequisites
- **Node 20+** with `pnpm` (`npm i -g pnpm`)
- **JDK 17** (Temurin or Liberica) — verify with `java -version`
- **Docker Desktop** (or Podman) — for Mongo + Redis containers
- **Git**

### One-time setup

```bash
git clone <repo-url> chauki
cd chauki

# Spin up Mongo + Redis
docker compose -f docker-compose.dev.yml up -d

# Seed Mongo with the word lists
cd api
./mvnw spring-boot:run -Dspring-boot.run.arguments=--bootstrap-only
# This loads words-hi.json + words-en.json into the local Mongo and exits.

# Frontend deps
cd ../web
pnpm install
```

### `docker-compose.dev.yml`

```yaml
services:
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  mongo_data:
```

### Run

Two terminals:

```bash
# Terminal 1 — API
cd api
./mvnw spring-boot:run
# http://localhost:8080

# Terminal 2 — Web
cd web
pnpm dev
# http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:8080` (configured in `vite.config.ts`), so the web app calls relative URLs and there's no CORS in dev.

---

## 2. Environment variables

### Backend (`api/.env` or platform env)

| Variable                  | Required | Example                                       | Notes                          |
|---------------------------|----------|-----------------------------------------------|--------------------------------|
| `MONGODB_URI`             | yes      | `mongodb+srv://user:pw@cluster.mongodb.net/chauki` | Atlas connection string  |
| `REDIS_URL`               | yes      | `rediss://default:pw@host:6379`               | Upstash URL                    |
| `CHAUKI_SEED`             | yes      | 64 hex chars                                  | Generate once; never rotate    |
| `CHAUKI_DAILY_SALT`       | yes      | random string                                 | Rotated daily via cron (optional) |
| `CHAUKI_CORS_ORIGINS`     | yes      | `https://chauki.app`                          | Comma-separated                |
| `CHAUKI_WORD_LIST_VERSION`| no       | `v1`                                          | Defaults to latest version     |
| `SERVER_PORT`             | no       | `8080`                                        | Railway provides `PORT`        |
| `SPRING_PROFILES_ACTIVE`  | yes      | `prod`                                        | Selects `application-prod.yml` |

### Frontend (`web/.env.production`)

| Variable             | Required | Example                       | Notes                       |
|----------------------|----------|-------------------------------|-----------------------------|
| `VITE_API_BASE_URL`  | no       | `https://api.chauki.app`      | Leave blank to use same-origin rewrite |
| `VITE_PLAUSIBLE_DOMAIN` | no    | `chauki.app`                  | Phase 2                     |

`.env.local` is git-ignored. `.env.example` is committed with placeholders.

---

## 3. Production infrastructure

### 3.1 Frontend — Vercel

- Connect the GitHub repo.
- Root directory: `web/`
- Framework preset: **Vite**.
- Build command: `pnpm build`
- Output directory: `dist`
- Add a rewrite in `vercel.json`:
  ```json
  {
    "rewrites": [
      { "source": "/api/:path*", "destination": "https://api.chauki.app/api/:path*" }
    ],
    "headers": [
      {
        "source": "/(.*)",
        "headers": [
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
        ]
      }
    ]
  }
  ```
- Domain: `chauki.app` apex + `www.chauki.app` redirect.
- Preview deploys: enabled per PR.

### 3.2 Backend — Railway

- New project → Deploy from GitHub → root `api/`.
- Builder: **Nixpacks** (auto-detects Maven; runs `./mvnw package` and `java -jar target/*.jar`).
- Add environment variables (see §2).
- Custom domain: `api.chauki.app` (Railway auto-provisions TLS).
- Health check path: `/api/health` — Railway uses this for zero-downtime deploys.
- Restart policy: on failure, max 3 retries.

### 3.3 MongoDB — Atlas

- Free tier M0 cluster, region: closest to Railway region (e.g., `aws-us-east-1`).
- IP allowlist: Railway egress IPs (Railway publishes these) + your dev IP.
- DB user: `chauki-api` with `readWrite` on `chauki` only.
- Backups: free-tier daily, 7-day retention. Verified once per quarter by restoring to a scratch cluster.

### 3.4 Redis — Upstash

- Free tier, region matching Railway.
- Single database, default name `chauki`.
- Eviction policy: `allkeys-lru`.
- Daily-snapshot persistence: enabled (cheap insurance).

---

## 4. CI/CD

### GitHub Actions (`.github/workflows/ci.yml`)

```yaml
name: ci
on:
  push: { branches: [main] }
  pull_request:
jobs:
  api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: 17, distribution: temurin, cache: maven }
      - run: ./mvnw -B verify
        working-directory: api
      - name: Validate word lists
        run: node tools/validate-words.mjs

  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, cache-dependency-path: web/pnpm-lock.yaml }
      - run: pnpm install --frozen-lockfile
        working-directory: web
      - run: pnpm typecheck && pnpm test && pnpm build
        working-directory: web

  guard-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check no daily word leaks
        run: |
          ! grep -rEi "(CHAUKI_SEED|daily.*word.*=)" --include="*.{ts,tsx,java,json,md}" .
```

### Deploy

- **Web:** Vercel auto-deploys `main` to production; PRs get preview URLs.
- **API:** Railway auto-deploys `main` after CI passes. Rollback via Railway's "Redeploy previous" button.

---

## 5. Domain & DNS

- Apex `chauki.app` → Vercel (A/AAAA records).
- `www.chauki.app` → Vercel (redirect to apex).
- `api.chauki.app` → Railway (CNAME).
- TLS: Vercel + Railway both auto-issue via Let's Encrypt.

---

## 6. Observability

### Logs
- API: stdout JSON lines; Railway aggregates them.
- Web: client errors → Sentry (phase 2). For MVP, console only.

### Metrics
- API: Spring Boot Actuator + Micrometer → exposed at `/api/admin/metrics` (basic auth).
- Vercel analytics (free tier) for web vitals.

### Alerts (phase 2)
- Railway: alert on >5 5xx/min.
- Uptime: UptimeRobot pinging `/api/health` every 5 min, alerting Slack/email.

---

## 7. Operational runbook

### Word fix needed (e.g., bad Daily word for tomorrow)
1. Add the offending wordId to `daily_blocklist` via the admin tool:
   ```
   ./api/scripts/block-word.sh hi:abc123... "ambiguous spelling"
   ```
2. Flush Redis key `chauki:puzzle:daily:<date>:<lang>`.
3. Confirm new word with: `curl https://api.chauki.app/api/puzzles/today?lang=hi`
4. The new Daily takes effect at next UTC midnight, OR immediately if the cache is flushed before any player loads it.

### Mongo down
- API health check fails → Railway holds the deploy.
- Users see "Loading…" indefinitely on first puzzle fetch; Daily PWA cache covers returning users for the rest of the day.
- Atlas typically heals in <5 min; if longer, switch to Atlas's standby (paid tier; not in MVP).

### Redis down
- Cache misses bypass to Mongo for each Daily fetch — slow but correct.
- Rate limits silently disabled (fail-open). Acceptable for short outages.
- Practice rounds in-flight are lost (puzzle answer was only in Redis); players must start new ones.

### Seed compromised
- Rotate `CHAUKI_SEED`. **This changes all future Daily picks** — players who haven't played today's puzzle will get a different word post-rotation, which is confusing.
- Coordinate rotation with a maintenance window if possible.

### Word list rollback
- Set `CHAUKI_WORD_LIST_VERSION=v1` env var.
- Restart API. `WordLoader` re-loads the older list (retired docs become un-retired).

---

## 8. Cost estimate (MVP)

| Service        | Tier      | Cost     |
|----------------|-----------|----------|
| Vercel         | Hobby     | $0       |
| Railway        | Starter   | $5/mo    |
| MongoDB Atlas  | M0        | $0       |
| Upstash Redis  | Free      | $0       |
| Domain (.app)  | annual    | ~$15/yr  |
| **Total**      |           | **~$5/mo + domain** |

Comfortable until ~10k DAU. Beyond that, expect to bump Railway and Atlas tiers.

---

## 9. Pre-launch checklist

- [ ] `CHAUKI_SEED` set in Railway env, not committed
- [ ] CORS allowed origins limited to production domain
- [ ] Rate limits verified with a load test (`./tools/loadtest.sh`)
- [ ] Word lists validated and committed (`tools/validate-words.mjs` green)
- [ ] Daily and Practice flows tested end-to-end in both languages
- [ ] PWA manifest icons in all sizes (192, 512, maskable)
- [ ] `robots.txt` allows indexing; `sitemap.xml` lists `/`
- [ ] Privacy policy page (links to: no PII collected, localStorage usage)
- [ ] Stoplists reviewed by two native speakers
- [ ] Uptime monitor active
- [ ] 7-day backup retention confirmed on Atlas
