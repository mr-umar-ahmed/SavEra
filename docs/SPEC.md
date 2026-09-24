# SAVERA MVP — Master Agent Build Prompt

> This is the source-of-truth specification for the SAVERA MVP, saved verbatim from the build brief.
> Sections that were empty in the brief ("Tech Stack — Locked", "5.2 Baseline Computation",
> "5.5 Weather Context", "API Contract") are filled in by `docs/PHASE0_PLAN.md`.

Paste this entire document into any AI coding agent (Claude Code, Cursor, Devin). The agent must read it fully before writing a single line of code.

## Mission — What This Actually Does

SAVERA is a web + mobile app that measurably reduces household consumption of electricity, water, and LPG through three mechanisms proven by research:
- Visibility: Show people exactly how much they consume, broken down by resource and estimated appliance. Behavioral research shows this alone reduces electricity use 4–12% (conservative meta-analysis: 3–5%).
- Anomaly alerts: Detect when current consumption exceeds a personal baseline and tell the user specifically why (weather, appliance age, leak). Catching a running toilet silently wasting 500–700 L/day is a real, immediate saving.
- Normative comparison: Show the user how their ward performs vs theirs. Social comparison feedback produces 2–4% long-term reductions on top of personal feedback alone.

Every feature shipped must directly serve at least one of these three mechanisms. If it doesn't, it doesn't ship in MVP.

## What NOT to Build in MVP

About "NILM": Real Non-Intrusive Load Monitoring requires current and voltage sensors at the main breaker recording at sub-second frequency. Without smart meter raw signal data you cannot do NILM. What SAVERA does instead is rule-based appliance estimation using known BEE wattages and user-stated daily hours. This is honest and useful. Do not call it NILM anywhere in the code or UI.

About TFT / PINNs: A 3-month rolling average beats a TFT for MVP-level demand and LPG forecasting. PINNs need a dense network of SCADA pressure sensors the platform doesn't have access to. Use simple statistics — mean, standard deviation, percentiles. Upgrade later when you have the data.

## Tech Stack — Locked

_(Empty in the brief — see `docs/PHASE0_PLAN.md` §1 for the locked stack derived from the folder structure.)_

## Database Schema — Complete

Write all migrations in Alembic. Enable TimescaleDB before creating any table. Do not use ORMs for time-series queries — write raw SQL for those.

```sql
-- ENABLE TIMESCALEDB FIRST
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- wards
CREATE TABLE wards (
  id      SERIAL PRIMARY KEY,
  name    TEXT NOT NULL,
  city    TEXT NOT NULL DEFAULT 'Bengaluru',
  lat     FLOAT,
  lng     FLOAT
);

-- users
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  name            TEXT,
  ward_id         INTEGER REFERENCES wards(id),
  household_size  INTEGER NOT NULL DEFAULT 1,
  city            TEXT NOT NULL DEFAULT 'Bengaluru',
  fcm_token       TEXT,
  role            TEXT NOT NULL DEFAULT 'citizen', -- 'citizen' | 'supervisor' | 'admin'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- appliances (Day-1 profile)
CREATE TABLE appliances (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  -- valid types: 'ac_1ton' | 'ac_1.5ton' | 'ac_2ton' | 'refrigerator'
  --              'ceiling_fan' | 'geyser' | 'washing_machine' | 'tv_led_40'
  --              'tv_led_55' | 'other'
  count        INTEGER NOT NULL DEFAULT 1,
  daily_hours  FLOAT NOT NULL DEFAULT 4,
  star_rating  INTEGER CHECK (star_rating BETWEEN 1 AND 5),
  wattage_override FLOAT -- user can correct our lookup estimate
);

-- electricity_readings (time-series, hypertable)
CREATE TABLE electricity_readings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  kwh                  FLOAT NOT NULL CHECK (kwh > 0),
  billing_period_start DATE NOT NULL,
  billing_period_end   DATE NOT NULL,
  bill_image_url       TEXT,
  source               TEXT NOT NULL DEFAULT 'manual',
  -- 'manual' | 'ocr' | 'ami'
  billed_amount        FLOAT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
SELECT create_hypertable('electricity_readings', 'billing_period_start',
       chunk_time_interval => INTERVAL '3 months');

-- water_readings (time-series, hypertable)
CREATE TABLE water_readings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  liters       FLOAT NOT NULL CHECK (liters > 0),
  reading_date DATE NOT NULL,
  source       TEXT NOT NULL DEFAULT 'manual',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
SELECT create_hypertable('water_readings', 'reading_date',
       chunk_time_interval => INTERVAL '3 months');

-- lpg_cycles
CREATE TABLE lpg_cycles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  cylinder_kg     FLOAT NOT NULL DEFAULT 14.2,
  start_date      DATE NOT NULL,
  end_date        DATE,               -- NULL = current active cycle
  daily_burn_rate FLOAT,              -- computed on close
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_open_cycle_per_user UNIQUE (user_id, end_date)
  -- note: NULLS not equal in UNIQUE, so multiple nulls allowed;
  -- enforce single open cycle at app layer
);

-- baselines (refreshed monthly by background job)
CREATE TABLE baselines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  resource_type   TEXT NOT NULL, -- 'electricity' | 'water' | 'lpg'
  mean            FLOAT NOT NULL,
  std_dev         FLOAT NOT NULL,
  upper_threshold FLOAT NOT NULL, -- mean + 1.5 * std_dev
  lower_threshold FLOAT NOT NULL, -- max(0, mean - 1.5 * std_dev)
  sample_count    INTEGER NOT NULL,
  computed_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, resource_type)
);

-- alerts
CREATE TABLE alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  alert_type    TEXT NOT NULL,
  -- 'high_consumption' | 'leak_suspected' | 'refill_due_soon'
  -- 'refill_overdue'   | 'milestone'      | 'weekly_digest'
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  context       JSONB,  -- pct_over_baseline, weather_context, tip, etc.
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_alerts_user_unread ON alerts(user_id, is_read) WHERE is_read = FALSE;

-- green_scores (monthly snapshots, background job)
CREATE TABLE green_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  month             DATE NOT NULL,  -- always 1st of month
  electricity_score FLOAT,          -- 0–100, NULL if no data
  water_score       FLOAT,
  lpg_score         FLOAT,
  total_score       FLOAT,          -- mean of non-null sub-scores
  ward_percentile   FLOAT,          -- vs ward peers, 0–100
  computed_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, month)
);

-- ward_aggregates (anonymized, supervisor view)
CREATE TABLE ward_aggregates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id            INTEGER REFERENCES wards(id),
  resource_type      TEXT NOT NULL,
  period_start       DATE NOT NULL,
  period_end         DATE NOT NULL,
  avg_consumption    FLOAT NOT NULL,
  total_consumption  FLOAT NOT NULL,
  household_count    INTEGER NOT NULL,
  pct_change_vs_prev FLOAT,
  anomaly_flag       BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
```

## Algorithm Specifications

These are the exact algorithms to implement. No deviation without plan-phase sign-off.

### 5.1 Appliance Energy Estimation (services/appliance.py)

This is rule-based estimation using BEE lookup tables and user-stated hours. Do not call this NILM anywhere.

```python
# BEE Standard Wattages (Watts) by type and star rating
# Source: Bureau of Energy Efficiency India star label programme
BEE_WATTAGE = {
    "ac_1ton":    {1: 1500, 2: 1300, 3: 1100, 4: 1000, 5: 900},
    "ac_1.5ton":  {1: 2200, 2: 1900, 3: 1600, 4: 1400, 5: 1200},
    "ac_2ton":    {1: 2800, 2: 2500, 3: 2100, 4: 1900, 5: 1600},
    "refrigerator": {1: 85, 2: 70, 3: 55, 4: 45, 5: 35},  # always-on, 24h
    "ceiling_fan":  {None: 75},
    "geyser":       {None: 2000},   # 30 min/day typical
    "washing_machine": {1: 500, 2: 450, 3: 400, 4: 350, 5: 300},
    "tv_led_40":    {None: 50},
    "tv_led_55":    {None: 90},
    "other":        {None: 100},    # conservative default
}

ALWAYS_ON = {"refrigerator"}   # daily_hours irrelevant, always 24h
GEYSER_DAILY_H = 0.5            # assume 30 min/day regardless of input

def estimate_breakdown(appliances: list, billing_days: int) -> dict:
    """
    Returns dict: {appliance_type: kwh_estimate}
    Also returns 'unknown_load' = max(0, actual_kwh - sum_estimates)
    Call this AFTER the reading is saved; pass actual_kwh for gap calc.
    """
    breakdown = {}
    for a in appliances:
        wattage = a.wattage_override or BEE_WATTAGE.get(a.type, {None: 100}).get(
            a.star_rating, BEE_WATTAGE.get(a.type, {None: 100}).get(None, 100)
        )
        if a.type in ALWAYS_ON:
            hours = 24
        elif a.type == "geyser":
            hours = GEYSER_DAILY_H
        else:
            hours = a.daily_hours
        kwh = (wattage / 1000) * hours * billing_days * a.count
        breakdown[a.type] = round(kwh, 1)
    return breakdown

def find_unknown_load(actual_kwh: float, breakdown: dict) -> float:
    estimated_total = sum(breakdown.values())
    unknown = actual_kwh - estimated_total
    return max(0.0, round(unknown, 1))
```

### 5.2 Baseline Computation (services/baseline.py)

_(Empty in the brief — filled in by `docs/PHASE0_PLAN.md` §5.2.)_

### 5.3 LPG Burn Rate & Prediction (services/lpg.py)

```python
from datetime import date, timedelta
import statistics

DEFAULT_BURN_RATE = 14.2 / 25   # 0.568 kg/day (national average)
REFILL_BUFFER_DAYS = 3          # trigger alert 3 days before predicted finish

def close_cycle(cycle) -> float:
    """Compute daily burn rate when user marks cylinder as finished."""
    days = (cycle.end_date - cycle.start_date).days
    if days <= 0:
        return DEFAULT_BURN_RATE
    return round(cycle.cylinder_kg / days, 4)

def predict_finish(current_cycle, historical_cycles: list) -> dict:
    """
    Predict finish date for an active (unclosed) cycle.
    historical_cycles: list of closed cycles with .daily_burn_rate, newest first
    """
    completed = [c for c in historical_cycles if c.daily_burn_rate][:3]
    burn_rate = (
        statistics.mean([c.daily_burn_rate for c in completed])
        if completed else DEFAULT_BURN_RATE
    )

    days_elapsed   = (date.today() - current_cycle.start_date).days
    kg_consumed    = burn_rate * days_elapsed
    kg_remaining   = max(0.0, current_cycle.cylinder_kg - kg_consumed)
    days_to_empty  = kg_remaining / burn_rate if burn_rate > 0 else 999
    finish_date    = date.today() + timedelta(days=int(days_to_empty))
    alert_date     = finish_date - timedelta(days=REFILL_BUFFER_DAYS)

    return {
        "estimated_finish_date": finish_date.isoformat(),
        "refill_alert_date":     alert_date.isoformat(),
        "kg_remaining":          round(kg_remaining, 2),
        "burn_rate_kg_per_day":  round(burn_rate, 3),
        "days_to_empty":         int(days_to_empty),
        "should_alert_now":      date.today() >= alert_date,
    }
```

### 5.4 Green Score (services/green_score.py)

```python
"""
Green Score: 0–100 per resource, then averaged.

Formula per resource:
  If current <= baseline.mean            → score = 100
  If current between mean and upper_thr  → score = 80 – 80*(pct_over / 50)
  If current > upper_threshold           → score = max(0, 40 – pct_over)

Bonus: +5 if score improved vs last month (capped at 100)
Normalisation: divide consumption by household_size before comparing
               so a family of 5 isn't penalised vs. a single person
"""

def resource_score(current: float, baseline: dict, household_size: int) -> float | None:
    if baseline is None or current is None:
        return None

    normalised = current / max(1, household_size)
    norm_mean  = baseline["mean"] / max(1, household_size)
    norm_upper = baseline["upper_threshold"] / max(1, household_size)

    if normalised <= norm_mean:
        return 100.0

    pct_over = (normalised - norm_mean) / norm_mean * 100

    if normalised <= norm_upper:
        score = 80 - 80 * (pct_over / 50)
    else:
        score = max(0, 40 - pct_over)

    return round(max(0.0, score), 1)

def compute_total_score(e_score, w_score, l_score) -> float | None:
    valid = [s for s in [e_score, w_score, l_score] if s is not None]
    return round(sum(valid) / len(valid), 1) if valid else None
```

### 5.5 Weather Context for Anomaly Enrichment (services/weather.py)

_(Empty in the brief — filled in by `docs/PHASE0_PLAN.md` §5.5.)_

### 5.6 Conservation Tips Engine (services/tips.py)

```python
"""
Rule-based tips. No ML. Pick top 2 relevant tips per alert.
Tips are chosen by: resource type + top appliance + pct_over severity.
"""

TIPS = {
    "electricity": {
        "ac_heavy": [   # triggers when ac_* appliances > 35% of estimated total
            "Set AC to 24°C — each degree lower adds ~6% to your bill.",
            "Run AC with a ceiling fan: it feels 3°C cooler, so you can raise the thermostat.",
            "Clean your AC filter monthly — a clogged filter uses 10–15% more power.",
        ],
        "geyser_heavy": [
            "Set geyser thermostat to 50°C — Indian households often keep it at 65°C.",
            "Turn geyser off 5 minutes before bathing — stored heat is enough.",
        ],
        "general": [
            "Unplug chargers when not in use — standby draw adds 5–8% to bills.",
            "Switch remaining incandescent bulbs to LED — 80% less power for same light.",
            "Wash clothes in cold water — heating water is 90% of washing machine energy.",
        ],
    },
    "water": {
        "high_usage": [
            "A dripping tap wastes ~40 litres/day — check all taps.",
            "A running toilet wastes 500–700 litres/day silently — drop food colouring in tank to check.",
            "Swap a 10-minute shower for a 5-minute one: saves ~100 litres per session.",
            "Water your garden before 7am or after 7pm — midday evaporation wastes 30–50% of water.",
        ],
    },
    "lpg": {
        "fast_burn": [
            "Use a pressure cooker — cuts cooking time and gas use by 50–75%.",
            "Keep lids on pots while cooking — retains heat, reduces gas by 15–20%.",
            "Match burner size to pot size — a small pot on a large burner wastes 40% gas.",
            "Thaw frozen food in fridge overnight instead of on the stove.",
        ],
    },
}

def get_tips(resource: str, context: dict, appliance_breakdown: dict = None) -> list[str]:
    pool = []
    if resource == "electricity" and appliance_breakdown:
        total = sum(appliance_breakdown.values()) or 1
        ac_kwh = sum(v for k, v in appliance_breakdown.items() if k.startswith("ac"))
        if ac_kwh / total > 0.35:
            pool += TIPS["electricity"]["ac_heavy"]
        geyser_kwh = appliance_breakdown.get("geyser", 0)
        if geyser_kwh / total > 0.15:
            pool += TIPS["electricity"]["geyser_heavy"]
        pool += TIPS["electricity"]["general"]
    elif resource == "water":
        pool += TIPS["water"]["high_usage"]
    elif resource == "lpg":
        pool += TIPS["lpg"]["fast_burn"]

    # Return top 2, no duplicates
    seen, result = set(), []
    for tip in pool:
        if tip not in seen:
            seen.add(tip)
            result.append(tip)
        if len(result) == 2:
            break
    return result
```

## API Contract — FastAPI Routes

All routes prefixed with /api/v1. Auth via Supabase JWT in Authorization: Bearer header. Use FastAPI dependency injection for auth.

_(Route table empty in the brief — filled in by `docs/PHASE0_PLAN.md` §6.)_

## Folder Structure

```
savera/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, routers, CORS
│   │   ├── config.py            # env vars (Supabase URL, GCV key, etc.)
│   │   ├── database.py          # async PostgreSQL pool (asyncpg)
│   │   ├── deps.py              # FastAPI dependencies (auth, db session)
│   │   ├── models/              # Pydantic request/response schemas
│   │   │   ├── user.py
│   │   │   ├── readings.py
│   │   │   ├── lpg.py
│   │   │   ├── alerts.py
│   │   │   └── insights.py
│   │   ├── routers/
│   │   │   ├── bills.py         # OCR upload
│   │   │   ├── readings.py
│   │   │   ├── lpg.py
│   │   │   ├── insights.py
│   │   │   ├── alerts.py
│   │   │   ├── profile.py
│   │   │   └── supervisor.py
│   │   ├── services/
│   │   │   ├── ocr.py           # GCV + Tesseract fallback
│   │   │   ├── appliance.py     # BEE lookup + estimation
│   │   │   ├── baseline.py      # compute_baseline, check_anomaly
│   │   │   ├── lpg.py           # burn_rate, predict_finish
│   │   │   ├── green_score.py   # resource_score, compute_total
│   │   │   ├── weather.py       # Open-Meteo async fetch
│   │   │   ├── tips.py          # rule-based tip selection
│   │   │   ├── alerts_svc.py    # create_alert + FCM push
│   │   │   └── ward.py          # ward aggregate upsert
│   │   └── tasks/
│   │       └── scheduler.py     # APScheduler: monthly baselines, weekly digest
│   ├── migrations/              # Alembic migrations
│   ├── tests/
│   │   ├── test_appliance.py
│   │   ├── test_baseline.py
│   │   ├── test_lpg.py
│   │   ├── test_green_score.py
│   │   ├── test_tips.py
│   │   └── test_ocr.py          # mock GCV, test extraction regex
│   ├── seed_data/
│   │   ├── wards.sql            # Bengaluru ward list
│   │   └── test_users.py        # seed 3 test users with 6 months of readings
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx       # nav sidebar
│   │   │   ├── page.tsx         # main dashboard
│   │   │   ├── electricity/
│   │   │   │   └── page.tsx
│   │   │   ├── water/
│   │   │   │   └── page.tsx
│   │   │   ├── lpg/
│   │   │   │   └── page.tsx
│   │   │   ├── alerts/
│   │   │   │   └── page.tsx
│   │   │   └── profile/
│   │   │       └── page.tsx     # appliance setup + account
│   │   └── supervisor/
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/                  # shadcn components
│   │   ├── charts/
│   │   │   ├── ConsumptionBarChart.tsx    # recharts
│   │   │   ├── GreenScoreGauge.tsx
│   │   │   └── ApplianceBreakdownPie.tsx
│   │   ├── cards/
│   │   │   ├── ResourceSummaryCard.tsx
│   │   │   ├── AlertCard.tsx
│   │   │   ├── LPGTrackerCard.tsx
│   │   │   └── WardRankCard.tsx
│   │   └── forms/
│   │       ├── BillUploadForm.tsx   # drag-drop + OCR confirm
│   │       └── ApplianceSetupForm.tsx
│   ├── lib/
│   │   ├── api.ts               # typed fetch wrapper
│   │   └── supabase.ts          # Supabase client
│   └── package.json
│
├── docker-compose.yml           # postgres+timescaledb + backend
└── .env.example
```

## Phase 0 — Planning (Mandatory, Do Not Skip)

Before writing a single line of code, output a complete implementation plan in this exact structure:
- Confirm the full database schema from Section 4 — list any conflicts or questions.
- List all environment variables needed (Supabase URL, Supabase anon key, Supabase service key, GCV API key, FCM server key).
- Confirm the BEE wattage lookup table is complete for Indian appliances — note any missing entries.
- Identify the 3 highest-risk implementation parts and your mitigation for each.
- Confirm the OCR extraction strategy for Indian electricity bills (BESCOM, MSEDCL, TNEB formats).
- Confirm the seed data plan — what 6-month dataset you'll generate for test users.
- List the Phase 1 acceptance criteria from Section 9 verbatim.
- State: "Plan complete. Ready to begin Phase 1 on approval."

Wait for explicit approval before starting Phase 1.

## Phase 1 — Foundation

### What to build

- Docker Compose: PostgreSQL 15 + TimescaleDB + FastAPI container
- Alembic migration: run full schema from Section 4
- Supabase Auth integration in FastAPI (JWT verification dependency)
- Next.js project scaffold with App Router, Tailwind, shadcn/ui, Supabase client
- Login / Signup pages (Supabase magic link + email/password)
- Appliance profile setup flow (Day-1 onboarding, max 2 screens)
- Manual data entry for all 3 resources (electricity kWh + period, water litres, LPG start/end)
- Bill photo upload → OCR via Google Cloud Vision → extracted data shown for user confirmation → save
- Seed script: 3 test users, 6 months of readings each, varied patterns

### OCR extraction logic (services/ocr.py)

GCV returns raw text. Parse it with regex for:
- Total units consumed (kWh): look for patterns like Units Consumed, Total Units, kWh, numeric near those labels
- Billing period: look for date ranges, month names
- Amount due: look for Amount Payable, Net Amount
- If confidence is low (<70%), return raw text and flag for manual review — never silently fail
- Tesseract fallback: if GCV quota exceeded (429), run pytesseract.image_to_string()

### Phase 1 acceptance criteria

- ✅ All Alembic migrations run clean on fresh DB
- ✅ Auth: signup → login → protected route works end-to-end
- ✅ Can save electricity, water, and LPG readings via API and frontend
- ✅ OCR: given a BESCOM bill image, extraction returns kWh ± 2 units of actual
- ✅ Seed script populates 3 users with 6 months of data without errors
- ✅ pytest test suite: all unit tests in tests/ pass (write tests as you build)

## Phase 2 — Intelligence Core

### What to build

- Implement all services from Section 5 (appliance estimation, baseline, anomaly, LPG prediction, weather, tips, green score)
- Wire the post-reading side-effects pipeline: save reading → run pipeline in BackgroundTasks
- Alert creation + storage in DB
- Firebase FCM push notification on high-severity anomaly (electricity or water only for MVP)
- APScheduler task: every 1st of month, recompute baselines for all users who have ≥3 readings
- APScheduler task: every morning at 7am, check all open LPG cycles → send FCM if should_alert_now = True
- Green score computation wired to post-reading pipeline
- Ward aggregate upsert on every new reading (anonymized)

### Key implementation constraints

- Weather fetch must never block the main reading-save flow — it runs inside BackgroundTasks
- Baseline computation must be idempotent — running it twice must produce the same result
- Green score normalizes by household_size — don't forget this
- LPG prediction must return a result even for a user's very first cycle (use DEFAULT_BURN_RATE)

### Phase 2 acceptance criteria

- ✅ test_baseline.py: baseline returns None for 2 readings, valid dict for 3+, correct thresholds
- ✅ test_anomaly.py: 480 kWh vs baseline of 330 kWh → is_anomaly=True, pct_over≈45%
- ✅ test_lpg.py: predict_finish with 14.2kg cylinder started 20 days ago → correct kg_remaining and date
- ✅ test_green_score.py: household_size normalisation works; 100% score for consumption at mean
- ✅ test_tips.py: AC-heavy breakdown → returns AC tips; water high → returns water tips
- ✅ Alert is created in DB when anomaly fires (integration test with seed data)
- ✅ FCM notification fires on high-severity anomaly (mock FCM, assert payload)
- ✅ Background pipeline does not slow down POST /readings/electricity response (<400ms)

## Phase 3 — UX & Insights

### Dashboard (main page)

- Summary cards: electricity, water, LPG — current vs baseline, colour-coded (green / yellow / red)
- Green Score gauge: circular, 0–100, animated on load
- Active alerts count badge with "View all" link
- LPG tracker: progress bar showing % cylinder remaining + estimated finish date
- Ward rank: "You use X% less than your ward average" — one line, always visible

### Resource detail pages (electricity / water)

- Bar chart: last 6 months consumption vs baseline line
- Appliance breakdown: horizontal bar chart (electricity only)
- Conservation tips: 2 tips, shown only when user is over baseline
- Add reading button → opens form (manual or OCR upload for electricity)

### LPG page

- Timeline of past cycles with burn rates
- Current cylinder status card with prediction
- Mark cylinder finished button (opens end_date input)
- Start new cylinder button

### Alerts page

- Chronological list, grouped by date
- Each alert: icon (resource type), title, message, timestamp, tip (from context JSON), read/unread state
- Tap/click marks as read

### Profile page

- Edit appliance profile (same form as Day-1 setup)
- Household size
- Ward selector
- Enable/disable push notifications toggle (FCM opt-in)

### Design constraints

- Mobile-first. All cards must be usable on a 390px wide screen.
- No dark-pattern UI. Anomaly alerts must explain cause, not blame. Tone: "Your bill was higher than usual — here's why and what to try."
- Green Score must show household_size normalisation note so users understand it's fair.
- Conservation tips must be actionable (verb + specific number), not generic ("save energy").

### Phase 3 acceptance criteria

- ✅ Dashboard loads in <1.5s on 3G throttling (Lighthouse check)
- ✅ All charts render correctly with 1 reading, 3 readings, and 6 readings (edge cases)
- ✅ LPG tracker shows correct finish date matching API output
- ✅ Alert page displays correct tips from alert.context JSON
- ✅ Appliance profile save → breakdown updates on next electricity insight fetch
- ✅ No UI elements overflow on 390px viewport
- ✅ Vitest: component unit tests for ConsumptionBarChart, GreenScoreGauge, LPGTrackerCard

## Phase 4 — Supervisor Layer

### What to build

- Role-gated supervisor dashboard (role = 'supervisor' in users table)
- Ward selection dropdown (supervisors can view wards they manage)
- Resource heatmap: table showing ward's 30-day avg consumption per resource vs previous 30 days (% change)
- Anomaly flag view: list of wards with ward_aggregates.anomaly_flag = true in current month
- Ward comparison chart: bar chart of multiple wards, normalised per household
- Anonymous peer comparison for citizens: "Households like yours in your ward use X kWh on average" — shown on electricity detail page

### Privacy constraints (non-negotiable)

- Supervisor endpoint must only return data from ward_aggregates — never individual user data
- Anonymous peer comparison must only activate if the ward has ≥10 users with readings for that month (avoid de-anonymisation)
- Add CHECK (household_count >= 10) on the ward_aggregates query path, not just schema

### Ward anomaly detection (services/ward.py)

When aggregating ward data, flag anomaly if current period avg is >25% above the ward's own 3-month rolling average. This is the supervisor-level equivalent of the citizen anomaly check. It catches distribution-level leaks and outage impacts — no SCADA needed.

### Phase 4 acceptance criteria

- ✅ Supervisor route returns 403 for citizen JWT
- ✅ Ward aggregate correctly excludes individual-level PII (spot-check: no user_id in response)
- ✅ Peer comparison correctly returns null when ward has <10 users with readings
- ✅ Ward anomaly flag fires correctly on seed data with injected spike
- ✅ Full end-to-end flow: citizen adds reading → baseline checked → alert created → ward aggregate updated → supervisor sees updated heatmap
- ✅ All previous phase test suites still pass (no regressions)

## Agent Operating Rules

- Plan before code. Phase 0 is mandatory. No exceptions.
- Test gate before advancing. Do not start Phase N+1 until Phase N's test gate passes. If a test fails, fix it before moving on — do not comment out tests.
- No fluff features. If a feature isn't in this document, don't build it. File it in a FUTURE.md instead.
- Honest labels. Don't call rule-based appliance estimation "NILM". Don't call rolling mean + stddev "AI forecasting". Name things what they are.
- Never block the main response. OCR parsing, weather fetch, anomaly detection, FCM push — all run in FastAPI BackgroundTasks. The POST /readings/* response must return in <400ms.
- Privacy by default. Aggregation endpoints must only return ward_aggregates rows. Add assertion in tests that no user_id appears in supervisor API responses.
- Write tests as you build, not after. Each service file in services/ must have a corresponding test file in tests/ written before the service is wired to a router.
- Seed data is a first-class deliverable. The seed script must create realistic 6-month patterns — not random noise. Include: one user with stable consumption, one with seasonal spike, one with a water anomaly event.
- No hardcoded secrets. All API keys, DB URLs in .env. Provide .env.example with placeholder values.
- Commit after each phase gate passes. Tag the commit: mvp-phase-1-complete, mvp-phase-2-complete, etc.

## Delivery notes (from the build request)

- Push every feature to https://github.com/mr-umar-ahmed/SavEra.git
- UI must feel Gen-Z fresh while meeting government-programme credibility: mobile-first, responsive, production grade.
