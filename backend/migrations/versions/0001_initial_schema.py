"""Initial schema — full SAVERA MVP schema (docs/SPEC.md §Database Schema).

Deviations from the brief, all required for PostgreSQL 15 + TimescaleDB 2.28 correctness
(see docs/PHASE0_PLAN.md §1):
  * Hypertables must include the partition column in every unique index / primary key, so
    electricity_readings and water_readings use composite primary keys
    (id, billing_period_start) / (id, reading_date).
  * A partial unique index enforces "one open LPG cycle per user" at the DB level as well as
    in the app layer.
  * CHECK constraints pin the enum-like TEXT columns; supporting indexes cover the per-user,
    time-ordered reads and the ward-aggregate upsert path.

Revision ID: 0001
Revises:
Create Date: 2026-09-24
"""

from __future__ import annotations

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


UPGRADE_SQL = [
    # ENABLE TIMESCALEDB FIRST
    "CREATE EXTENSION IF NOT EXISTS timescaledb",
    # ---------------------------------------------------------------- wards
    """
    CREATE TABLE wards (
      id      SERIAL PRIMARY KEY,
      name    TEXT NOT NULL,
      city    TEXT NOT NULL DEFAULT 'Bengaluru',
      lat     FLOAT,
      lng     FLOAT,
      UNIQUE (city, name)
    )
    """,
    # ---------------------------------------------------------------- users
    # id = Supabase auth user id (JWT `sub`) for real sign-ups; the default only serves seed rows.
    """
    CREATE TABLE users (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email           TEXT NOT NULL,
      name            TEXT,
      ward_id         INTEGER REFERENCES wards(id) ON DELETE SET NULL,
      household_size  INTEGER NOT NULL DEFAULT 1 CHECK (household_size >= 1),
      city            TEXT NOT NULL DEFAULT 'Bengaluru',
      fcm_token       TEXT,
      role            TEXT NOT NULL DEFAULT 'citizen'
                      CHECK (role IN ('citizen', 'supervisor', 'admin')),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE UNIQUE INDEX users_email_key ON users (lower(email))",
    "CREATE INDEX idx_users_ward ON users(ward_id)",
    # ----------------------------------------------------------- appliances
    """
    CREATE TABLE appliances (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type             TEXT NOT NULL CHECK (type IN (
                         'ac_1ton', 'ac_1.5ton', 'ac_2ton', 'refrigerator', 'ceiling_fan',
                         'geyser', 'washing_machine', 'tv_led_40', 'tv_led_55', 'other')),
      count            INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1),
      daily_hours      FLOAT NOT NULL DEFAULT 4 CHECK (daily_hours >= 0 AND daily_hours <= 24),
      star_rating      INTEGER CHECK (star_rating BETWEEN 1 AND 5),
      wattage_override FLOAT CHECK (wattage_override IS NULL OR wattage_override > 0),
      UNIQUE (user_id, type)
    )
    """,
    # ------------------------------------------- electricity_readings (hypertable)
    """
    CREATE TABLE electricity_readings (
      id                   UUID NOT NULL DEFAULT gen_random_uuid(),
      user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kwh                  FLOAT NOT NULL CHECK (kwh > 0),
      billing_period_start DATE NOT NULL,
      billing_period_end   DATE NOT NULL,
      bill_image_url       TEXT,
      source               TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ocr', 'ami')),
      billed_amount        FLOAT CHECK (billed_amount IS NULL OR billed_amount >= 0),
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id, billing_period_start),
      CHECK (billing_period_end >= billing_period_start)
    )
    """,
    """
    SELECT create_hypertable('electricity_readings', 'billing_period_start',
           chunk_time_interval => INTERVAL '3 months', if_not_exists => TRUE)
    """,
    "CREATE UNIQUE INDEX uq_electricity_user_period ON electricity_readings(user_id, billing_period_start)",
    "CREATE INDEX idx_electricity_user_time ON electricity_readings(user_id, billing_period_start DESC)",
    # ------------------------------------------------ water_readings (hypertable)
    """
    CREATE TABLE water_readings (
      id           UUID NOT NULL DEFAULT gen_random_uuid(),
      user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      liters       FLOAT NOT NULL CHECK (liters > 0),
      reading_date DATE NOT NULL,
      source       TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ocr', 'ami')),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id, reading_date)
    )
    """,
    """
    SELECT create_hypertable('water_readings', 'reading_date',
           chunk_time_interval => INTERVAL '3 months', if_not_exists => TRUE)
    """,
    "CREATE UNIQUE INDEX uq_water_user_date ON water_readings(user_id, reading_date)",
    "CREATE INDEX idx_water_user_time ON water_readings(user_id, reading_date DESC)",
    # ------------------------------------------------------------ lpg_cycles
    """
    CREATE TABLE lpg_cycles (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cylinder_kg     FLOAT NOT NULL DEFAULT 14.2 CHECK (cylinder_kg > 0),
      start_date      DATE NOT NULL,
      end_date        DATE,
      daily_burn_rate FLOAT CHECK (daily_burn_rate IS NULL OR daily_burn_rate > 0),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT one_open_cycle_per_user UNIQUE (user_id, end_date),
      CHECK (end_date IS NULL OR end_date >= start_date),
      CHECK (daily_burn_rate IS NULL OR end_date IS NOT NULL)
    )
    """,
    # NULLs are distinct in the UNIQUE above; this partial index is the real single-open-cycle guard.
    "CREATE UNIQUE INDEX uq_lpg_single_open_cycle ON lpg_cycles(user_id) WHERE end_date IS NULL",
    "CREATE INDEX idx_lpg_user_start ON lpg_cycles(user_id, start_date DESC)",
    # ------------------------------------------------------------- baselines
    """
    CREATE TABLE baselines (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resource_type   TEXT NOT NULL CHECK (resource_type IN ('electricity', 'water', 'lpg')),
      mean            FLOAT NOT NULL,
      std_dev         FLOAT NOT NULL CHECK (std_dev >= 0),
      upper_threshold FLOAT NOT NULL,
      lower_threshold FLOAT NOT NULL CHECK (lower_threshold >= 0),
      sample_count    INTEGER NOT NULL CHECK (sample_count >= 3),
      computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, resource_type)
    )
    """,
    # ---------------------------------------------------------------- alerts
    """
    CREATE TABLE alerts (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resource_type TEXT NOT NULL CHECK (resource_type IN ('electricity', 'water', 'lpg', 'general')),
      alert_type    TEXT NOT NULL CHECK (alert_type IN (
                      'high_consumption', 'leak_suspected', 'refill_due_soon',
                      'refill_overdue', 'milestone', 'weekly_digest')),
      title         TEXT NOT NULL,
      message       TEXT NOT NULL,
      context       JSONB,
      dedupe_key    TEXT,
      is_read       BOOLEAN NOT NULL DEFAULT FALSE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, dedupe_key)
    )
    """,
    "CREATE INDEX idx_alerts_user_unread ON alerts(user_id, is_read) WHERE is_read = FALSE",
    "CREATE INDEX idx_alerts_user_created ON alerts(user_id, created_at DESC)",
    # ---------------------------------------------------------- green_scores
    """
    CREATE TABLE green_scores (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      month             DATE NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
      electricity_score FLOAT CHECK (electricity_score IS NULL OR electricity_score BETWEEN 0 AND 100),
      water_score       FLOAT CHECK (water_score IS NULL OR water_score BETWEEN 0 AND 100),
      lpg_score         FLOAT CHECK (lpg_score IS NULL OR lpg_score BETWEEN 0 AND 100),
      total_score       FLOAT CHECK (total_score IS NULL OR total_score BETWEEN 0 AND 100),
      ward_percentile   FLOAT CHECK (ward_percentile IS NULL OR ward_percentile BETWEEN 0 AND 100),
      computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, month)
    )
    """,
    "CREATE INDEX idx_green_scores_month ON green_scores(month DESC)",
    # ------------------------------------------------------- ward_aggregates
    """
    CREATE TABLE ward_aggregates (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ward_id            INTEGER NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
      resource_type      TEXT NOT NULL CHECK (resource_type IN ('electricity', 'water', 'lpg')),
      period_start       DATE NOT NULL,
      period_end         DATE NOT NULL,
      avg_consumption    FLOAT NOT NULL CHECK (avg_consumption >= 0),
      total_consumption  FLOAT NOT NULL CHECK (total_consumption >= 0),
      household_count    INTEGER NOT NULL CHECK (household_count >= 1),
      avg_household_size FLOAT CHECK (avg_household_size IS NULL OR avg_household_size >= 1),
      pct_change_vs_prev FLOAT,
      anomaly_flag       BOOLEAN NOT NULL DEFAULT FALSE,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (ward_id, resource_type, period_start),
      CHECK (period_end >= period_start)
    )
    """,
    "CREATE INDEX idx_ward_aggregates_lookup ON ward_aggregates(ward_id, resource_type, period_start DESC)",
    "CREATE INDEX idx_ward_aggregates_anomaly ON ward_aggregates(period_start) WHERE anomaly_flag",
]

DOWNGRADE_SQL = [
    "DROP TABLE IF EXISTS ward_aggregates",
    "DROP TABLE IF EXISTS green_scores",
    "DROP TABLE IF EXISTS alerts",
    "DROP TABLE IF EXISTS baselines",
    "DROP TABLE IF EXISTS lpg_cycles",
    "DROP TABLE IF EXISTS water_readings",
    "DROP TABLE IF EXISTS electricity_readings",
    "DROP TABLE IF EXISTS appliances",
    "DROP TABLE IF EXISTS users",
    "DROP TABLE IF EXISTS wards",
]


def upgrade() -> None:
    for statement in UPGRADE_SQL:
        op.execute(statement)


def downgrade() -> None:
    for statement in DOWNGRADE_SQL:
        op.execute(statement)
