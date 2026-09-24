"""Anonymised ward aggregate upsert (SPEC §"What NOT to Build" privacy rule; wired in Phase 2,
read by Phase 4's supervisor and peer-comparison routes).

Every function here recomputes one ward+resource+calendar-month row **from scratch** off the
source reading tables, rather than maintaining a running sum — simpler to get right, and cheap
enough (one ward, one month, indexed queries) to run after every reading. Nothing here ever
selects or returns a per-user row: the SQL groups by ward before it aggregates, so an
individual figure never crosses this module's boundary. A ward+resource+month with zero
households logs nothing, since the schema requires ``household_count >= 1``; the
``household_count >= 10`` privacy floor is enforced separately, at read time, in Phase 4.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app import database

ANOMALY_FACTOR = 1.25  # avg_consumption > 1.25x the prior-3-month mean trips anomaly_flag
ANOMALY_LOOKBACK_MONTHS = 3


def month_start(day: date) -> date:
    return day.replace(day=1)


def add_months(day: date, months: int) -> date:
    total = day.year * 12 + (day.month - 1) + months
    return date(total // 12, total % 12 + 1, 1)


def month_end(day: date) -> date:
    return add_months(month_start(day), 1) - timedelta(days=1)


async def _electricity_stats(ward_id: int, start: date, end: date) -> dict[str, Any] | None:
    row = await database.fetchrow(
        """
        SELECT
          COUNT(*)                                                        AS household_count,
          AVG(u.household_size)                                           AS avg_household_size,
          AVG(e.kwh / (e.billing_period_end - e.billing_period_start + 1) * 30) AS avg_consumption,
          SUM(e.kwh / (e.billing_period_end - e.billing_period_start + 1) * 30) AS total_consumption
        FROM electricity_readings e
        JOIN users u ON u.id = e.user_id
        WHERE u.ward_id = $1 AND e.billing_period_start >= $2 AND e.billing_period_start <= $3
        """,
        ward_id,
        start,
        end,
    )
    return dict(row) if row and row["household_count"] else None


async def _water_stats(ward_id: int, start: date, end: date) -> dict[str, Any] | None:
    row = await database.fetchrow(
        """
        WITH per_user AS (
          SELECT u.id AS user_id, u.household_size, AVG(w.liters) AS avg_liters
          FROM water_readings w
          JOIN users u ON u.id = w.user_id
          WHERE u.ward_id = $1 AND w.reading_date >= $2 AND w.reading_date <= $3
          GROUP BY u.id, u.household_size
        )
        SELECT
          COUNT(*)               AS household_count,
          AVG(household_size)    AS avg_household_size,
          AVG(avg_liters)        AS avg_consumption,
          SUM(avg_liters)        AS total_consumption
        FROM per_user
        """,
        ward_id,
        start,
        end,
    )
    return dict(row) if row and row["household_count"] else None


async def _lpg_stats(ward_id: int, start: date, end: date) -> dict[str, Any] | None:
    """kg per household per 30 days, from closed cycles whose date range overlaps the month
    (PHASE0_PLAN §5.3)."""
    row = await database.fetchrow(
        """
        WITH per_user AS (
          SELECT u.id AS user_id, u.household_size, AVG(c.daily_burn_rate) * 30 AS monthly_kg
          FROM lpg_cycles c
          JOIN users u ON u.id = c.user_id
          WHERE u.ward_id = $1 AND c.daily_burn_rate IS NOT NULL
            AND c.start_date <= $3 AND c.end_date >= $2
          GROUP BY u.id, u.household_size
        )
        SELECT
          COUNT(*)              AS household_count,
          AVG(household_size)   AS avg_household_size,
          AVG(monthly_kg)       AS avg_consumption,
          SUM(monthly_kg)       AS total_consumption
        FROM per_user
        """,
        ward_id,
        start,
        end,
    )
    return dict(row) if row and row["household_count"] else None


_STATS_BY_RESOURCE = {
    "electricity": _electricity_stats,
    "water": _water_stats,
    "lpg": _lpg_stats,
}


async def _prior_avg_consumptions(ward_id: int, resource_type: str, before: date) -> list[float]:
    rows = await database.fetch(
        """
        SELECT avg_consumption FROM ward_aggregates
        WHERE ward_id = $1 AND resource_type = $2 AND period_start < $3
        ORDER BY period_start DESC
        LIMIT $4
        """,
        ward_id,
        resource_type,
        before,
        ANOMALY_LOOKBACK_MONTHS,
    )
    return [r["avg_consumption"] for r in rows]


async def upsert_ward_aggregate(ward_id: int, resource_type: str, for_date: date) -> None:
    """Recompute and upsert the ward's aggregate for `resource_type` in `for_date`'s month.

    Called after every reading that could change it. A no-op when the ward+resource+month
    has no households yet (nothing to store — the schema requires ``household_count >= 1``).
    """
    start, end = month_start(for_date), month_end(for_date)
    stats_fn = _STATS_BY_RESOURCE.get(resource_type)
    if stats_fn is None:
        raise ValueError(f"unknown resource_type {resource_type!r}")

    stats = await stats_fn(ward_id, start, end)
    if stats is None:
        return

    previous = await database.fetchval(
        """
        SELECT avg_consumption FROM ward_aggregates
        WHERE ward_id = $1 AND resource_type = $2 AND period_start = $3
        """,
        ward_id,
        resource_type,
        month_start(add_months(start, -1)),
    )
    pct_change = (
        round((stats["avg_consumption"] - previous) / previous * 100, 2)
        if previous
        else None
    )

    prior = await _prior_avg_consumptions(ward_id, resource_type, start)
    anomaly_flag = False
    if prior:
        prior_mean = sum(prior) / len(prior)
        anomaly_flag = prior_mean > 0 and stats["avg_consumption"] > ANOMALY_FACTOR * prior_mean

    await database.execute(
        """
        INSERT INTO ward_aggregates
            (ward_id, resource_type, period_start, period_end, avg_consumption,
             total_consumption, household_count, avg_household_size, pct_change_vs_prev,
             anomaly_flag)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (ward_id, resource_type, period_start) DO UPDATE SET
            period_end = EXCLUDED.period_end,
            avg_consumption = EXCLUDED.avg_consumption,
            total_consumption = EXCLUDED.total_consumption,
            household_count = EXCLUDED.household_count,
            avg_household_size = EXCLUDED.avg_household_size,
            pct_change_vs_prev = EXCLUDED.pct_change_vs_prev,
            anomaly_flag = EXCLUDED.anomaly_flag
        """,
        ward_id,
        resource_type,
        start,
        end,
        stats["avg_consumption"],
        stats["total_consumption"],
        stats["household_count"],
        stats["avg_household_size"],
        pct_change,
        anomaly_flag,
    )
