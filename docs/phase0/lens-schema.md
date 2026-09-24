# Phase 0 review lens: schema

_Independent reviewer output (verified against the local PG15 + TimescaleDB 2.28.3 where it says so). Decisions adopted are recorded in ../PHASE0_PLAN.md._

#### LENS: schema

[BLOCKER] create_hypertable() fails on both hypertables: `id UUID PRIMARY KEY` excludes the partition column, so the whole initial migration rolls back
  detail: Verified on the local PG 15.14 + TimescaleDB 2.28.3 by running the spec DDL verbatim: `SELECT create_hypertable('electricity_readings', 'billing_period_start', ...)` -> `ERROR: cannot create a unique index without the column "billing_period_start" (used in partitioning)`; identical error for water_readings/`reading_date`. Both tables were left as plain tables (0 hypertables). Inside Alembic's default transactional upgrade this error aborts the entire initial migration, so Phase 1 acceptance 'All Alembic migrations run clean on fresh DB' fails on the very first run. Rule (also verified separately): every UNIQUE index / PK on a hypertable must include the partition column; non-unique indexes may omit it.
  rec: Replace the two hypertable definitions with (verified to apply clean and to plan per-user time-ordered reads as `ChunkAppend -> Index Scan Backward using <chunk>_electricity_readings_pkey`):

```sql
CREATE TABLE electricity_readings (
  id                   UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kwh                  DOUBLE PRECISION NOT NULL CHECK (kwh > 0),
  billing_period_start DATE NOT NULL,
  billing_period_end   DATE NOT NULL,
  bill_image_url       TEXT,
  source               TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ocr','ami')),
  billed_amount        NUMERIC(12,2) CHECK (billed_amount >= 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT electricity_readings_pkey PRIMARY KEY (user_id, billing_period_start),
  CONSTRAINT electricity_readings_period_check CHECK (billing_period_end > billing_period_start)
);
CREATE INDEX idx_electricity_readings_id ON electricity_readings (id);   -- non-unique is allowed
SELECT create_hypertable('electricity_readings', by_range('billing_period_start', INTERVAL '3 months'));

CREATE TABLE water_readings (
  id           UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liters       DOUBLE PRECISION NOT NULL CHECK (liters > 0),
  reading_date DATE NOT NULL,
  source       TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ocr','ami')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT water_readings_pkey PRIMARY KEY (user_id, reading_date)
);
CREATE INDEX idx_water_readings_id ON water_readings (id);
SELECT create_hypertable('water_readings', by_range('reading_date', INTERVAL '3 months'));
```
`by_range()` (generalized API, 2.13+) and the old `('table','col', chunk_time_interval=>...)` form both work on 2.28.3; use `by_range`. create_hypertable auto-adds `<table>_<col>_idx (col DESC)`. If two bills with the same start date must be allowed, use `PRIMARY KEY (user_id, billing_period_start, id)` instead (still legal); see the duplicate-reading finding for why the 2-column PK is preferred.

[HIGH] `one_open_cycle_per_user UNIQUE (user_id, end_date)` enforces nothing; the one-open-LPG-cycle rule needs a partial unique index
  detail: Verified: with the spec DDL, two `INSERT INTO lpg_cycles (user_id, start_date)` rows for the same user both succeed (`open_cycles_for_user = 2`), because NULLs are distinct in a plain UNIQUE. The comment 'enforce at app layer' leaves a race between two concurrent POST /lpg/cycles calls. PG15 offers `UNIQUE NULLS NOT DISTINCT` (verified working), but that also forbids two *closed* cycles ending on the same date, which is a legitimate correction scenario. The partial unique index is exact, and it doubles as the index for `WHERE user_id=$1 AND end_date IS NULL` (verified plan: `Index Scan using one_open_cycle_per_user`).
  rec: ```sql
CREATE TABLE lpg_cycles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cylinder_kg     DOUBLE PRECISION NOT NULL DEFAULT 14.2 CHECK (cylinder_kg > 0),
  start_date      DATE NOT NULL,
  end_date        DATE,
  daily_burn_rate DOUBLE PRECISION CHECK (daily_burn_rate > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lpg_cycles_dates_check CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT lpg_cycles_rate_only_when_closed CHECK (daily_burn_rate IS NULL OR end_date IS NOT NULL)
);
CREATE UNIQUE INDEX one_open_cycle_per_user ON lpg_cycles (user_id) WHERE end_date IS NULL;
CREATE INDEX idx_lpg_cycles_user_start ON lpg_cycles (user_id, start_date DESC);
```
Start-cycle endpoint (race-free, verified returns 0 rows on conflict): `INSERT INTO lpg_cycles (user_id, start_date, cylinder_kg) VALUES ($1,$2,$3) ON CONFLICT (user_id) WHERE end_date IS NULL DO NOTHING RETURNING *` -> 409 when no row. `end_date >= start_date` (not `>`) because close_cycle() explicitly handles days <= 0.

[HIGH] ward_aggregates has no unique key, so 'ward aggregate upsert on every new reading' cannot be an upsert
  detail: Phase 2 requires 'Ward aggregate upsert on every new reading' and Phase 4 reads 'anomaly_flag = true in current month' and '30-day avg vs previous 30 days'. With only `id UUID PRIMARY KEY`, there is no `ON CONFLICT` target: every reading would INSERT a new row per (ward, resource, period), the supervisor heatmap would show N rows per ward-month and pct_change_vs_prev would compare against arbitrary rows. `ward_id` is also nullable with default NO ACTION, so a ward delete fails and NULL-ward aggregates are possible.
  rec: ```sql
CREATE TABLE ward_aggregates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id            INTEGER NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  resource_type      TEXT NOT NULL CHECK (resource_type IN ('electricity','water','lpg')),
  period_start       DATE NOT NULL,
  period_end         DATE NOT NULL,
  avg_consumption    DOUBLE PRECISION NOT NULL CHECK (avg_consumption >= 0),
  total_consumption  DOUBLE PRECISION NOT NULL CHECK (total_consumption >= 0),
  household_count    INTEGER NOT NULL CHECK (household_count >= 1),
  pct_change_vs_prev DOUBLE PRECISION,
  anomaly_flag       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ward_aggregates_period_check CHECK (period_end > period_start),
  CONSTRAINT ward_aggregates_ward_resource_period_key UNIQUE (ward_id, resource_type, period_start)
);
CREATE INDEX idx_ward_aggregates_anomaly ON ward_aggregates (period_start) WHERE anomaly_flag;
```
services/ward.py upsert (verified): `INSERT INTO ward_aggregates (ward_id,resource_type,period_start,period_end,avg_consumption,total_consumption,household_count,pct_change_vs_prev,anomaly_flag) VALUES (...) ON CONFLICT (ward_id, resource_type, period_start) DO UPDATE SET avg_consumption=EXCLUDED.avg_consumption, total_consumption=EXCLUDED.total_consumption, household_count=EXCLUDED.household_count, pct_change_vs_prev=EXCLUDED.pct_change_vs_prev, anomaly_flag=EXCLUDED.anomaly_flag, updated_at=NOW()`. Use calendar-month buckets (period_start = 1st of month) so the key is stable; the unique index prefix (ward_id, resource_type, period_start) serves the heatmap query `WHERE ward_id=$1 ORDER BY resource_type, period_start DESC`.

[HIGH] Every user_id foreign key is nullable, allowing orphan readings/alerts/baselines that no per-user query returns and no cascade cleans
  detail: Verified via information_schema: `user_id` is nullable on appliances, electricity_readings, water_readings, lpg_cycles, baselines, alerts, green_scores, and `ward_id` on ward_aggregates. A bug or a seed-script mistake inserting NULL user_id is silently accepted, ends up in ward aggregates via joins that don't match, and is invisible to every `WHERE user_id = $1` query. The hypertable PK fix requires `user_id NOT NULL` anyway (PK columns must be NOT NULL).
  rec: Declare `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE` on all seven child tables and `ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE CASCADE` on ward_aggregates. Keep `users.ward_id` nullable (onboarding before ward pick) but change it to `REFERENCES wards(id) ON DELETE SET NULL` so a ward removal doesn't error. Verified: cascade from `DELETE FROM users` removed the user's hypertable rows (6000 -> 5988).

[MEDIUM] None of the spec's documented enums/ranges are enforced: role, appliance type, source, resource_type, alert_type, month=1st, 0–100 scores, household_size
  detail: The spec lists valid values only in SQL comments; the only CHECKs present are kwh > 0, liters > 0 and star_rating 1–5. A typo like `resource_type='electricty'` from the pipeline, `role='root'`, `green_scores.month='2026-09-15'` (breaks the `UNIQUE (user_id, month)` idempotency), or `source='sms'` is accepted and silently corrupts baselines/green scores. All of these were verified to be rejected by the CHECKs below (the hypertable CHECK correctly propagates to chunks: `violates check constraint "electricity_readings_source_check"` on `_hyper_1_4_chunk`).
  rec: Add exactly:
- users: `household_size INTEGER NOT NULL DEFAULT 1 CHECK (household_size >= 1)`, `role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen','supervisor','admin'))`
- appliances: `type TEXT NOT NULL CHECK (type IN ('ac_1ton','ac_1.5ton','ac_2ton','refrigerator','ceiling_fan','geyser','washing_machine','tv_led_40','tv_led_55','other'))`, `count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1)`, `daily_hours DOUBLE PRECISION NOT NULL DEFAULT 4 CHECK (daily_hours >= 0 AND daily_hours <= 24)`, `wattage_override DOUBLE PRECISION CHECK (wattage_override > 0)`
- electricity_readings / water_readings: `source ... CHECK (source IN ('manual','ocr','ami'))`, `CHECK (billing_period_end > billing_period_start)`
- baselines: `resource_type TEXT NOT NULL CHECK (resource_type IN ('electricity','water','lpg'))`, `mean ... CHECK (mean >= 0)`, `std_dev ... CHECK (std_dev >= 0)`, `lower_threshold ... CHECK (lower_threshold >= 0)`, `sample_count INTEGER NOT NULL CHECK (sample_count >= 3)` (spec: baseline only exists with >= 3 readings)
- alerts: `resource_type TEXT NOT NULL CHECK (resource_type IN ('electricity','water','lpg','all'))`, `alert_type TEXT NOT NULL CHECK (alert_type IN ('high_consumption','leak_suspected','refill_due_soon','refill_overdue','milestone','weekly_digest'))`, `context JSONB NOT NULL DEFAULT '{}'::jsonb`, `is_read BOOLEAN NOT NULL DEFAULT FALSE`
- green_scores: `month DATE NOT NULL CHECK (EXTRACT(DAY FROM month) = 1)`, each `*_score DOUBLE PRECISION CHECK (x BETWEEN 0 AND 100)`, `ward_percentile DOUBLE PRECISION CHECK (ward_percentile BETWEEN 0 AND 100)`
- wards: `lat DOUBLE PRECISION CHECK (lat BETWEEN -90 AND 90)`, `lng DOUBLE PRECISION CHECK (lng BETWEEN -180 AND 180)`, `CONSTRAINT wards_city_name_key UNIQUE (city, name)`
- every `created_at` / `computed_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
Use TEXT + CHECK rather than Postgres ENUM types so adding a value later is a one-line `ALTER TABLE ... DROP CONSTRAINT / ADD CONSTRAINT` in a transaction (ENUM `ADD VALUE` cannot run inside Alembic's transaction).

[MEDIUM] Missing indexes for the spec's query patterns; the spec's only index has a redundant key column
  detail: Only `idx_alerts_user_unread ON alerts(user_id, is_read) WHERE is_read = FALSE` exists (the `is_read` key column is redundant with the predicate). No index serves: appliance profile fetch per user, LPG timeline / predict_finish's 'closed cycles newest first', the alerts page 'chronological list', `users.ward_id` for ward aggregation and peer comparison (FK without index => seq scan on every aggregation and on every ON DELETE CASCADE), or green-score ward percentile by month. Verified plans with 500 users / 6000 readings after adding the indexes below: unread badge -> `Bitmap Index Scan on idx_alerts_user_unread`; alerts page -> `idx_alerts_user_created`; ward peer query -> chunk exclusion (only the current chunk scanned) + `Bitmap Index Scan on idx_users_ward`; open cycle -> `one_open_cycle_per_user`.
  rec: ```sql
CREATE INDEX idx_users_ward           ON users (ward_id);
-- appliances: covered by UNIQUE (user_id, type) (see next finding)
-- electricity/water per-user time-ordered reads: covered by PK (user_id, <time>) — no extra index
CREATE INDEX idx_lpg_cycles_user_start ON lpg_cycles (user_id, start_date DESC);
CREATE INDEX idx_alerts_user_created   ON alerts (user_id, created_at DESC);
CREATE INDEX idx_alerts_user_unread    ON alerts (user_id) WHERE NOT is_read;   -- replaces spec version
CREATE INDEX idx_green_scores_month    ON green_scores (month);
CREATE INDEX idx_ward_aggregates_anomaly ON ward_aggregates (period_start) WHERE anomaly_flag;
```
The existing `UNIQUE (user_id, resource_type)` on baselines and `UNIQUE (user_id, month)` on green_scores are the correct upsert targets (`ON CONFLICT (user_id, resource_type) DO UPDATE ...`, `ON CONFLICT (user_id, month) DO UPDATE ...`; both verified) and also serve 'latest score for user' (`ORDER BY month DESC LIMIT 1`) for the +5 improvement bonus. Do not add indexes on the hypertable `id` beyond the non-unique one already proposed.

[MEDIUM] appliances lacks UNIQUE (user_id, type), but the spec's estimate_breakdown() overwrites per type, so duplicate rows silently drop kWh
  detail: `breakdown[a.type] = round(kwh, 1)` in §5.1 assigns rather than accumulates: if a user's profile contains two `ceiling_fan` rows (e.g. the profile edit form re-POSTs without clearing), only the last row's kWh survives and the appliance pie/unknown-load are wrong. The profile page 'Edit appliance profile (same form as Day-1 setup)' also needs an idempotent save target.
  rec: Add `CONSTRAINT appliances_user_type_key UNIQUE (user_id, type)` (this also indexes `user_id` for the per-user fetch and the FK cascade). Implement the profile save as one transaction: `DELETE FROM appliances WHERE user_id=$1; INSERT INTO appliances (user_id,type,count,daily_hours,star_rating,wattage_override) SELECT ... FROM unnest($2::text[], $3::int[], $4::float8[], $5::int[], $6::float8[])`, or per-row `ON CONFLICT (user_id, type) DO UPDATE SET count=EXCLUDED.count, daily_hours=EXCLUDED.daily_hours, star_rating=EXCLUDED.star_rating, wattage_override=EXCLUDED.wattage_override`. Model 'two ACs' via `count`, which is what the column is for.

[MEDIUM] Nothing prevents saving the same bill/reading twice, which skews baselines; the new hypertable PK fixes it and makes seed/OCR-confirm idempotent
  detail: The spec flow is OCR -> 'extracted data shown for user confirmation -> save'; a double-tap on confirm, a retried request, or re-running seed_data/test_users.py inserts the same billing period twice, doubling that month in `compute_baseline` (mean/std_dev) and in ward totals. The proposed `PRIMARY KEY (user_id, billing_period_start)` / `(user_id, reading_date)` closes this and gives an exact upsert target. Verified: `INSERT ... ON CONFLICT (user_id, billing_period_start) DO UPDATE SET kwh=EXCLUDED.kwh, source=EXCLUDED.source RETURNING ...` works on the hypertable.
  rec: Adopt the 2-column PKs from the blocker finding. POST /api/v1/readings/electricity: plain INSERT and map `asyncpg.UniqueViolationError` to HTTP 409 with a message like 'A reading for this billing period already exists' (or accept an `overwrite=true` flag that switches to the ON CONFLICT DO UPDATE form). Seed script: always use the `ON CONFLICT ... DO UPDATE` form so it can be re-run. Water readings are one-per-day per user under this rule; if intra-day readings are required, switch water to `PRIMARY KEY (user_id, reading_date, id)` (still Timescale-legal).

[MEDIUM] users.email uniqueness is case-sensitive and users.id must be the Supabase JWT `sub`, not a fresh gen_random_uuid()
  detail: Supabase Auth treats emails case-insensitively; `email TEXT UNIQUE` lets 'A@X.com' and 'a@x.com' coexist as two users. Separately, Auth is 'Supabase JWT in Authorization: Bearer', whose `sub` is `auth.users.id`; if `users.id` is minted locally, every request needs an email->id lookup and an email change in Supabase orphans all data. The schema comment `DEFAULT gen_random_uuid()` should only apply to seed users.
  rec: ```sql
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),   -- = Supabase auth.users.id (JWT sub); default used only by seed
  email          TEXT NOT NULL,
  ...
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));
```
(verified: inserting 'U1@X.COM' after 'u1@x.com' fails with `duplicate key ... (lower(email))`). In deps.py, after JWT verification, get-or-create with `INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email RETURNING id, role, ward_id, household_size` (sub and email both come from the token). Store `email` lowercased at the app layer.

[LOW] Extension/uuid/serial/seed details: gen_random_uuid is core, no pgcrypto; SERIAL + explicit seed ids collide; chunk interval is 90 fixed days
  detail: Verified: `gen_random_uuid` lives in `pg_catalog` on PG 15.14 (core since PG13), so `CREATE EXTENSION pgcrypto`/`uuid-ossp` must NOT be added (would need superuser in some setups and is pure noise). `wards.id SERIAL`: if seed_data/wards.sql inserts explicit ids, the sequence is not advanced and the first API-created ward hits `duplicate key`. `INTERVAL '3 months'` on a DATE partition column is stored as a fixed `90 days` chunk (verified in timescaledb_information.dimensions), not calendar months: harmless, but with one bill per user per month 3-month chunks add zero benefit; `INTERVAL '1 year'` would produce fewer chunks and fewer index scans. `CREATE EXTENSION timescaledb` + `create_hypertable` inside one transaction was verified to commit fine, so no `autocommit_block()` is needed. `billed_amount FLOAT` for money should be `NUMERIC(12,2)`. FKs *referencing* a hypertable are accepted on 2.28 (verified) but nothing in this schema needs one — keep it that way.
  rec: Keep `CREATE EXTENSION IF NOT EXISTS timescaledb;` as the first statement of the initial migration (idempotent under both the local portable PG and the `timescale/timescaledb:2.28.3-pg15` image, whose entrypoint already creates it in POSTGRES_DB). Seed wards by name only: `INSERT INTO wards (name, city, lat, lng) VALUES (...) ON CONFLICT (city, name) DO NOTHING;` (needs the `wards_city_name_key` constraint) and never insert explicit ids; if you must, follow with `SELECT setval(pg_get_serial_sequence('wards','id'), (SELECT max(id) FROM wards));`. Keep the spec's 3-month interval unless you want to change one literal to `INTERVAL '1 year'`. Set `command: postgres -c timescaledb.telemetry_level=off` in docker-compose (it is a GUC, not migratable).

[LOW] Timescale attaches a background-worker scheduler to every database with the extension; DROP DATABASE without FORCE stalls ~6s and max_background_workers=16 caps concurrent test DBs
  detail: Verified in pg_stat_activity: one `TimescaleDB Background Worker Scheduler` backend per database that has the extension (6 schedulers for 6 DBs on the local 55432 instance). `DROP DATABASE savera_review_tpl;` took 6.1s waiting for that worker; `DROP DATABASE ... WITH (FORCE)` took 0.06s. `CREATE DATABASE ... TEMPLATE` still worked (0.38s) but a template-based clone is no faster than just running the migration (0.3–0.5s measured via op.execute), so a template DB buys nothing here. `timescaledb.max_background_workers = 16` on this server means a per-test database strategy would exhaust workers and log 'background worker limit reached'.
  rec: Test tooling must always use `DROP DATABASE IF EXISTS <name> WITH (FORCE)` and create at most one database per pytest session (suffix with `PYTEST_XDIST_WORKER` if xdist is added, and cap xdist at ~4 workers). Do not use a template DB. Do not put the test DB on the dev `savera` database.

[LOW] The >= 10 households privacy rule must stay on the query path; a schema CHECK (household_count >= 10) would break Phase 4 with 3 seed users
  detail: Spec Phase 4: 'Add CHECK (household_count >= 10) on the ward_aggregates query path, not just schema'. The seed data has exactly 3 users, so a schema-level `>= 10` would make it impossible to store any ward aggregate and the E2E test 'citizen adds reading -> ward aggregate updated -> supervisor sees updated heatmap' could never pass. The supervisor heatmap legitimately needs aggregates for small wards; only the *citizen-facing* anonymous peer comparison must be suppressed below 10.
  rec: Schema: `household_count INTEGER NOT NULL CHECK (household_count >= 1)`. Peer-comparison query (verified plan uses chunk exclusion + idx_users_ward): `SELECT avg(r.kwh) AS ward_avg, count(DISTINCT r.user_id) AS n FROM electricity_readings r JOIN users u ON u.id = r.user_id WHERE u.ward_id = $1 AND r.billing_period_start >= $2 AND r.billing_period_start < $3 HAVING count(DISTINCT r.user_id) >= 10` -> return null when no row. Also read from ward_aggregates with `WHERE household_count >= 10` for the citizen endpoint and add `assert 'user_id' not in json.dumps(resp)` in the supervisor test.

DECISIONS:
 - Use the corrected DDL verified at C:\Users\DELL\AppData\Local\Temp\claude\C--Users-DELL-OneDrive-Desktop-PROJECTS-SavEra-hackfinix\30de2438-b522-4267-b901-a32a8b21fadb\scratchpad\corrected.sql as the initial schema (it applies clean in one transaction on PG 15.14 + TimescaleDB 2.28.3 and creates both hypertables).
 - Give hypertables `PRIMARY KEY (user_id, billing_period_start)` / `(user_id, reading_date)`, keep `id UUID NOT NULL DEFAULT gen_random_uuid()` with a non-unique index, and create them with `create_hypertable(<table>, by_range(<col>, INTERVAL '3 months'))`.
 - Enforce one open LPG cycle with `CREATE UNIQUE INDEX one_open_cycle_per_user ON lpg_cycles (user_id) WHERE end_date IS NULL` and start cycles via `INSERT ... ON CONFLICT (user_id) WHERE end_date IS NULL DO NOTHING RETURNING *` (0 rows -> HTTP 409).
 - Add `UNIQUE (ward_id, resource_type, period_start)` to ward_aggregates and `UNIQUE (user_id, type)` to appliances so every 'upsert' in the spec has an ON CONFLICT target; bucket ward aggregates by calendar month (period_start = 1st).
 - Make every child `user_id` (and ward_aggregates.ward_id) NOT NULL with ON DELETE CASCADE; keep users.ward_id nullable with ON DELETE SET NULL.
 - Encode every spec enum as TEXT + CHECK (role, appliance type, source, resource_type, alert_type) plus range CHECKs (household_size >= 1, count >= 1, daily_hours 0–24, scores 0–100, green_scores month day = 1, billing_period_end > start, end_date >= start_date, sample_count >= 3), and make all created_at/computed_at NOT NULL.
 - Add indexes idx_users_ward (ward_id), idx_lpg_cycles_user_start (user_id, start_date DESC), idx_alerts_user_created (user_id, created_at DESC), idx_alerts_user_unread (user_id) WHERE NOT is_read, idx_green_scores_month (month), idx_ward_aggregates_anomaly (period_start) WHERE anomaly_flag; rely on the hypertable PKs for per-user time-ordered reads.
 - Do not create pgcrypto or uuid-ossp: gen_random_uuid() is in pg_catalog on PG15; use `CREATE UNIQUE INDEX users_email_key ON users (lower(email))` and treat users.id as the Supabase JWT `sub` via `INSERT INTO users (id, email) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email RETURNING ...`.
 - Ship exactly one initial Alembic revision, backend/migrations/versions/0001_initial_schema.py, whose upgrade() does `op.execute(Path(__file__).parent.parent / 'sql' / '0001_initial_schema.up.sql').read_text())` with `CREATE EXTENSION IF NOT EXISTS timescaledb;` as its first statement, and whose downgrade() drops the ten tables in reverse dependency order (ward_aggregates, green_scores, alerts, baselines, lpg_cycles, water_readings, electricity_readings, appliances, users, wards) and never drops the extension; later schema changes get new revisions, never edits to 0001.
 - Run Alembic on the sync driver: `alembic init migrations` (generic template), `target_metadata = None`, and in env.py build the URL from the single `DATABASE_URL` env var (`postgresql://user:pw@host:port/db`) with `url.replace('postgresql://', 'postgresql+psycopg://', 1)` and `config.set_main_option('sqlalchemy.url', url.replace('%', '%%'))`; pass `transaction_per_migration=True` to `context.configure`; list `alembic`, `sqlalchemy`, `psycopg[binary]` in requirements.txt as migration-only deps.
 - Keep app/database.py on raw asyncpg (`asyncpg.create_pool(settings.database_url)` with the plain `postgresql://` DSN — asyncpg rejects the `postgresql+asyncpg://` scheme) and never import SQLAlchemy in app code; time-series queries are hand-written SQL per the spec.
 - Give tests a clean DB with a session-scoped, sync conftest fixture: read `TEST_DATABASE_URL` (default `postgresql://postgres:postgres@127.0.0.1:55432/savera_test`, never the dev `savera` DB), connect to the `postgres` maintenance DB with psycopg autocommit, `DROP DATABASE IF EXISTS savera_test WITH (FORCE)`, `CREATE DATABASE savera_test`, then `alembic.command.upgrade(cfg, 'head')` — this doubles as the 'migrations run clean on fresh DB' acceptance check on every test run.
 - Isolate tests with an autouse function-scoped fixture that runs `TRUNCATE wards, users, appliances, electricity_readings, water_readings, lpg_cycles, baselines, alerts, green_scores, ward_aggregates RESTART IDENTITY CASCADE` (verified to drop hypertable chunks), not per-test transaction rollback, because FastAPI BackgroundTasks and the asyncpg pool use separate connections that would not see uncommitted data; skip the DB fixtures when TEST_DATABASE_URL is unset and keep test_appliance/test_lpg/test_green_score/test_tips/test_baseline DB-free.
 - Configure pytest-asyncio 1.4 with `asyncio_mode = auto` and `asyncio_default_fixture_loop_scope = session` so a session-scoped asyncpg pool fixture (overriding app.state.pool) shares one event loop with the tests; if pytest-xdist is added, suffix the DB name with PYTEST_XDIST_WORKER and cap workers at 4 (Timescale scheduler per DB, max_background_workers = 16).
 - Do not use a template database (CREATE DATABASE ... TEMPLATE measured 0.38s vs 0.3–0.5s to run the migration) and always drop databases WITH (FORCE) because Timescale's per-database scheduler backend otherwise blocks DROP for ~6s.

OPEN:
 - What resource_type should `weekly_digest` and `milestone` alerts carry? The proposed CHECK allows 'all' in addition to 'electricity'|'water'|'lpg'; if the alerts page icon must always be one resource, drop 'all' and require the pipeline to pick one.
 - Should a second electricity bill with the same billing_period_start for a user be rejected (409) or overwrite the first (ON CONFLICT DO UPDATE)? The proposed PK forbids silent duplicates either way; the API behaviour is a product decision (recommendation: 409 by default, overwrite only from the OCR-confirm screen with an explicit flag).
 - Should water_readings allow more than one reading per user per day? The proposed PK (user_id, reading_date) allows one; use (user_id, reading_date, id) if manual + AMI readings can land on the same day.
 - Confirm users.id = Supabase auth.users.id (JWT sub). If yes, the three seed users need real Supabase accounts (or the seed inserts their known auth UUIDs) for the auth end-to-end acceptance test to reach seeded data.
 - Ward aggregates: calendar-month buckets (period_start = 1st, matching 'anomaly_flag = true in current month' and the proposed unique key) versus the '30-day avg vs previous 30 days' wording in Phase 4, which implies rolling windows that would need a different key (e.g. period_end as the upsert key, recomputed daily).
 - Is a `push_opt_in BOOLEAN NOT NULL DEFAULT FALSE` column on users wanted for the profile page's FCM toggle, or is 'fcm_token IS NULL' the opt-out representation? The spec schema has no column for the toggle.
 - docs/PHASE0_PLAN.md (referenced by SPEC.md for the API contract, baseline algorithm and locked stack) does not exist yet; index recommendations above are derived from the feature descriptions in SPEC.md and should be re-checked once the route table is written.