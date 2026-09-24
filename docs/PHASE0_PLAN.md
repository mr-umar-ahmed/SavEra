# SAVERA MVP — Phase 0 Implementation Plan

Status: **Plan complete. Ready to begin Phase 1 on approval.**
(Approval received in-session on 2026-09-24: "continue with phase 1".)

This plan follows the exact structure demanded by `docs/SPEC.md` §Phase 0, and additionally
fills the sections that were empty in the brief (tech stack, §5.2 baseline, §5.5 weather,
API contract). Six independent review lenses were run over the spec before writing it; their
full reports (several verified directly against a local PostgreSQL 15.14 + TimescaleDB 2.28.3)
are archived in `docs/phase0/lens-*.md`. Every decision below is the adopted one; alternatives
are listed only where the user may want to veto.

---

## 0. Locked tech stack (fills the empty "Tech Stack — Locked" section)

| Layer | Choice | Version (verified 2026-09-24) |
|---|---|---|
| Language | Python | 3.14.6 (local), `python:3.14-slim` (Docker) |
| API | FastAPI + uvicorn (single worker) | 0.141.1 / 0.53.0 |
| DB driver | asyncpg, **raw SQL** for all queries (no ORM) | 0.31.0 |
| Migrations | Alembic with hand-written SQL; psycopg used **only** by Alembic | 1.20.0 / psycopg 3.3.6 |
| Database | PostgreSQL 15 + TimescaleDB | 15.14 + 2.28.3 (`timescale/timescaledb:2.28.3-pg15`, last release supporting PG15) |
| Auth | Supabase Auth (magic link + email/password). JWT verified server-side: ES256/RS256 via JWKS **and** HS256 via project secret | PyJWT[crypto] 2.15.0 |
| OCR | Google Cloud Vision REST (`images:annotate`, DOCUMENT_TEXT_DETECTION, API key) + Tesseract fallback (pytesseract) | httpx 0.28 / pytesseract 0.3.13 |
| Push | Firebase Cloud Messaging **HTTP v1** via firebase-admin service account (legacy server keys are dead) | firebase-admin 7.7.0 |
| Weather | Open-Meteo archive + forecast (no key) | httpx |
| Jobs | APScheduler `AsyncIOScheduler` inside the uvicorn process, advisory-locked | 3.11.3 (v4 is alpha — not used) |
| Tests | pytest + pytest-asyncio (session loop), real DB | 9.1.1 / 1.4.0 |
| Frontend | Next.js App Router (Turbopack), React, TypeScript | 16.3.6 / 19.2.8 / 5.x |
| Styling | Tailwind CSS 4 (CSS-first config) + shadcn/ui 4 (`radix-nova` preset) | 4.x / 4.21.0 |
| Charts | recharts (bar charts) + hand-written SVG gauge | 3.10.1 |
| Forms | react-hook-form + zod 4 | 7.x / 4.x |
| Frontend tests | Vitest 4.1 + Testing Library + jsdom 29 (Node 20-compatible pins; Vitest 5 needs Node ≥22) | 4.1.11 / 16.3.3 / 29.1.1 |
| Local infra | docker-compose (db + backend); `scripts/dev-postgres.sh` portable PG15+Timescale for Windows without Docker | — |

Dev-machine facts that shaped the plan: Windows 11, **no Docker**, no `gh`, no Tesseract, Node 20.20, repo lives under OneDrive. A portable PostgreSQL 15.14 + TimescaleDB 2.28.3 runs on `127.0.0.1:55432` (`scripts/dev-postgres.sh install`) and is what every migration and integration test in this repo runs against.

---

## 1. Database schema — confirmation, conflicts and adopted fixes

The Section-4 schema is implemented in `backend/migrations/versions/0001_initial_schema.py`
(single revision, raw SQL, `CREATE EXTENSION IF NOT EXISTS timescaledb` first). It has been
executed on a fresh database, downgraded and re-upgraded; both hypertables are created.

### 1.1 Conflicts found (would have broken the brief as written)

| # | Conflict | Fix adopted |
|---|---|---|
| C1 | **Blocker.** `id UUID PRIMARY KEY` on `electricity_readings` / `water_readings` is rejected by TimescaleDB (`cannot create a unique index without the column "billing_period_start"`); the whole migration would roll back. | Composite PKs `(id, billing_period_start)` and `(id, reading_date)`; plus `UNIQUE (user_id, billing_period_start)` and `UNIQUE (user_id, reading_date)` — these also give the seed script and manual entry an idempotent `ON CONFLICT` target. |
| C2 | `UNIQUE (user_id, end_date)` on `lpg_cycles` enforces nothing (NULLs are distinct), so two open cycles are possible. | Kept the spec constraint **and** added `CREATE UNIQUE INDEX uq_lpg_single_open_cycle ON lpg_cycles(user_id) WHERE end_date IS NULL`; the API returns 409 on a second open cycle. |
| C3 | `ward_aggregates` has no natural key, so "upsert on every reading" is impossible. | `UNIQUE (ward_id, resource_type, period_start)`; periods are calendar months (`period_start` = 1st). |
| C4 | `appliances` has no `UNIQUE (user_id, type)` but `estimate_breakdown()` overwrites per type, silently dropping kWh for duplicate rows. | `UNIQUE (user_id, type)`; profile save is a transactional replace-all; multiples are modelled with `count`. |
| C5 | Every child `user_id` is nullable → orphan rows invisible to every per-user query. | `NOT NULL` on all child FKs; `users.ward_id` stays nullable with `ON DELETE SET NULL`. |
| C6 | `users.email UNIQUE` is case-sensitive; Supabase treats emails case-insensitively. | `CREATE UNIQUE INDEX users_email_key ON users (lower(email))`; app lowercases emails. |
| C7 | The brief's enums live only in SQL comments. | `CHECK` constraints for `role`, appliance `type`, `source`, `resource_type`, `alert_type`, score ranges 0–100, `household_size ≥ 1`, `sample_count ≥ 3`, `green_scores.month` day = 1, period ordering. |
| C8 | "FCM server key" in the env list is the deprecated legacy API. | `FIREBASE_SERVICE_ACCOUNT_JSON` (service-account file) + firebase-admin HTTP v1. |

### 1.2 Additions beyond Section 4 (all listed for sign-off)

| Addition | Why |
|---|---|
| `alerts.dedupe_key TEXT` + `UNIQUE (user_id, dedupe_key)` | Idempotent alert inserts (`ON CONFLICT DO NOTHING`) so re-running the pipeline never duplicates an alert. |
| `ward_aggregates.avg_household_size FLOAT` | Lets the peer comparison show a per-person figure without exposing individuals. |
| `alerts.resource_type` also allows `'general'` | For `weekly_digest` / `milestone` alerts that span resources. |
| `wards UNIQUE (city, name)` | Seed wards by name with `ON CONFLICT DO NOTHING`, never explicit ids. |
| Table `ocr_jobs` (migration `0002`) | The brief requires OCR to run in BackgroundTasks **and** to show extracted values for confirmation. Upload returns `202 {job_id}`; the client polls. |
| Supporting indexes | `users(ward_id)`, `lpg_cycles(user_id, start_date DESC)`, `alerts(user_id, created_at DESC)`, partial unread index, `green_scores(month)`, `ward_aggregates(period_start) WHERE anomaly_flag`. |

### 1.3 Semantics decided

* `users.id` **is** the Supabase auth user id (JWT `sub`) for real sign-ups; the column default only serves seed rows. On first authenticated request the backend looks the user up by id **or** lower(email) and inserts if missing, so seeded users (own UUIDs) are adopted by a later Supabase login with the same email.
* `POST /readings/electricity` rejects an overlapping billing period with **409** unless `?overwrite=true` (used by the OCR confirm screen); `POST /readings/water` is an upsert per `(user, day)`.
* Ward aggregates are computed for every ward but **served only when `household_count ≥ 10`**, on every supervisor and peer-comparison query path (SQL `WHERE household_count >= 10`), not by a schema CHECK (which would make the seed impossible).

---

## 2. Environment variables (complete list; see `.env.example`)

Backend (`backend/.env`):

| Variable | Purpose |
|---|---|
| `APP_ENV`, `LOG_LEVEL`, `CORS_ORIGINS` | runtime |
| `DATABASE_URL`, `TEST_DATABASE_URL`, `POSTGRES_PASSWORD` | asyncpg DSNs; compose password |
| `SUPABASE_URL` | issuer + JWKS discovery (`{url}/auth/v1/.well-known/jwks.json`) |
| `SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only; seed script creates auth users with it when present |
| `SUPABASE_JWT_SECRET` | legacy HS256 secret; also what tests use to mint tokens |
| `GCV_API_KEY`, `TESSERACT_CMD` | OCR |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | path to the FCM v1 service-account file (push disabled when empty) |
| `OPEN_METEO_BASE_URL`, `WEATHER_TIMEOUT_SECONDS` | weather context |
| `UPLOAD_DIR`, `SCHEDULER_ENABLED`, `SCHEDULER_TIMEZONE` | storage / jobs |

Frontend (`frontend/.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy anon key also accepted), `NEXT_PUBLIC_API_URL` (origin only; the client appends `/api/v1`), `NEXT_PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,MESSAGING_SENDER_ID,APP_ID,VAPID_KEY}` (web push toggle).

No secret is hardcoded anywhere; tests set their own env in `tests/conftest.py`.

---

## 3. BEE wattage lookup — completeness

The table in §5.1 is complete for the ten schema-enumerated types and is used verbatim
(`services/appliance.py`). Common Indian household loads **not** covered and therefore
absorbed by `other` (100 W) or by `unknown_load`: microwave (~1,200 W), induction cooktop
(~1,800 W), water pump / motor (~750 W), mixer-grinder (~500 W), air cooler (~200 W), iron
(~1,000 W), desktop/laptop + router (~100 W), LED lighting (~10 W each), inverter charging
losses. Adding types requires a schema `CHECK` change, so they are filed in `FUTURE.md`,
not built in MVP. The UI labels this estimation honestly: "Estimated from BEE star-rating
wattages and your daily hours — not measured". The word NILM appears nowhere.

---

## 4. Highest-risk implementation parts and mitigations

1. **TimescaleDB hypertable constraints (C1).** Mitigation: composite PKs; migration executed up/down/up on the real engine; `tests/test_migrations.py` asserts two rows in `timescaledb_information.hypertables` on every test session (the test DB is dropped and recreated each session, so "migrations run clean on a fresh DB" is proven continuously).
2. **Auth without a live Supabase project.** Mitigation: `deps.py` verifies both ES256/JWKS and HS256; the test-suite mints Supabase-shaped HS256 tokens with `SUPABASE_JWT_SECRET`; `backend/scripts/mint_dev_token.py` does the same for local curl/Swagger use. There is **no** auth-bypass flag or fake-login UI.
3. **OCR ±2 kWh acceptance offline (no GCV key, no Tesseract binary here).** Mitigation: `parse_bill()` is a pure function over reconstructed text rows; ≥4 realistic GCV-style fixtures (BESCOM ×2, MSEDCL row- and column-major, TNEB with free-units trap) with distractor numbers assert `|kwh − expected| ≤ 2`; a Pillow-rendered BESCOM bill image drives an offline end-to-end test with the GCV HTTP call mocked via `httpx.MockTransport`; missing Tesseract degrades to `engine='none', needs_review=true` with HTTP 200.
4. **<400 ms POST /readings/* with a real pipeline.** Mitigation: route does one INSERT and `background.add_task(...)`; each pipeline step is isolated in try/except and acquires its own pool connection; the latency test runs a real uvicorn server on a free port with a deliberately slow (1 s) mocked weather step and asserts p95 < 400 ms **and** that the alert/aggregate rows land within 3 s.
5. **Next 16 + Tailwind 4 + shadcn 4 drift (async request APIs, `proxy.ts` not `middleware.ts`, CSS-first Tailwind).** Mitigation: scaffold done non-interactively and type-checked; a config-guard script fails on any `tailwind.config.*`, `@tailwind` directive or `middleware.ts`; browser gate at 390×844 checks `scrollWidth ≤ 390` on every page.
6. **Non-interactive git push** (no stored GitHub credential). Mitigation: commit + tag locally after each gate; push attempted with `GIT_TERMINAL_PROMPT=0`; if it fails the exact command is reported for the user to run once, after which Git Credential Manager caches the token.

---

## 5. Algorithms — confirmations and the two empty sections

### 5.1 Appliance estimation — as specified. `unknown_load = max(0, actual − Σ estimates)`. Breakdown is computed per bill using inclusive billing days.

### 5.2 Baseline computation and anomaly check (fills the empty section)

```
Units (so baseline and current are comparable):
  electricity : kWh per 30 days  = kwh / billing_days * 30   (billing_days inclusive)
  water       : litres per day (one sample per logged day)
  lpg         : kg per day       = daily_burn_rate of closed cycles
Windows: last 6 bills | last 90 daily water samples (alerts only from 14) | last 6 closed LPG cycles

compute_baseline(values) -> None if len(values) < 3 else
  mean            = statistics.fmean(values)
  std_dev         = max(statistics.stdev(values), 0.10 * mean)   # floor so a flat history still detects
  upper_threshold = mean + 1.5 * std_dev
  lower_threshold = max(0, mean - 1.5 * std_dev)
  sample_count    = len(values)

check_anomaly(current, baseline) ->
  pct_over   = (current - mean) / mean * 100
  z          = (current - mean) / std_dev
  is_anomaly = current > upper_threshold
  severity   = 'none' if not is_anomaly else ('high' if z >= 3 or pct_over >= 30 else 'medium')
  direction  = 'over' | 'under' | 'normal'
Test vector: 480 vs mean 330 (std floor 33) -> is_anomaly True, pct_over 45.45, severity high.

Walk-forward rule: a reading is checked against the baseline built from samples strictly
before it; the `baselines` table is a display/next-check cache refreshed after every
reading and on the 1st of each month (idempotent upsert on (user_id, resource_type)).

Alert rules (services/alerts_svc.py; every insert uses dedupe_key ON CONFLICT DO NOTHING):
  electricity high_consumption : is_anomaly on a new bill; push when severity == 'high'
  water high_consumption       : one day > upper AND >= 1.3x mean; in-app only; not while a leak alert is active
  water leak_suspected         : two consecutive logged days each > upper AND >= 1.5x mean; always high; push; 7-day suppression
  lpg refill_due_soon          : predict_finish().should_alert_now (3-day buffer); daily 07:00 job; push
  lpg refill_overdue           : today > estimated_finish_date + 2 days and cycle still open; push
  milestone                    : sample <= lower_threshold; 45-day suppression per resource; in-app
  weekly_digest                : Monday 08:00 job; in-app only
```

### 5.3 LPG — as specified, plus a `today: date | None` parameter on `predict_finish()` (IST via `zoneinfo`) so tests and jobs are deterministic. Ward LPG aggregate = kg per household per 30 days from burn rates overlapping the month.

### 5.4 Green Score — **one deviation proposed for sign-off.** The brief's formula jumps from 100 (at the mean) to 80 (just above it), so a stable household oscillates ~20 points on ±1 % noise. Adopted continuous variant that satisfies every acceptance test (100 at or below mean, 0 floor, per-household-member normalisation, +5 improvement bonus capped at 100):

```
between mean and upper : score = 100 - 60 * (current - mean) / (upper - mean)      # 100 -> 40
above upper            : score = max(0, 40 - (pct_over - pct_upper))               # continuous at upper
```
If the user prefers the literal formula, it is a one-function swap in `services/green_score.py` with tests already covering both invariants. `ward_percentile` uses the "≤" definition on `total_score`.

### 5.5 Weather context (fills the empty section)

```
Endpoint : archive-api.open-meteo.com/v1/archive when the period ended > 7 days ago,
           else api.open-meteo.com/v1/forecast with past_days; daily=temperature_2m_max,
           timezone=Asia/Kolkata; lat/lng from the user's ward, default Bengaluru 12.97/77.59
Compute  : mean daily max over the billing period vs the equal-length window immediately before;
           hot_days = count(tmax >= 32 C); require 70% coverage of both windows
Sentence : |delta| >= 1.5 C -> "It was {delta:.0f} C hotter/cooler than the previous period
           ({hot_days} days above 32 C), so cooling likely ran longer." else None
Rules    : httpx, 3 s total / 1.5 s connect, one attempt, called only inside BackgroundTasks,
           returns None on any failure (alert still written with weather_context = null),
           24 h in-process cache keyed by (lat, lng, period) rounded to 0.1 degree.
```

### 5.6 Tips — as specified (rule-based, top 2, no ML). UI enforces "verb + number" per tip.

---

## 6. API contract (fills the empty section) — all under `/api/v1`, Bearer JWT unless noted

| Method & path | Auth | Request → Response |
|---|---|---|
| `GET /healthz` | none | `{status, db, env}` |
| `GET /profile` | user | `ProfileOut {id,email,name,ward_id,ward_name,household_size,city,role,push_enabled,onboarding_complete,created_at}` |
| `PATCH /profile` | user | `{name?,ward_id?,household_size?(1–20),city?}` → ProfileOut |
| `PUT /profile/push-token` / `DELETE /profile/push-token` | user | `{fcm_token}` → 204 / 204 (opt-out clears the token) |
| `GET /profile/appliances` / `PUT /profile/appliances` | user | `{appliances:[{type,count,daily_hours,star_rating?,wattage_override?}]}` → `[ApplianceOut + effective_watts]` (transactional replace-all) |
| `GET /profile/appliance-types` | user | static catalog `[{type,label,has_star_rating,default_hours,always_on,watts_by_star}]` |
| `GET /wards?city=` | user | `[{id,name,city,lat,lng}]` |
| `GET /readings/electricity?limit=12` | user | `[ElectricityReadingOut]` newest first |
| `POST /readings/electricity?overwrite=false` | user | `{kwh(0<x≤5000),billing_period_start,billing_period_end,billed_amount?,source?,ocr_job_id?}` → 201; **409** on overlap unless overwrite |
| `DELETE /readings/electricity/{id}` | user | 204 |
| `GET /readings/water?days=90` / `POST /readings/water` / `DELETE /readings/water/{id}` | user | `{liters(0<x≤50000),reading_date,source?}` → 201 (upsert per day) |
| `POST /bills/upload` (multipart `file`, jpeg/png/webp ≤10 MB) | user | **202** `{id,status:'pending'}`; OCR runs as a background task |
| `GET /bills/jobs/{id}` | user (owner) | `{id,status,engine,confidence,needs_review,extraction:{kwh,billing_period_start,billing_period_end,billed_amount,utility,field_confidence,warnings},raw_text,image_url,error_code}` |
| `GET /bills/jobs/{id}/image` | user (owner) | image/jpeg (404 for non-owners) |
| `GET /lpg/cycles` | user | `[LpgCycleOut]` newest first |
| `POST /lpg/cycles` | user | `{cylinder_kg?=14.2,start_date}` → 201; **409** if an open cycle exists |
| `POST /lpg/cycles/{id}/close` | user | `{end_date}` → LpgCycleOut with `daily_burn_rate` |
| `GET /lpg/current` | user | `{cycle|null, prediction|null}` (prediction keys exactly as §5.3) |
| `GET /insights/dashboard` | user | summary cards, green score, unread count, LPG tracker, ward rank line |
| `GET /insights/electricity?months=6` | user | `{history[{period_start,period_end,kwh,kwh_per_30d}],baseline,appliance_breakdown[],unknown_load,tips[],over_baseline,peer_comparison}` |
| `GET /insights/water?days=90` | user | daily history, **monthly aggregates for the chart**, baseline, tips |
| `GET /insights/lpg` | user | cycles timeline, current, prediction, baseline, tips |
| `GET /insights/green-score?months=6` | user | current + history + `normalisation_note` |
| `GET /insights/peer-comparison?resource=` | user | `{available:true, ward_name, avg_per_household, avg_per_person, yours, pct_diff, household_count}` or `{available:false, reason}` (needs ≥10 households) |
| `GET /alerts?unread_only=&limit=` / `GET /alerts/unread-count` | user | `[AlertOut{…,context{pct_over,current,baseline_mean,severity,weather_context,tips[],top_appliance}}]` / `{count}` |
| `POST /alerts/{id}/read` / `POST /alerts/read-all` | user | AlertOut / `{updated}` |
| `GET /supervisor/wards` | supervisor/admin | wards in the supervisor's city (no supervisor→ward table in MVP; see FUTURE.md) |
| `GET /supervisor/wards/{id}/heatmap` | supervisor | per resource: current month vs previous month avg per household, % change, anomaly flag — **from `ward_aggregates` only, `household_count ≥ 10`** |
| `GET /supervisor/anomalies?month=` | supervisor | wards with `anomaly_flag` in that month |
| `GET /supervisor/comparison?resource=&month=` | supervisor | per-ward avg per household / per person |

Citizen JWTs get **403** on every supervisor route. Tests assert recursively that no `user_id`, email, name or seeded UUID appears in any supervisor or peer-comparison response, and a source-level test asserts `routers/supervisor.py` never names a raw per-user table.

---

## 7. OCR extraction strategy (BESCOM, MSEDCL, TNEB)

* **Engine call:** GCV `DOCUMENT_TEXT_DETECTION` over REST with `x-goog-api-key`; words + bounding boxes are clustered into rows (sorted by vertical centre, column break at gaps > 3× median char width), which fixes the column-major output that breaks naive "label → nearest number" parsing. Tesseract (`image_to_data`) yields the same Word/row structure; a plain `text.split('\n')` path serves fixtures.
* **Pre-processing (Pillow only):** EXIF transpose → grayscale → longest side ≤ 2000 px → autocontrast → JPEG q85; that JPEG is what is stored (`UPLOAD_DIR/<user_id>/<job_id>.jpg`, served only via the owner-checked image route).
* **Row pipeline (fixed order):** OCR digit-confusion fixes inside digit-heavy tokens → mask date spans → mask ID segments (≥7-digit tokens, values after RR No / Consumer No / Meter No / Bill No…) → drop slab/rate rows (`@`, `per unit`, `x … =`) → numeric search inside label segments.
* **Labels (weighted, OCR-tolerant):** kWh — `units consumed`, `consumption (units)`, `total units`, `billed units`, bare `kWh`/`units` (low weight), TNEB `assessment`; derive `(present − previous) × MF` with meter-rollover handling when no strong label; cross-check ±2 (+10 / −20 confidence). Amount — `net amount payable`, `total bill amount`, `amount payable`, MSEDCL `rounded bill amount`, TNEB `amount`; exclude `after due date`, arrears, energy/fixed charges, rebates. Dates — explicit day-first regexes (DD-MM-YYYY, DD/MM/YY, 05-MAR-26, "MAR-2026", "March 2026", 03/2026, ISO); period derived from explicit range > reading dates > bill month > TNEB bimonthly inference.
* **Sanity bounds:** kWh 1–5000 (0 forces review), amount 10–100000, dates within [today − 3 y, today + 60 d], period 20–70 days.
* **Confidence (0–100, additive):** kWh 50 · period 25 · amount 15 · utility header 10 · agreement bonus 10; penalties for mismatch, Tesseract engine, low symbol confidence, odd period length. `needs_review = confidence < 70 or kwh/period missing or kwh == 0`; raw text is always returned; nothing ever raises out of the job.
* **Fallback:** Tesseract on missing key, HTTP 429/403/5xx, timeouts, in-body error codes 7/8/13/14 — never on 400 (bad image → `failed/invalid_image`). Missing binary → `engine='none'`, confidence 0, `needs_review` true, HTTP 200 so the form drops to manual entry.
* **Tests:** fixtures per utility (with distractor numbers) asserting kWh ±2, a date-format table test, a rendered BESCOM image end-to-end with GCV mocked from the renderer's word boxes, fallback/missing-binary tests. Images only in MVP (PDF bills → FUTURE.md).

---

## 8. Seed data plan (`seed_data/wards.sql`, `seed_data/test_users.py`)

Deterministic (`--seed 42`, `uuid5` ids, `SEED_TODAY = 2026-09-24`), re-runnable (`ON CONFLICT DO UPDATE`), verifiable (`--verify` asserts the expected alert inventory). Six months: **Apr → Sep 2026**.

| User | Ward | Pattern |
|---|---|---|
| Ananya (stable) | Koramangala | electricity 300 ± 10 kWh/bill; water ~380 L/day steady; LPG 14.2 kg every ~31 days → `refill_due_soon` on the open cycle |
| Rohan (seasonal AC spike) | Indiranagar | Apr–May bills +45 % (AC), falling to ~330 by Jul–Sep → a `milestone` when consumption drops; LPG cycle left open past its predicted finish → `refill_overdue` |
| Deepa (water leak event) | Jayanagar | daily water ~400 L → ~1,100 L for 10 days in July → `high_consumption` day 1, `leak_suspected` day 2, second `leak_suspected` after the 7-day suppression |
| 12 filler households × wards 1–3, 3 fillers in ward 4 (Whitefield) | — | readings only, no auth accounts; ward 4 exercises the `<10` privacy path (peer comparison → null) |
| Injected ward spike | Indiranagar, August water ×1.45 | trips the ward-level `anomaly_flag` (>25 % over the prior 3-month mean) for the Phase 4 test |

`wards.sql` seeds ~30 named BBMP wards with lat/lng, by name only. When `SUPABASE_SERVICE_ROLE_KEY` is present the seed also creates the three named users through the Supabase Admin API so they can log in; otherwise their emails are adopted on first login (see §1.3). Exact per-month numbers are in `docs/phase0/lens-algorithms-seed.md`.

---

## 9. Frontend plan (design system decided now, built in Phases 1 and 3)

* **Brand:** "SAVERA". Gen-Z-fresh but credible: flat primary green `#0B7A52` (dark `#34D399`), canvas `#F4F7F3`, resource palette electricity amber / water blue / LPG rose, status good/warn/bad carried by pills (icon + text), never by fill alone; all pairs pass WCAG AA (values in `docs/phase0/lens-ux.md`). Display font Bricolage Grotesque, body Inter, via `next/font`. Radius 0.75 rem, soft shadows, 44 px touch targets, `tabular-nums`, en-IN number/date formatting.
* **Shell:** bottom tab bar (Home, Electricity, Water, LPG, Alerts) under 768 px, 240 px sidebar above; Profile via avatar; Supervisor entry only for that role. Safe-area utilities; nothing wider than 358 px inside a 390 px viewport; forms open in a bottom drawer on mobile and a dialog on desktop.
* **Auth (deviation from the brief's `lib/supabase.ts`):** `lib/supabase/{client,server,proxy}.ts`, `frontend/proxy.ts` (Next 16 replaces `middleware.ts`), `app/auth/confirm/route.ts`, magic link first with password as a disclosure; sign-up collects name.
* **Onboarding:** `app/(onboarding)/onboarding` — 2 screens (home & ward → appliance chips), gated by `profile.onboarding_complete`, form reused on /profile.
* **Charts:** recharts only on resource pages behind `next/dynamic`; `ApplianceBreakdownBars.tsx` replaces the brief's Pie (the brief's Phase 3 text asks for horizontal bars); hand-written SVG `GreenScoreGauge` with `animate` prop; explicit `width/height` in tests, `ResizeObserver`/`matchMedia` stubs.
* **Tone:** "your usual" not "baseline"; alerts explain what changed, the likely cause, then "What to try:" with two verb+number tips; banned words list enforced in a test.
* **Gate tooling:** `npm run typecheck && npm test && npm run build`, browser check at 390×844, Lighthouse mobile simulated throttling against `next start`.

---

## 10. Phase gates and delivery

* Each phase ends with its acceptance list green, `git commit`, `git tag mvp-phase-N-complete`, push (interactive login may be needed once).
* Non-spec ideas go to `FUTURE.md`, never into the code.
* CI: `.github/workflows/ci.yml` runs compose validation, backend image build, pytest against a `timescale/timescaledb:2.28.3-pg15` service container, and the frontend typecheck/tests/build — this is how the Docker path gets exercised, since this machine has no Docker.

## 11. Phase 1 acceptance criteria (verbatim from the spec)

- ✅ All Alembic migrations run clean on fresh DB
- ✅ Auth: signup → login → protected route works end-to-end
- ✅ Can save electricity, water, and LPG readings via API and frontend
- ✅ OCR: given a BESCOM bill image, extraction returns kWh ± 2 units of actual
- ✅ Seed script populates 3 users with 6 months of data without errors
- ✅ pytest test suite: all unit tests in tests/ pass (write tests as you build)

**Plan complete. Ready to begin Phase 1 on approval.**
