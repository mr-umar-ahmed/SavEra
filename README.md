# SAVERA

Household electricity, water and LPG tracking for Bengaluru wards. SAVERA reduces consumption
through three research-backed mechanisms: **visibility** (what you use, broken down by
resource and estimated appliance), **anomaly alerts** (when a bill or a day's water use is
above your usual, and why), and **normative comparison** (how your ward compares, anonymised).

Honest labels: appliance breakdowns are rule-based estimates from BEE star-rating wattages and
your stated daily hours (not NILM); baselines and forecasts are plain statistics (mean,
standard deviation, rolling averages), not AI.

## Repository layout

| Path | What |
|---|---|
| `backend/` | FastAPI + asyncpg (raw SQL), Alembic migrations, services, APScheduler jobs, pytest suite |
| `frontend/` | Next.js 16 App Router, Tailwind 4, shadcn/ui, recharts, Supabase auth |
| `docs/SPEC.md` | The build brief (source of truth) |
| `docs/PHASE0_PLAN.md` | Locked stack, schema fixes, algorithms for the empty spec sections, API contract |
| `docs/phase0/` | Independent review-lens reports that fed the plan |
| `docker-compose.yml` | PostgreSQL 15 + TimescaleDB 2.28 and the backend |
| `scripts/dev-postgres.sh` | Portable PostgreSQL 15 + TimescaleDB for Windows machines without Docker |
| `FUTURE.md` | Ideas deliberately not built in the MVP |

## Quick start

### 1. Database

**Docker (any OS):**
```bash
cp .env.example .env
docker compose up -d db
```

**Windows without Docker** (installs a portable PostgreSQL 15.14 + TimescaleDB 2.28.3 under
`%LOCALAPPDATA%\savera`, listening on `127.0.0.1:55432`, and creates the `savera` and
`savera_test` databases):
```bash
bash scripts/dev-postgres.sh install
```

### 2. Backend
```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt      # macOS/Linux: .venv/bin/pip
cp ../.env.example .env                            # then fill in Supabase / GCV / Firebase values
.venv/Scripts/python -m alembic upgrade head
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```
Swagger UI: http://localhost:8000/docs. Run the tests with `.venv/Scripts/python -m pytest`
(needs `TEST_DATABASE_URL`, default `postgresql://postgres:postgres@127.0.0.1:55432/savera_test`;
the test session drops and recreates that database).

Local API calls without a Supabase project: set `SUPABASE_JWT_SECRET` in `.env` and mint a
token with `python scripts/mint_dev_token.py --email you@example.com`.

### 3. Frontend
```bash
cd frontend
npm install
cp ../.env.example .env.local                      # keep only the NEXT_PUBLIC_* lines
npm run dev
```
Open http://localhost:3000. `npm run typecheck`, `npm test` and `npm run build` are the gates.

### 4. Everything in Docker
```bash
docker compose up --build
```
runs migrations and starts the API on port 8000; run the frontend with `npm run dev`.

## Environment variables

See `.env.example` — every backend key is read by `backend/app/config.py`; only
`NEXT_PUBLIC_*` values reach the browser. Supabase projects created after 2025 sign tokens with
asymmetric keys (verified through the project JWKS); older projects use the HS256 JWT secret.
Both are supported.

## Delivery phases

| Phase | Scope | Tag |
|---|---|---|
| 0 | Plan (`docs/PHASE0_PLAN.md`) | — |
| 1 | Foundation: DB, auth, manual entry, OCR upload, seed | `mvp-phase-1-complete` |
| 2 | Intelligence: baselines, anomalies, LPG prediction, weather, tips, green score, push, jobs | `mvp-phase-2-complete` |
| 3 | UX: dashboard, resource pages, LPG, alerts, profile | `mvp-phase-3-complete` |
| 4 | Supervisor layer + anonymised peer comparison | `mvp-phase-4-complete` |
