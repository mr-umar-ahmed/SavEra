# Phase 0 review lens: auth-infra

_Independent reviewer output (verified against the local PG15 + TimescaleDB 2.28.3 where it says so). Decisions adopted are recorded in ../PHASE0_PLAN.md._

#### LENS: auth-infra

[BLOCKER] Migration 0001 will fail: create_hypertable() rejects `id UUID PRIMARY KEY` on electricity_readings / water_readings
  detail: TimescaleDB requires every UNIQUE index (including the PK) on a hypertable to include the partitioning column. The spec's `CREATE TABLE electricity_readings (id UUID PRIMARY KEY ...)` followed by `create_hypertable('electricity_readings','billing_period_start', ...)` raises `ERROR: cannot create a unique index without the column "billing_period_start" (used in partitioning)`. Same for water_readings on reading_date. Because docker-compose runs `alembic upgrade head` before uvicorn, the backend container never comes up, and Phase 1 acceptance 'All Alembic migrations run clean on fresh DB' fails on the very first table. This is verifiable against the local PG15+Timescale 2.28.3 on 127.0.0.1:55432 before writing any app code.
  rec: In migration 0001 use composite PKs and add the per-user lookup index the queries need:

```sql
CREATE TABLE electricity_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kwh FLOAT NOT NULL CHECK (kwh > 0),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  bill_image_url TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ocr','ami')),
  billed_amount FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (billing_period_start, id),
  CHECK (billing_period_end >= billing_period_start)
);
SELECT create_hypertable('electricity_readings','billing_period_start', chunk_time_interval => INTERVAL '3 months');
CREATE INDEX idx_elec_user_period ON electricity_readings (user_id, billing_period_start DESC);
-- water_readings: PRIMARY KEY (reading_date, id); index (user_id, reading_date DESC)
```
All delete/lookups by id then use `WHERE id = $1 AND user_id = $2` (still index-assisted via the user index). Run `CREATE EXTENSION IF NOT EXISTS timescaledb;` as the first statement of 0001 (idempotent; the docker image's POSTGRES_USER is superuser, and the portable-PG bootstrap script must create the `savera` role as SUPERUSER or pre-create the extension). Alembic must run migrations with `transaction_per_migration = True` and each hypertable DDL in its own `op.execute()`.

[HIGH] Supabase JWT verification: dual-algorithm dispatch by header, async JWKS cache, strict aud/iss, and rejection of anon/service tokens
  detail: The spec only says 'Auth via Supabase JWT in Authorization: Bearer'. Concrete requirements the implementation must meet: (a) new projects sign with ES256 (RS256 optional) and publish keys at `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` with `kid`; legacy projects sign HS256 with the project JWT secret, so both paths must exist and be selected from the *unverified header* `alg`/`kid` — never by trying keys in sequence, and never passing an asymmetric public key with HS256 in `algorithms` (algorithm-confusion). (b) PyJWT's `PyJWKClient` is synchronous (urllib) — calling it inside an `async def` dependency blocks the event loop on the first request and on every key rotation; it also has no rate limit on unknown-kid refetches (an attacker can force a JWKS fetch per request). (c) Supabase access tokens carry `aud: "authenticated"`, `iss: "{SUPABASE_URL}/auth/v1"`, `sub` (auth.users.id), `email`, `role: "authenticated"`, `is_anonymous`, `user_metadata`, `app_metadata`. If `audience=` is not passed, PyJWT raises InvalidAudienceError on every token; if `iss` isn't checked, a token from any other Supabase project with the same alg would pass the JWKS path. (d) The legacy anon and service_role keys are themselves HS256 JWTs (`role: anon|service_role`) — with the HS256 secret configured they would verify and be accepted as users unless `role == "authenticated"` is enforced. (e) FastAPI's `HTTPBearer()` with the default `auto_error=True` returns **403** for a *missing* header, which collides with the Phase 4 acceptance test 'supervisor route returns 403 for citizen JWT' — missing/invalid token must be 401 with `WWW-Authenticate: Bearer`, wrong role must be 403. (f) The app role ('citizen'|'supervisor'|'admin') must come from `users.role` in our DB, not from the JWT `role` claim (always 'authenticated') and not from `user_metadata` (user-editable via supabase.auth.updateUser()).
  rec: Implement `backend/app/auth.py` (imported by `deps.py`) with pyjwt[crypto]==2.15.0 and httpx:

```python
class JWKSCache:  # app.state.jwks, one per process
    def __init__(self, url: str, ttl: int = 600): self.url, self.ttl, self.keys, self.fetched_at, self._lock = url, ttl, {}, 0.0, asyncio.Lock()
    async def get(self, kid: str) -> jwt.PyJWK | None:
        if kid in self.keys and time.time() - self.fetched_at < self.ttl: return self.keys[kid]
        async with self._lock:
            stale = time.time() - self.fetched_at >= self.ttl
            if kid not in self.keys and not stale and time.time() - self.fetched_at < 60: return None   # unknown-kid refetch at most once/min
            async with httpx.AsyncClient(timeout=5) as c: r = await c.get(self.url); r.raise_for_status()
            self.keys = {k['kid']: jwt.PyJWK.from_dict(k) for k in r.json()['keys'] if k.get('kty') in ('EC','RSA') and k.get('kid')}
            self.fetched_at = time.time()
        return self.keys.get(kid)

async def verify_supabase_jwt(token: str, settings, jwks: JWKSCache) -> dict:
    hdr = jwt.get_unverified_header(token); alg = hdr.get('alg')
    common = dict(audience='authenticated', issuer=f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1", leeway=30, options={'require': ['exp','iat','sub']})
    if alg in ('ES256','RS256'):
        k = await jwks.get(hdr.get('kid', ''))
        if k is None: raise jwt.InvalidTokenError('unknown kid')
        return jwt.decode(token, k.key, algorithms=[alg], **common)
    if alg == 'HS256':
        if not settings.SUPABASE_JWT_SECRET: raise jwt.InvalidTokenError('HS256 token but SUPABASE_JWT_SECRET not configured')
        return jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=['HS256'], **common)
    raise jwt.InvalidTokenError(f'unsupported alg {alg}')
```

Dependency (`deps.py`): `bearer = HTTPBearer(auto_error=False)`; missing/unparseable/expired token → `HTTPException(401, headers={'WWW-Authenticate': 'Bearer'})`; then reject `claims.get('role') != 'authenticated'` or `claims.get('is_anonymous')` with 403; require `email` claim (403 'account has no email'). `require_role(*roles)` returns a dependency that raises 403 'insufficient role'; `admin` is a superset of `supervisor` everywhere (`Supervisor = Depends(require_role('supervisor','admin'))`). Warm the JWKS cache in lifespan (`await jwks.get('')` wrapped in try/except, non-fatal so local dev without network still boots). Unit tests: generate an EC P-256 key with `cryptography`, serve a fake JWKS via `respx`/monkeypatched `JWKSCache.keys`, and test: valid ES256 → 200; HS256 with secret → 200; HS256 without secret → 401; expired → 401; wrong aud → 401; wrong iss → 401; anon-key JWT → 403; `alg: none` → 401; citizen on /supervisor/* → 403; no header → 401.

[HIGH] First-request user provisioning: users.id must equal the JWT `sub`, and seeded test users must exist in Supabase Auth or they can never log in
  detail: The spec's `users.id UUID DEFAULT gen_random_uuid()` implies the DB mints ids, but the only join between Supabase Auth and our tables is `users.id == JWT sub`. If provisioning inserts with the default, the same person becomes a new user on every request. Corollary for the seed script (`seed_data/test_users.py`): it inserts 3 users with 6 months of readings — if those UUIDs are not the Supabase auth.users ids, logging in as a seeded user provisions an *empty* fourth user and the demo shows no data. Also `email UNIQUE NOT NULL`: if a Supabase user is deleted and re-created with the same email (common during hackathon testing), the new `sub` collides on email and a plain INSERT raises UniqueViolationError → 500. Doing `INSERT ... ON CONFLICT (id) DO UPDATE` on *every* request also produces a dead tuple per request; the hot path should be a SELECT.
  rec: Provisioning in `get_current_user` (one query on the hot path, two on first login):

```python
SELECT_USER = 'SELECT id,email,name,ward_id,household_size,city,role,fcm_token,created_at FROM users WHERE id=$1'
row = await db.fetchrow(SELECT_USER, uid)
if row is None:
    meta = claims.get('user_metadata') or {}
    name = meta.get('name') or meta.get('full_name') or email.split('@')[0]
    try:
        await db.execute('INSERT INTO users (id,email,name) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING', uid, email, name)
    except asyncpg.UniqueViolationError:   # email already linked to another sub
        raise HTTPException(409, 'This email is linked to a different account')
    row = await db.fetchrow(SELECT_USER, uid)
elif row['email'] != email:
    await db.execute('UPDATE users SET email=$2 WHERE id=$1', uid, email)   # keep in sync after Supabase email change
```
Keep the column DEFAULT (harmless) but document in the Phase 0 schema-conflicts list that the app never relies on it. Seed script: when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, create the 3 test users through the Admin API (`POST {SUPABASE_URL}/auth/v1/admin/users`, headers `apikey: <key>` and `Authorization: Bearer <key>`, body `{email, password: SEED_USER_PASSWORD, email_confirm: true}`), re-running safely by listing `GET /auth/v1/admin/users?per_page=1000` and matching by email; use the returned `id` for the `users` row. When the keys are absent, fall back to `uuid5(NAMESPACE_URL, 'savera:seed:' + email)` and print a loud warning that these users are for pytest/integration only (auth is bypassed in tests via `app.dependency_overrides[get_current_user]`, never via an env flag in production code). For local dev without a Supabase project, provide `backend/scripts/mint_dev_token.py` that signs an HS256 token (`sub`, `email`, `aud=authenticated`, `iss={SUPABASE_URL}/auth/v1`, `role=authenticated`, 12h exp) with `SUPABASE_JWT_SECRET` — this exercises the real verification path instead of a bypass.

[HIGH] The '<400ms POST /readings/*' acceptance test cannot be written with TestClient — Starlette runs BackgroundTasks before the test client returns
  detail: Starlette/FastAPI `TestClient` (and `httpx.AsyncClient(transport=ASGITransport(app))`) await the entire ASGI call, and BackgroundTasks execute inside that call after the response body is sent. So `client.post('/api/v1/readings/electricity')` returns only after the whole pipeline (weather HTTP, FCM, ward aggregate) has finished; a latency assertion would measure pipeline time and fail, or worse, silently pass because mocks are fast — proving nothing. Two further pipeline hazards: (1) FastAPI's yield-dependency exit timing changed in 0.106 and again in 0.118 (`Depends(scope=...)`); a background task that reuses the request's `get_db` connection may run after the connection was returned to the pool (in some versions it works, in others it raises `InterfaceError: connection is released`). (2) BackgroundTasks run on the request's event loop — a CPU-bound step (Tesseract, Pillow resize) inside an `async def` task blocks every other request for its duration.
  rec: Pipeline contract: the route does exactly one INSERT ... RETURNING and schedules `bg.add_task(run_post_reading_pipeline, request.app.state, user.id, 'electricity', reading_id)`. `run_post_reading_pipeline` is an `async def` in `app/services/pipeline.py` that opens its own connection (`async with state.pool.acquire() as conn:`) and runs each step in its own `try/except Exception: log.exception(...)` so one failing step (e.g. Open-Meteo timeout) does not skip the ward-aggregate upsert: appliance breakdown (electricity only) → anomaly check vs baselines → weather enrichment (httpx, `timeout=5`) → alert insert + push → green-score upsert for the current month → ward-aggregate upsert. Anything CPU-bound runs via `await asyncio.to_thread(...)`. Latency test: add a `live_server` session fixture in `tests/conftest.py` that starts `uvicorn.Server(uvicorn.Config(app, host='127.0.0.1', port=<free port from socket.bind(('127.0.0.1',0))>, log_level='warning'))` in a `threading.Thread`, waits for `/healthz`, and hit it with real `httpx.AsyncClient(base_url=...)`; monkeypatch `pipeline.run_post_reading_pipeline` with an `async def` that `await asyncio.sleep(2)` and assert `elapsed < 0.4` **and** that the pipeline stub was invoked. Keep a second, TestClient-based integration test for 'alert is created when anomaly fires' — there the run-before-return behaviour is exactly what you want (no polling). Document in `tests/README` that BackgroundTasks are in-memory: lost on restart/`--reload`, no retry — acceptable for MVP, listed in FUTURE.md.

[HIGH] ward_aggregates has no UNIQUE constraint, so the spec's 'ward aggregate upsert on every new reading' is impossible as written
  detail: `services/ward.py` is supposed to upsert one row per (ward, resource, period) from the post-reading pipeline. The spec table has only a UUID PK, so `INSERT ... ON CONFLICT` has no target and every reading appends a duplicate row; the supervisor heatmap and the 3-month rolling anomaly check then double-count. Same concurrency shape for `lpg_cycles`: the spec's `UNIQUE (user_id, end_date)` does nothing for open cycles (NULLs are distinct) and 'enforce single open cycle at app layer' is racy under two concurrent POSTs.
  rec: Add to migration 0001: `ALTER TABLE ward_aggregates ADD CONSTRAINT uq_ward_agg UNIQUE (ward_id, resource_type, period_start);` and make `period_start` always the first of the month (`date_trunc('month', billing_period_start)::date` for electricity, `date_trunc('month', reading_date)::date` for water, `date_trunc('month', end_date)::date` for closed LPG cycles). Upsert SQL:
```sql
INSERT INTO ward_aggregates (ward_id, resource_type, period_start, period_end, avg_consumption, total_consumption, household_count, pct_change_vs_prev, anomaly_flag)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
ON CONFLICT (ward_id, resource_type, period_start) DO UPDATE SET
  avg_consumption=EXCLUDED.avg_consumption, total_consumption=EXCLUDED.total_consumption,
  household_count=EXCLUDED.household_count, pct_change_vs_prev=EXCLUDED.pct_change_vs_prev,
  anomaly_flag=EXCLUDED.anomaly_flag, created_at=NOW();
```
where the values are recomputed from the readings tables for that ward/month (idempotent, so re-running the pipeline is safe). For LPG replace the useless constraint with `CREATE UNIQUE INDEX one_open_cycle_per_user ON lpg_cycles (user_id) WHERE end_date IS NULL;` and map `UniqueViolationError` on POST /lpg/cycles to 409. Record both as deliberate deviations in the Phase 0 schema-conflicts list.

[HIGH] Privacy threshold (household_count >= 10) vs. a 3-user seed: the supervisor dashboard and peer comparison will be empty in every demo
  detail: Phase 4 requires the ≥10-households check on the ward_aggregates *query path* and that supervisor endpoints return only ward_aggregates rows. With the spec's seed (3 test users, likely in ≤3 wards) no ward ever reaches 10, so applying the check honestly makes `/supervisor/*` return nothing and peer comparison always null — the Phase 4 end-to-end acceptance ('supervisor sees updated heatmap') is undemonstrable. Making the threshold an env var is a privacy footgun. A second gap: 'supervisors can view wards they manage' has no supporting schema (users.ward_id is a single ward, there is no supervisor→wards mapping).
  rec: Hard-code `MIN_HOUSEHOLDS_FOR_AGGREGATE = 10` in `services/ward.py` and apply it in SQL for *both* the peer comparison and every supervisor query (`WHERE household_count >= 10`), returning `{available: false, reason: 'insufficient_households'}` rather than a fabricated number. Make the seed script produce ≥10 households per demo ward: the 3 named test users (stable / seasonal spike / water anomaly) **plus** 12 anonymous filler households in ward A and 10 in ward B (rows in `users` with `email = 'seed+<n>@savera.local'`, uuid5 ids, readings only, no Supabase Auth accounts — they can never log in, so no auth bypass is created), then run the ward-aggregate upsert for the last 6 months so the heatmap, % change and the injected-spike anomaly flag are all present at first launch. Supervisor scope for MVP: a supervisor sees all wards where `wards.city = users.city` (no new table); write this to FUTURE.md as 'supervisor_wards mapping'. Privacy test: serialize every `/supervisor/*` response to JSON and assert neither the key `user_id` nor any seeded user UUID string appears.

[HIGH] OCR flow conflicts with the operating rules: 'OCR runs in BackgroundTasks' vs. 'extracted data shown for confirmation' — needs a bill_uploads table and a 202/poll contract
  detail: Agent Operating Rules say OCR parsing must run in BackgroundTasks; Phase 1 says upload → OCR → user confirms → save; the schema has no table to hold an in-flight OCR result, raw text, confidence, or the 'flag for manual review' state. Doing OCR synchronously inside `POST /bills` (GCV 1–4s, Tesseract 5–20s on a phone photo) is simpler but violates the explicit rule and, with Tesseract in an `async def` handler, blocks the loop. Either choice is a spec deviation, so it needs plan-phase sign-off.
  rec: Recommended (rule-compliant): add in migration 0002
```sql
CREATE TABLE bill_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,                 -- '<user_id>/<id>.jpg' under UPLOADS_DIR
  status TEXT NOT NULL DEFAULT 'processing', -- processing|done|needs_review|ocr_unavailable|failed
  provider TEXT,                             -- 'gcv' | 'tesseract'
  confidence FLOAT,
  raw_text TEXT,
  extracted JSONB,                           -- {kwh, billing_period_start, billing_period_end, billed_amount}
  reading_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bill_uploads_user ON bill_uploads (user_id, created_at DESC);
```
Flow: `POST /api/v1/bills` (multipart `file`) validates + stores the image, inserts status=processing, schedules `bg.add_task(run_ocr, state, upload_id)` and returns **202** `{id, status, image_url}` in <100ms. `run_ocr` is a *sync* function (Starlette runs sync background tasks in its threadpool, so Tesseract cannot block the loop) that calls GCV via `httpx.Client` then Tesseract, writes `status/provider/confidence/raw_text/extracted`, and never raises. Frontend polls `GET /api/v1/bills/{id}` every 1.5s for ≤30s; `done` pre-fills the form, `needs_review` shows raw_text beside editable fields, `ocr_unavailable` drops straight to manual entry. Confirmation is the normal `POST /api/v1/readings/electricity` with `bill_upload_id`, which sets `source='ocr'`, `bill_image_url='/api/v1/bills/{id}/image'`, and `bill_uploads.reading_id`. If the team prefers to cut scope, the sync alternative is acceptable only with GCV timeout 15s, Tesseract in `asyncio.to_thread`, and a stated exception to the rule in PHASE0_PLAN.md.

[HIGH] FCM: legacy server key is dead — use firebase-admin 7.x with a service-account JSON, call it off the event loop, and inject a fake client for tests
  detail: The spec's Phase 0 checklist still lists 'FCM server key'; legacy HTTP API keys no longer work (HTTP v1 only). firebase-admin 7.7.0 specifics that bite: `messaging.send()` is synchronous (google-auth + requests) and blocks the loop if awaited from an `async def` background task; `send_all()`/`send_multicast()` were removed in 7.0 (use `send_each` / `send_each_for_multicast`); `firebase_admin.initialize_app()` raises if called twice (uvicorn `--reload` re-imports modules) and needs credentials at import time if done at module level, which breaks unit tests that never set credentials. Invalid/rotated device tokens raise `messaging.UnregisteredError` and must clear `users.fcm_token` or every future alert logs an error. Web push additionally needs a VAPID key on the frontend and a service worker in `public/` that cannot read `process.env`.
  rec: `app/services/push.py`:
```python
class PushClient(Protocol):
    async def send(self, token: str, title: str, body: str, data: dict[str, str]) -> PushResult: ...
class NullPushClient:      # chosen when no credentials; logs at INFO once
class FakePushClient:      # tests: self.sent: list[dict]
class FirebasePushClient:
    def __init__(self, cred: dict | str):  # dict from FIREBASE_SERVICE_ACCOUNT_JSON or path from FIREBASE_SERVICE_ACCOUNT_FILE
        import firebase_admin; from firebase_admin import credentials
        self.app = firebase_admin.get_app() if firebase_admin._apps else firebase_admin.initialize_app(credentials.Certificate(cred))
    async def send(self, token, title, body, data):
        from firebase_admin import messaging
        msg = messaging.Message(token=token, notification=messaging.Notification(title=title, body=body), data=data,
                                webpush=messaging.WebpushConfig(fcm_options=messaging.WebpushFCMOptions(link=data.get('url','/alerts'))))
        try: return PushResult(ok=True, message_id=await asyncio.to_thread(messaging.send, msg, False, self.app))
        except messaging.UnregisteredError: return PushResult(ok=False, invalid_token=True)
```
Build it in lifespan (`app.state.push = build_push_client(settings)`); `alerts_svc.create_alert(...)` inserts the alert row first, then pushes only when `alert_type in ('high_consumption','leak_suspected')` and `resource_type in ('electricity','water')` and `severity == 'high'`, and on `invalid_token` runs `UPDATE users SET fcm_token=NULL WHERE id=$1`. `data` values must all be strings (FCM rejects non-string data). Tests: fixture `app.state.push = FakePushClient()`; assert `fake.sent[0] == {token, title, body, data: {alert_id, resource_type, alert_type, url}}`; plus one unit test that patches `firebase_admin.messaging.send` with `unittest.mock.patch` and inspects the `Message` object. Frontend: `NEXT_PUBLIC_FIREBASE_*` + `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, register the SW as `navigator.serviceWorker.register('/firebase-messaging-sw.js?' + new URLSearchParams(firebaseConfig))` and read `self.location.search` inside the worker; `getToken()` on every app load and `PUT /profile/push-token` if it changed.

[HIGH] APScheduler inside uvicorn: duplicate job execution under >1 worker and dev `--reload`; jobs need their own pool access and an IST timezone
  detail: `AsyncIOScheduler` started in lifespan runs once per *process*; `uvicorn --workers 2` or `gunicorn -w N` would send every 7am LPG push N times. Under `--reload` the reloader spawns a worker child, so the scheduler runs in the worker (fine) but is killed mid-job on every file save. Jobs also need the asyncpg pool (`app.state`) and the push client, and 'every morning at 7am' means 07:00 Asia/Kolkata — Docker and the portable PG default to UTC, and `date.today()` in `predict_finish` is server-local, so in a UTC container the LPG prediction is one day off between 00:00–05:30 IST.
  rec: `app/tasks/scheduler.py`: `scheduler = AsyncIOScheduler(timezone=settings.SCHEDULER_TIMEZONE)` (default `Asia/Kolkata`), started in lifespan only when `settings.SCHEDULER_ENABLED` (default true; set false in tests and on any extra worker). Jobs: `monthly_baselines` `CronTrigger(day=1, hour=2, minute=0)`, `daily_lpg_check` `CronTrigger(hour=7, minute=0)`, `weekly_digest` `CronTrigger(day_of_week='mon', hour=8, minute=0)`; each with `coalesce=True, max_instances=1, misfire_grace_time=3600`, `args=[app.state]`. Wrap every job body in a Postgres advisory lock so it is safe even if two processes run it: `async with pool.acquire() as conn: got = await conn.fetchval("SELECT pg_try_advisory_lock(hashtext($1))", 'savera:job:'+name); if not got: return; try: ... finally: await conn.execute('SELECT pg_advisory_unlock(hashtext($1))', ...)`. Document 'run exactly one uvicorn worker' in README and compose. Provide `python -m app.tasks.run_job monthly_baselines|daily_lpg_check|weekly_digest` (CLI, no API route) for demos and for seeding. Use `datetime.now(ZoneInfo('Asia/Kolkata')).date()` instead of `date.today()` in services/lpg.py and services/green_score.py, injected as a `today: date` parameter so tests are deterministic.

[MEDIUM] Complete environment variable list (backend + frontend + compose) — the spec's Phase 0 list is incomplete and names a dead key
  detail: The spec lists five vars (Supabase URL, anon key, service key, GCV key, FCM server key). The real set is larger, the FCM server key no longer exists, `SUPABASE_SERVICE_ROLE_KEY` must never be read by the request path, and the frontend and backend read different files (Next.js only loads `frontend/.env.local`; pydantic-settings loads what you point it at). One canonical `.env.example` at the repo root (as in the spec's folder tree) can serve both if backend ignores unknown vars and frontend ignores non-`NEXT_PUBLIC_` ones.
  rec: Root `.env.example` (copy to `backend/.env` and `frontend/.env.local`; pydantic-settings uses `SettingsConfigDict(env_file=(REPO_ROOT/'.env', BACKEND_DIR/'.env'), extra='ignore')`):

```
# --- backend: core ---
APP_ENV=development                      # development | test | production
DATABASE_URL=postgresql://savera:savera@127.0.0.1:55432/savera   # asyncpg DSN (alembic derives postgresql+asyncpg://)
TEST_DATABASE_URL=postgresql://savera:savera@127.0.0.1:55432/savera_test
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000          # comma-separated exact origins
LOG_LEVEL=info
SCHEDULER_ENABLED=true
SCHEDULER_TIMEZONE=Asia/Kolkata
# --- backend: Supabase auth ---
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_JWT_SECRET=                     # legacy HS256 projects only; leave empty for ES256/JWKS projects
SUPABASE_JWKS_URL=                       # optional override; default {SUPABASE_URL}/auth/v1/.well-known/jwks.json
SUPABASE_SERVICE_ROLE_KEY=               # seed script only (admin user creation); NEVER used at request time
SEED_USER_PASSWORD=Savera@2026!
# --- backend: OCR ---
GCV_API_KEY=                             # Google Cloud Vision, REST; empty = skip GCV
TESSERACT_CMD=                           # e.g. C:\Program Files\Tesseract-OCR\tesseract.exe; empty = use PATH
UPLOADS_DIR=./uploads
MAX_UPLOAD_MB=8
# --- backend: push ---
FIREBASE_SERVICE_ACCOUNT_FILE=./secrets/firebase-service-account.json   # or:
FIREBASE_SERVICE_ACCOUNT_JSON=           # the JSON as one line (PaaS/compose); either one; both empty = push disabled
# --- backend: weather ---
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1
# --- docker-compose (db service) ---
POSTGRES_USER=savera
POSTGRES_PASSWORD=savera
POSTGRES_DB=savera
POSTGRES_PORT=55432                      # host port; matches the portable-PG dev path so DATABASE_URL is identical
# --- frontend (frontend/.env.local) ---
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=           # legacy anon JWT or new sb_publishable_... key; both work with supabase-js 2.117
NEXT_PUBLIC_API_URL=http://localhost:8000   # lib/api.ts appends /api/v1
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=          # Web Push certificate key pair from Firebase console
```
`config.py` validates at startup: `SUPABASE_URL` required unless `APP_ENV=test`; warn (not fail) when neither `SUPABASE_JWT_SECRET` nor JWKS is reachable; warn when push/OCR are disabled. Add `backend/secrets/` to `.gitignore` (the existing `*service-account*.json` pattern already covers the file, the directory entry documents intent).

[MEDIUM] docker-compose: timescale/timescaledb:2.28.3-pg15 + backend with healthchecks and migrations-on-start (cannot be executed on this machine — review by reading)
  detail: No Docker locally, so compose correctness rests on inspection; keep it to two services and avoid the usual traps: (1) `depends_on` without `condition: service_healthy` starts the backend before Postgres accepts connections and `alembic upgrade head` fails; (2) bind-mounting a single secret file that does not exist makes Docker create an empty *directory* at that path on the host; (3) putting `wards.sql` in `/docker-entrypoint-initdb.d/` runs before Alembic creates the table; (4) `python:3.14-slim` has no `curl`, so the backend healthcheck must use Python; (5) the Timescale image auto-adds `shared_preload_libraries=timescaledb` and makes POSTGRES_USER a superuser, so `CREATE EXTENSION` works there — the portable Windows PG needs the same two things done explicitly.
  rec: ```yaml
services:
  db:
    image: timescale/timescaledb:2.28.3-pg15
    environment: { POSTGRES_USER: ${POSTGRES_USER:-savera}, POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-savera}, POSTGRES_DB: ${POSTGRES_DB:-savera} }
    ports: ["${POSTGRES_PORT:-55432}:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-savera} -d ${POSTGRES_DB:-savera}"]
      interval: 5s
      timeout: 3s
      retries: 20
      start_period: 10s
  backend:
    build: ./backend
    env_file: [./backend/.env]
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-savera}:${POSTGRES_PASSWORD:-savera}@db:5432/${POSTGRES_DB:-savera}
      UPLOADS_DIR: /app/uploads
      FIREBASE_SERVICE_ACCOUNT_FILE: /app/secrets/firebase-service-account.json
    ports: ["8000:8000"]
    volumes: ["./backend/uploads:/app/uploads", "./backend/secrets:/app/secrets:ro"]   # directories, never single files
    depends_on: { db: { condition: service_healthy } }
    command: ["sh", "-c", "alembic upgrade head && python -m seed_data.wards && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1"]
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3).status == 200 else 1)"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 20s
volumes: { pgdata: {} }
```
`backend/Dockerfile`: `FROM python:3.14-slim`, `apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng`, `pip install -r requirements.txt` (all needed cp314 wheels exist per the verified facts; if a build fails on a dep, drop to `python:3.12-slim` and note it), `COPY . .`, `EXPOSE 8000`. `seed_data.wards` must be idempotent (`INSERT ... ON CONFLICT (id) DO NOTHING` with explicit ids). `GET /healthz` (outside /api/v1, no auth) runs `SELECT 1` on the pool and returns `{status:'ok', db:'ok', version}`. `alembic/env.py` builds the URL as `settings.DATABASE_URL.replace('postgresql://','postgresql+asyncpg://',1)` and uses the async-engine `run_sync` pattern, so asyncpg is the only driver in `requirements.txt` (SQLAlchemy is present solely because Alembic needs it; no ORM models).

[MEDIUM] Windows-without-Docker dev path: portable PG bootstrap, pytest-asyncio loop scope, and reload caveats
  detail: The verified environment has PG15+Timescale 2.28.3 on 127.0.0.1:55432 but no Docker, no `make`, and no Tesseract. Things that break out of the box on Windows: `CREATE EXTENSION timescaledb` fails unless `shared_preload_libraries='timescaledb'` is in postgresql.conf *and* the connecting role is superuser; pytest-asyncio 1.x removed the `event_loop` fixture, so a session-scoped asyncpg pool fixture raises 'attached to a different loop' unless the default loop scopes are set; `uvicorn --reload` uses `watchfiles` and restarts kill in-flight BackgroundTasks; Tesseract from the UB-Mannheim installer is not added to PATH.
  rec: Provide `scripts/dev-db.ps1 -Action init|start|stop|status` (PowerShell 5.1-safe: no `&&`, no `??`) around the portable PG under `.local/pg15/` (already gitignored): `init` runs `initdb -U postgres -E UTF8 -D .local/pgdata`, appends `shared_preload_libraries = 'timescaledb'` and `port = 55432` to `postgresql.conf`, `pg_ctl start`, then `psql -U postgres -p 55432 -c "CREATE ROLE savera LOGIN SUPERUSER PASSWORD 'savera'"`, `createdb -O savera savera`, `createdb -O savera savera_test`, and `psql -d savera -c 'CREATE EXTENSION IF NOT EXISTS timescaledb'` (same for savera_test); `status` prints `SHOW shared_preload_libraries` and `SELECT extversion FROM pg_extension WHERE extname='timescaledb'`. Backend: `python -m venv .venv; .venv\Scripts\pip install -r requirements.txt; alembic upgrade head; python -m seed_data.wards; python -m seed_data.test_users; uvicorn app.main:app --reload --port 8000`. `backend/pytest.ini`: `asyncio_mode = auto`, `asyncio_default_fixture_loop_scope = session`, `asyncio_default_test_loop_scope = session`; conftest creates one pool against `TEST_DATABASE_URL`, runs `alembic upgrade head` once per session (subprocess), and `TRUNCATE ... CASCADE` all tables between tests (works on hypertables). `requirements.txt` pins: fastapi==0.141.1, uvicorn[standard]==0.53.0, asyncpg==0.31.0, alembic==1.20.0, sqlalchemy[asyncio]==2.0.54, pyjwt[crypto]==2.15.0, httpx==0.28.1, firebase-admin==7.7.0, apscheduler==3.11.3, pytesseract==0.3.13, pillow==12.3.0, python-multipart==0.0.32, pydantic-settings==2.15.0, pytest==9.1.1, pytest-asyncio==1.4.0, respx (latest). Document `TESSERACT_CMD` for Windows and that `winget install UB-Mannheim.TesseractOCR` is optional — the app must run without it.

[MEDIUM] Google Cloud Vision over REST with an API key, and a Tesseract fallback that degrades to 'ocr_unavailable' instead of erroring
  detail: Using the `google-cloud-vision` gRPC client needs ADC/service-account credentials and drags in grpcio; the REST endpoint accepts a plain API key. Passing the key as `?key=` puts it in access logs and proxies; Google also accepts the `x-goog-api-key` header. GCV failure modes to distinguish: HTTP 429 `RESOURCE_EXHAUSTED` (quota → fallback), 403 (API not enabled / key restricted / billing → fallback + warn), 400 (bad image → no fallback, `failed`), per-image `responses[0].error`. Tesseract is absent on this machine, and `pytesseract` raises `TesseractNotFoundError` at call time, not import time — the fallback must detect that and still return a usable result to the UI. Bill photos are often 4000px and 5MB; sending them raw to GCV is slow and to Tesseract is very slow.
  rec: `services/ocr.py` exposes `run_ocr(image_bytes) -> OCRResult(provider, raw_text, confidence, extracted, status)`; it is *sync* (called from the sync background task) and uses `httpx.Client(timeout=15)`:
```python
GCV_URL = 'https://vision.googleapis.com/v1/images:annotate'
body = {'requests': [{'image': {'content': base64.b64encode(jpeg).decode()},
                      'features': [{'type': 'DOCUMENT_TEXT_DETECTION'}],
                      'imageContext': {'languageHints': ['en']}}]}
r = client.post(GCV_URL, json=body, headers={'x-goog-api-key': settings.GCV_API_KEY})
if r.status_code in (429, 403): raise GCVUnavailable(r.status_code)
r.raise_for_status(); resp = r.json()['responses'][0]
if 'error' in resp: raise GCVUnavailable(resp['error'].get('code'))
text = (resp.get('fullTextAnnotation') or {}).get('text') or ''
```
Pre-process once with Pillow: `ImageOps.exif_transpose`, convert to RGB, `thumbnail((2000, 2000))`, re-encode JPEG q=85 (this also strips EXIF/GPS and normalises whatever the client uploaded). Order: if `GCV_API_KEY` empty → skip to Tesseract; on `GCVUnavailable` → Tesseract; Tesseract path: `if settings.TESSERACT_CMD: pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD`; `if not (settings.TESSERACT_CMD or shutil.which('tesseract')): raise OCRUnavailable`; catch `pytesseract.TesseractNotFoundError` as `OCRUnavailable` too; `image_to_string(img, config='--psm 6')`. `OCRUnavailable` → `status='ocr_unavailable'` (HTTP 200 on the poll endpoint, never 5xx). Confidence: GCV `pages[].confidence` mean when present, else a heuristic (kWh found + at least one date found → 0.8; only one → 0.5; none → 0.2); `< 0.7` → `needs_review` with raw_text returned. Accept only `image/jpeg|png|webp` verified by `Image.open(...).verify()` on the bytes (ignore the client content-type), reject PDF with 415 and the message 'photograph the bill' — PDF support needs a different GCV endpoint and poppler, so it goes to FUTURE.md. `tests/test_ocr.py` mocks the GCV HTTP call with `respx` (200 with a BESCOM-like fullTextAnnotation, 429, 403) and monkeypatches `shutil.which` to None to assert the graceful `ocr_unavailable` path.

[MEDIUM] Bill image storage: local UPLOADS_DIR served only through an authenticated endpoint; Supabase Storage deferred
  detail: Bill images contain PII (name, address, consumer number, meter number). Mounting `StaticFiles` at `/uploads` would make every bill world-readable by URL guess. Supabase Storage is the 'proper' answer but adds a bucket, RLS policies or service-role usage from the backend, signed-URL generation and a second credential path — none of which serve the three MVP mechanisms. The trade-off of local disk is ephemeral storage on PaaS without a persistent disk and single-instance only, which matches the single-worker constraint already imposed by APScheduler.
  rec: Store files under `UPLOADS_DIR/<user_id>/<upload_id>.jpg` (always the re-encoded JPEG from the OCR pre-processing step; never the client filename). Serve via `GET /api/v1/bills/{id}/image` → `FileResponse(path, media_type='image/jpeg', headers={'Cache-Control': 'private, max-age=3600'})` after checking `bill_uploads.user_id == current_user.id` (404 otherwise, not 403, to avoid confirming existence). Persist `electricity_readings.bill_image_url = '/api/v1/bills/{id}/image'` (a host-relative API path, so it survives host changes; `lib/api.ts` prefixes `NEXT_PUBLIC_API_URL`). In compose the directory is a bind mount; locally it is `backend/uploads/` (already gitignored). Write to FUTURE.md: 'move to Supabase Storage bucket `bills` with per-user prefix + signed URLs when deploying multi-instance'. Deleting a reading deletes the file best-effort in a background task.

[MEDIUM] FastAPI app skeleton: asyncpg pool lifecycle, JSONB codecs, CORS specifics
  detail: Details that otherwise surface as runtime bugs: asyncpg returns `jsonb` columns as *strings* unless a codec is registered, so `alerts.context` and `bill_uploads.extracted` come back as `str` and the Pydantic response models fail or double-encode; asyncpg wants a `postgresql://` DSN (not `postgresql+asyncpg://`); CORS preflights for `Authorization` fail unless the header is allowed; `localhost:3000` and `127.0.0.1:3000` are different origins; with Bearer auth (no cookies) `allow_credentials` should be False, which also keeps `*` legal in dev.
  rec: `app/database.py`:
```python
async def _init_conn(conn):
    for t in ('json', 'jsonb'):
        await conn.set_type_codec(t, encoder=json.dumps, decoder=json.loads, schema='pg_catalog')
async def create_pool(dsn): return await asyncpg.create_pool(dsn, min_size=2, max_size=10, command_timeout=30, init=_init_conn, server_settings={'application_name': 'savera-api'})
```
`app/main.py` lifespan: create pool → `app.state.jwks = JWKSCache(settings.jwks_url)` (+ non-fatal warm) → `app.state.push = build_push_client(settings)` → start scheduler if enabled; shutdown in reverse (`scheduler.shutdown(wait=False)`, `await pool.close()`). `deps.get_db`: `async with request.app.state.pool.acquire() as conn: yield conn` — request scope only; background tasks and jobs acquire their own. Multi-statement writes (e.g. `PUT /profile/appliances` replace-all, LPG close + baseline refresh) use `async with conn.transaction():`. CORS: `CORSMiddleware(allow_origins=settings.cors_origins_list, allow_origin_regex=r'^https://.*\.vercel\.app$' if APP_ENV != 'production' else None, allow_credentials=False, allow_methods=['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allow_headers=['Authorization','Content-Type'], max_age=600)`. Keep FastAPI's default `{detail: ...}` error body; add `X-Request-ID` middleware (uuid4) and log it with every pipeline step so a failed background step can be traced to its request. Routers mounted under `APIRouter(prefix='/api/v1')`; `/healthz` at the root.

[MEDIUM] Proposed /api/v1 route table (all routes require a valid Supabase JWT unless noted; supervisor routes require role in {supervisor, admin})
  detail: The spec's API Contract section is empty. The table below covers bills, readings, lpg, insights, alerts, profile, wards and supervisor with method, path, auth, and request/response shape. Status codes: 201 on create, 202 on accepted async work, 204 on no-content mutations, 401 missing/invalid token, 403 wrong role or anonymous/service token, 404 for not-found-or-not-yours, 409 for state conflicts, 415 unsupported upload, 422 validation.
  rec: OPS
- GET /healthz — no auth — → {status, db, version}

PROFILE (routers/profile.py)
- GET /api/v1/profile — user — → {id, email, name, ward_id, ward_name, household_size, city, role, push_enabled, created_at}
- PATCH /api/v1/profile — user — {name?, ward_id?, household_size? (1..20), city?} → same as GET
- PUT /api/v1/profile/push-token — user — {fcm_token} → 204 (opt-in)
- DELETE /api/v1/profile/push-token — user — → 204 (opt-out; sets fcm_token NULL)
- GET /api/v1/profile/appliances — user — → [{id, type, count, daily_hours, star_rating, wattage_override, effective_watts}]
- PUT /api/v1/profile/appliances — user — {appliances: [{type, count, daily_hours, star_rating?, wattage_override?}]} → same list (transactional replace-all; `type` validated against the BEE table, 422 otherwise)
- GET /api/v1/profile/appliance-types — user — → [{type, label, has_star_rating, default_hours, watts_by_star}] (static catalog so the form and backend cannot drift)

WARDS (routers/profile.py or wards.py)
- GET /api/v1/wards?city=Bengaluru — user — → [{id, name, city}]

READINGS (routers/readings.py)
- POST /api/v1/readings/electricity — user — {kwh (1..5000), billing_period_start, billing_period_end (>= start, <= start+100d), billed_amount?, bill_upload_id?} → 201 {id, kwh, billing_period_start, billing_period_end, billing_days, billed_amount, source, bill_image_url, created_at, pipeline: 'queued'} (returns in <400ms; schedules pipeline)
- GET /api/v1/readings/electricity?limit=12 — user — → {items: [reading + kwh_per_day], newest first}
- DELETE /api/v1/readings/electricity/{id} — user — → 204 (owner only; re-queues ward aggregate recompute)
- POST /api/v1/readings/water — user — {liters (1..100000), reading_date (<= today)} → 201 {id, liters, reading_date, source, created_at, pipeline: 'queued'}
- GET /api/v1/readings/water?limit=60&from=&to= — user — → {items: [...]}
- DELETE /api/v1/readings/water/{id} — user — → 204

BILLS (routers/bills.py)
- POST /api/v1/bills — user — multipart `file` (jpeg/png/webp, <= MAX_UPLOAD_MB) → 202 {id, status: 'processing'|'ocr_unavailable', image_url}
- GET /api/v1/bills/{id} — user — → {id, status, provider, confidence, extracted: {kwh, billing_period_start, billing_period_end, billed_amount} | null, raw_text (only when status in done|needs_review), image_url, reading_id, created_at}
- GET /api/v1/bills/{id}/image — user (owner) — → image/jpeg bytes
(confirmation = POST /readings/electricity with bill_upload_id; source becomes 'ocr')

LPG (routers/lpg.py)
- GET /api/v1/lpg/cycles?limit=12 — user — → {active: Cycle|null, history: [Cycle]} where Cycle = {id, cylinder_kg, start_date, end_date, days, daily_burn_rate}
- POST /api/v1/lpg/cycles — user — {cylinder_kg = 14.2, start_date} → 201 Cycle; 409 if an open cycle exists
- POST /api/v1/lpg/cycles/{id}/close — user — {end_date (>= start_date, <= today)} → 200 Cycle (daily_burn_rate computed; queues LPG baseline/green-score/ward steps); 409 if already closed
- GET /api/v1/lpg/prediction — user — → {active_cycle: Cycle|null, prediction: {estimated_finish_date, refill_alert_date, kg_remaining, pct_remaining, burn_rate_kg_per_day, days_to_empty, should_alert_now, burn_rate_source: 'history'|'default'} | null}

INSIGHTS (routers/insights.py)
- GET /api/v1/insights/summary — user — → {green_score: {month, total, electricity, water, lpg, ward_percentile, normalised_by_household_size: true} | null, resources: {electricity: {current, period_label, baseline_mean, upper_threshold, status: 'green'|'yellow'|'red'|'no_baseline'}, water: {...per-day...}, lpg: {...}}, unread_alerts: n, lpg_prediction: (as above, compact), ward_comparison: {available, pct_vs_ward, ward_avg, household_count} }
- GET /api/v1/insights/electricity?months=6 — user — → {readings: [{period_start, period_end, kwh}] (asc), baseline: {mean, std_dev, upper_threshold, lower_threshold, sample_count, computed_at} | null, breakdown: [{type, kwh, pct}], unknown_load_kwh, over_baseline: bool, tips: [str] (2, only when over_baseline), peer_comparison: {available, ward_avg_kwh, household_count} }
- GET /api/v1/insights/water?months=6 — user — → {monthly: [{month, liters, days_recorded}], baseline: {...} | null, over_baseline, tips, leak_suspected: bool}
- GET /api/v1/insights/green-score?months=6 — user — → [{month, total_score, electricity_score, water_score, lpg_score, ward_percentile}]

ALERTS (routers/alerts.py)
- GET /api/v1/alerts?unread_only=false&limit=50&before=<created_at cursor> — user — → {items: [{id, resource_type, alert_type, title, message, context, is_read, created_at}], unread_count, next_before}
- POST /api/v1/alerts/{id}/read — user — → 204 (idempotent)
- POST /api/v1/alerts/read-all — user — → 204

SUPERVISOR (routers/supervisor.py; require_role('supervisor','admin'); every query reads ward_aggregates only, with `household_count >= 10`)
- GET /api/v1/supervisor/wards — supervisor — → [{id, name, city, has_data}] (wards in the supervisor's city)
- GET /api/v1/supervisor/wards/{ward_id}/heatmap — supervisor — → {ward: {id, name}, rows: [{resource_type, current: {period_start, period_end, avg_consumption, total_consumption, household_count}, previous: {...} | null, pct_change_vs_prev, anomaly_flag}], suppressed: [resource_type...] } (30-day windows = current and previous month rows)
- GET /api/v1/supervisor/anomalies?month=YYYY-MM — supervisor — → [{ward_id, ward_name, resource_type, period_start, avg_consumption, pct_change_vs_prev, rolling_3m_avg}] where anomaly_flag = true
- GET /api/v1/supervisor/compare?resource=electricity&ward_ids=1,2,3&month=YYYY-MM — supervisor — → [{ward_id, ward_name, avg_per_household, household_count}]

CLI (no HTTP): `python -m app.tasks.run_job {monthly_baselines|daily_lpg_check|weekly_digest}`; `python -m seed_data.wards`; `python -m seed_data.test_users`.

[LOW] Frontend auth plumbing notes that affect the backend contract (Next 16 proxy.ts, token retrieval, magic-link callback)
  detail: Not my primary lens, but three items determine whether 'signup → login → protected route' works end-to-end with the JWT design above: Next.js 16 renamed `middleware.ts` to `proxy.ts` (the Supabase SSR docs' middleware snippet must go there); dashboard data should be fetched client-side with the session access token (server-side fetching would need cookie → header forwarding on every RSC call and doubles the auth plumbing); magic links need an `app/auth/confirm/route.ts` that calls `supabase.auth.verifyOtp({token_hash, type})`.
  rec: `lib/supabase.ts` exports `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)` from `@supabase/ssr`; `lib/api.ts` does `const { data: { session } } = await supabase.auth.getSession(); fetch(`${NEXT_PUBLIC_API_URL}/api/v1${path}`, { headers: { Authorization: `Bearer ${session.access_token}` } })` and on 401 calls `supabase.auth.refreshSession()` once then redirects to /login. Route protection lives in `frontend/proxy.ts` (session refresh + redirect for `(dashboard)` and `/supervisor`); the supervisor page additionally checks `role` from `GET /api/v1/profile` because role is a DB fact, not a JWT claim. Auth redirect URL in the Supabase dashboard: `http://localhost:3000/auth/confirm`.

DECISIONS:
 - Use composite primary keys (billing_period_start, id) and (reading_date, id) on the two hypertables and add (user_id, <time col> DESC) indexes in migration 0001.
 - Dispatch JWT verification on the unverified header alg: ES256/RS256 via an async, TTL-cached JWKS fetched from {SUPABASE_URL}/auth/v1/.well-known/jwks.json, HS256 via SUPABASE_JWT_SECRET, anything else rejected.
 - Always decode with audience='authenticated', issuer='{SUPABASE_URL}/auth/v1', leeway=30 and require exp/iat/sub; reject tokens whose role claim is not 'authenticated' or that carry is_anonymous=true.
 - Return 401 with WWW-Authenticate: Bearer for missing or invalid tokens (HTTPBearer(auto_error=False)) and 403 for insufficient role or anonymous/service tokens.
 - Treat users.role in Postgres as the only source of the app role; never derive it from JWT role, user_metadata or app_metadata.
 - Provision users on first request with SELECT-then-INSERT ON CONFLICT (id) DO NOTHING using id = JWT sub and email from the claim; map an email UniqueViolation to 409 and resync a changed email in place.
 - Create seeded test users through the Supabase Admin API with SUPABASE_SERVICE_ROLE_KEY so their users.id matches auth.users.id; fall back to uuid5 ids with a printed warning when the key is absent.
 - Ship backend/scripts/mint_dev_token.py (HS256 with SUPABASE_JWT_SECRET) for local development without a Supabase project; override get_current_user via app.dependency_overrides in tests instead of any env-flag bypass.
 - Keep one root .env.example with the exact variable names listed above; copy it to backend/.env and frontend/.env.local, with pydantic-settings extra='ignore'.
 - Replace 'FCM server key' with FIREBASE_SERVICE_ACCOUNT_FILE or FIREBASE_SERVICE_ACCOUNT_JSON and use firebase-admin 7.x messaging.send via asyncio.to_thread; disable push (NullPushClient) when neither is set.
 - Inject the push client through app.state.push with a FakePushClient in tests that records payloads; clear users.fcm_token on messaging.UnregisteredError.
 - POST /readings/* performs a single INSERT ... RETURNING and schedules run_post_reading_pipeline(app.state, user_id, resource, reading_id), which acquires its own pool connection and isolates each step in try/except.
 - Prove the <400ms criterion with a real uvicorn live_server fixture over TCP, not TestClient, because TestClient runs BackgroundTasks before returning.
 - Run APScheduler (AsyncIOScheduler, timezone Asia/Kolkata) inside the single uvicorn worker, gate it with SCHEDULER_ENABLED, and wrap each job in pg_try_advisory_lock(hashtext('savera:job:<name>')).
 - Expose scheduled jobs for demos via `python -m app.tasks.run_job <name>`, not via an HTTP route.
 - Add UNIQUE (ward_id, resource_type, period_start) to ward_aggregates and a partial unique index on lpg_cycles (user_id) WHERE end_date IS NULL.
 - Hard-code MIN_HOUSEHOLDS_FOR_AGGREGATE = 10 in services/ward.py, apply it in SQL for peer comparison and all supervisor queries, and seed 12 + 10 anonymous filler households so demo wards cross the threshold.
 - Scope supervisors to all wards in their own city for MVP and record a supervisor_wards mapping table in FUTURE.md.
 - Add a bill_uploads table (migration 0002) and implement bills as POST → 202 + GET poll, with OCR running as a sync background task so Tesseract cannot block the event loop.
 - Call Google Cloud Vision at POST https://vision.googleapis.com/v1/images:annotate with the x-goog-api-key header and DOCUMENT_TEXT_DETECTION; fall back to Tesseract on 429/403/per-image error, and return status 'ocr_unavailable' (HTTP 200) when no Tesseract binary is found.
 - Pre-process every uploaded bill with Pillow (exif_transpose, RGB, max 2000px, JPEG q85) and store only that JPEG under UPLOADS_DIR/<user_id>/<upload_id>.jpg; accept only jpeg/png/webp verified by Pillow.
 - Serve bill images only through GET /api/v1/bills/{id}/image with an ownership check; never mount StaticFiles on the uploads directory; persist bill_image_url as the host-relative API path.
 - Register json/jsonb codecs in the asyncpg pool init so alerts.context and bill_uploads.extracted round-trip as dicts.
 - Configure CORSMiddleware with explicit origins from CORS_ORIGINS, allow_credentials=False, and allow_headers ['Authorization','Content-Type'].
 - docker-compose: timescale/timescaledb:2.28.3-pg15 with pg_isready healthcheck, backend depends_on condition service_healthy, host port ${POSTGRES_PORT:-55432}, directory-only bind mounts for uploads and secrets, and command 'alembic upgrade head && python -m seed_data.wards && uvicorn ... --workers 1'.
 - Provide scripts/dev-db.ps1 (init/start/stop/status) for the portable PG15+Timescale on 127.0.0.1:55432 that sets shared_preload_libraries and creates a SUPERUSER role 'savera' plus savera and savera_test databases with the extension pre-created.
 - Pin backend dependencies to the verified versions (fastapi 0.141.1, uvicorn 0.53.0, asyncpg 0.31.0, alembic 1.20.0, sqlalchemy 2.0.54, pyjwt[crypto] 2.15.0, httpx 0.28.1, firebase-admin 7.7.0, apscheduler 3.11.3, pytesseract 0.3.13, pillow 12.3.0, python-multipart 0.0.32, pydantic-settings 2.15.0, pytest 9.1.1, pytest-asyncio 1.4.0) and set asyncio_default_fixture_loop_scope/asyncio_default_test_loop_scope = session.
 - Inject `today` as a parameter (default datetime.now(ZoneInfo('Asia/Kolkata')).date()) into services/lpg.py and services/green_score.py instead of calling date.today().

OPEN:
 - OCR flow sign-off: accept the bill_uploads table + 202/poll design (rule-compliant), or explicitly waive the 'OCR in BackgroundTasks' rule and run OCR synchronously in POST /bills with a 15s GCV / 20s Tesseract budget?
 - Is the target Supabase project new (ES256 JWKS) or legacy (HS256)? Both paths will be built, but knowing which one the demo uses decides whether SUPABASE_JWT_SECRET must be provisioned and which path gets the end-to-end smoke test.
 - What exactly is 'high-severity' for the FCM push rule ('push on high-severity anomaly, electricity or water only')? Proposed: pct_over >= 30 or current > mean + 2.5*std_dev, and leak_suspected always high — needs confirmation since it gates the only push in the MVP.
 - Should DELETE endpoints for readings ship in MVP (basic mistake recovery, minimal code) or be filed to FUTURE.md under the 'no fluff' rule?
 - Is it acceptable that supervisors see every ward in their city (no supervisor→ward mapping) for the hackathon, given the schema has no such table?
 - Docker path is unverifiable on this machine (no Docker): is a compose file reviewed by reading plus the tested Windows portable-PG path sufficient for the 'Docker Compose' Phase 1 deliverable, or should CI (GitHub Actions with a timescaledb service container) be added to actually exercise it?
 - Deployment target for the demo (Vercel for frontend is implied; backend on Render/Railway/Fly?) — this decides whether local uploads and the single-process scheduler are acceptable or whether Supabase Storage must move up from FUTURE.md.