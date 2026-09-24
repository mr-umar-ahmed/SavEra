"""The post-reading side-effects pipeline (SPEC §Phase 2 "Wire the post-reading side-effects
pipeline"): save reading -> run this in BackgroundTasks.

``run_post_reading_pipeline(user_id, resource, reading_id)`` is exactly the callable
``routers/readings.py`` and ``routers/lpg.py`` already look up lazily (``from
app.services.pipeline import run_post_reading_pipeline`` inside a try/except ImportError) —
this module existing is what turns their no-op hook into the real thing. The router already
schedules it with ``BackgroundTasks.add_task`` and isolates every exception, so the response
to ``POST /readings/*`` is never slowed down and a pipeline bug never surfaces to the client.

Every branch follows the same shape, walk-forward:

1. Load the new reading and the user's household context.
2. Build the **old** baseline from history strictly before this reading (never from itself).
3. Check the reading against that old baseline; write an alert if the rules in
   docs/PHASE0_PLAN.md §5.2 fire.
4. Refresh the ``baselines`` cache from history *including* this reading, for next time.
5. Recompute this month's Green Score for the resource, and the ward aggregate.

Pure computation lives in services/baseline.py, green_score.py, tips.py and weather.py; this
module is the only place that talks to the database for it, so those stay unit-testable
without a connection.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any
from uuid import UUID

from app import database
from app.services import alerts_svc, ward
from app.services.appliance import estimate_breakdown
from app.services.baseline import Baseline, check_anomaly, compute_baseline
from app.services.green_score import compute_total_score, resource_score
from app.services.green_score import ward_percentile as compute_ward_percentile
from app.services.tips import get_tips
from app.services.weather import get_weather_context

logger = logging.getLogger("savera.pipeline")

ELECTRICITY_HISTORY = 6
WATER_HISTORY_DAYS = 90
GREEN_SCORE_WATER_WINDOW = 7
LPG_HISTORY = 6
WATER_HIGH_FACTOR = 1.3
WATER_LEAK_FACTOR = 1.5


# ------------------------------------------------------------------------------ shared


async def _user_context(user_id: UUID) -> dict[str, Any] | None:
    row = await database.fetchrow(
        "SELECT household_size, ward_id, fcm_token FROM users WHERE id = $1", user_id
    )
    return dict(row) if row else None


async def _ward_coordinates(ward_id: int | None) -> tuple[float | None, float | None]:
    if ward_id is None:
        return None, None
    row = await database.fetchrow("SELECT lat, lng FROM wards WHERE id = $1", ward_id)
    return (row["lat"], row["lng"]) if row else (None, None)


async def upsert_baseline(user_id: UUID, resource_type: str, baseline: Baseline) -> None:
    await database.execute(
        """
        INSERT INTO baselines
            (user_id, resource_type, mean, std_dev, upper_threshold, lower_threshold, sample_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, resource_type) DO UPDATE SET
            mean = EXCLUDED.mean, std_dev = EXCLUDED.std_dev,
            upper_threshold = EXCLUDED.upper_threshold, lower_threshold = EXCLUDED.lower_threshold,
            sample_count = EXCLUDED.sample_count, computed_at = NOW()
        """,
        user_id,
        resource_type,
        baseline["mean"],
        baseline["std_dev"],
        baseline["upper_threshold"],
        baseline["lower_threshold"],
        baseline["sample_count"],
    )


async def _upsert_green_score(
    user_id: UUID, month: date, resource_type: str, score: float | None, ward_id: int | None
) -> None:
    existing = await database.fetchrow(
        "SELECT electricity_score, water_score, lpg_score FROM green_scores "
        "WHERE user_id = $1 AND month = $2",
        user_id,
        month,
    )
    scores = {
        "electricity": existing["electricity_score"] if existing else None,
        "water": existing["water_score"] if existing else None,
        "lpg": existing["lpg_score"] if existing else None,
    }
    scores[resource_type] = score
    total = compute_total_score([scores["electricity"], scores["water"], scores["lpg"]])

    percentile = None
    if ward_id is not None and total is not None:
        peers = await database.fetch(
            """
            SELECT gs.total_score FROM green_scores gs
            JOIN users u ON u.id = gs.user_id
            WHERE u.ward_id = $1 AND gs.month = $2 AND gs.user_id != $3
              AND gs.total_score IS NOT NULL
            """,
            ward_id,
            month,
            user_id,
        )
        percentile = compute_ward_percentile(total, [p["total_score"] for p in peers])

    await database.execute(
        """
        INSERT INTO green_scores
            (user_id, month, electricity_score, water_score, lpg_score, total_score, ward_percentile)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, month) DO UPDATE SET
            electricity_score = EXCLUDED.electricity_score, water_score = EXCLUDED.water_score,
            lpg_score = EXCLUDED.lpg_score, total_score = EXCLUDED.total_score,
            ward_percentile = EXCLUDED.ward_percentile, computed_at = NOW()
        """,
        user_id,
        month,
        scores["electricity"],
        scores["water"],
        scores["lpg"],
        total,
        percentile,
    )


async def _previous_month_score(user_id: UUID, resource_type: str, month: date) -> float | None:
    column = f"{resource_type}_score"
    previous_month = ward.add_months(month, -1)
    return await database.fetchval(
        f"SELECT {column} FROM green_scores WHERE user_id = $1 AND month = $2",
        user_id,
        previous_month,
    )


# ------------------------------------------------------------------------- electricity


async def _process_electricity(user_id: UUID, reading_id: UUID) -> None:
    user = await _user_context(user_id)
    reading = await database.fetchrow(
        "SELECT kwh, billing_period_start, billing_period_end FROM electricity_readings "
        "WHERE id = $1 AND user_id = $2",
        reading_id,
        user_id,
    )
    if user is None or reading is None:
        return

    days = (reading["billing_period_end"] - reading["billing_period_start"]).days + 1
    current = reading["kwh"] / days * 30

    history = await database.fetch(
        "SELECT kwh, billing_period_start, billing_period_end FROM electricity_readings "
        "WHERE user_id = $1 AND billing_period_start < $2 "
        "ORDER BY billing_period_start DESC LIMIT $3",
        user_id,
        reading["billing_period_start"],
        ELECTRICITY_HISTORY,
    )
    history_values = [
        r["kwh"] / ((r["billing_period_end"] - r["billing_period_start"]).days + 1) * 30
        for r in history
    ]
    old_baseline = compute_baseline(history_values)

    appliances = await database.fetch(
        "SELECT type, count, daily_hours, star_rating, wattage_override FROM appliances WHERE user_id = $1",
        user_id,
    )
    breakdown = estimate_breakdown(appliances, days)

    if old_baseline is not None:
        anomaly = check_anomaly(current, old_baseline)
        if anomaly["is_anomaly"]:
            lat, lng = await _ward_coordinates(user["ward_id"])
            weather = await get_weather_context(
                reading["billing_period_start"], reading["billing_period_end"], lat, lng
            )
            tips = get_tips("electricity", appliance_breakdown=breakdown)
            top_appliance = max(breakdown, key=breakdown.get) if breakdown else None
            context = {
                "pct_over": anomaly["pct_over"],
                "current": round(current, 1),
                "baseline_mean": round(old_baseline["mean"], 1),
                "severity": anomaly["severity"],
                "weather_context": weather["sentence"] if weather else None,
                "tips": tips,
                "top_appliance": top_appliance,
            }
            await alerts_svc.create_alert(
                user_id,
                "electricity",
                "high_consumption",
                "Your electricity bill is higher than usual",
                f"{round(anomaly['pct_over'])}% above your usual {round(old_baseline['mean'])} kWh per 30 days.",
                dedupe_key=alerts_svc.bill_dedupe_key("electricity", reading_id),
                context=context,
                push=anomaly["severity"] == "high",
                fcm_token=user["fcm_token"],
            )
        elif current <= old_baseline["lower_threshold"]:
            await alerts_svc.create_alert(
                user_id,
                "electricity",
                "milestone",
                "A quieter month",
                f"Your usage dropped to {round(current)} kWh per 30 days — below your usual.",
                dedupe_key=alerts_svc.milestone_dedupe_key(
                    "electricity", reading["billing_period_start"]
                ),
                context={"current": round(current, 1)},
            )

    refreshed = await database.fetch(
        "SELECT kwh, billing_period_start, billing_period_end FROM electricity_readings "
        "WHERE user_id = $1 ORDER BY billing_period_start DESC LIMIT $2",
        user_id,
        ELECTRICITY_HISTORY,
    )
    refreshed_values = [
        r["kwh"] / ((r["billing_period_end"] - r["billing_period_start"]).days + 1) * 30
        for r in refreshed
    ]
    new_baseline = compute_baseline(refreshed_values)
    if new_baseline is not None:
        await upsert_baseline(user_id, "electricity", new_baseline)

    month = reading["billing_period_start"].replace(day=1)
    previous_score = await _previous_month_score(user_id, "electricity", month)
    score = resource_score(current, old_baseline, user["household_size"], previous_score=previous_score)
    await _upsert_green_score(user_id, month, "electricity", score, user["ward_id"])

    if user["ward_id"] is not None:
        await ward.upsert_ward_aggregate(user["ward_id"], "electricity", reading["billing_period_start"])


# -------------------------------------------------------------------------------- water


async def _process_water(user_id: UUID, reading_id: UUID) -> None:
    user = await _user_context(user_id)
    reading = await database.fetchrow(
        "SELECT liters, reading_date FROM water_readings WHERE id = $1 AND user_id = $2",
        reading_id,
        user_id,
    )
    if user is None or reading is None:
        return
    current, today = reading["liters"], reading["reading_date"]

    history = await database.fetch(
        "SELECT liters FROM water_readings WHERE user_id = $1 AND reading_date < $2 "
        "ORDER BY reading_date DESC LIMIT $3",
        user_id,
        today,
        WATER_HISTORY_DAYS,
    )
    history_values = [r["liters"] for r in history]
    old_baseline = compute_baseline(history_values)

    if old_baseline is not None:
        mean, upper = old_baseline["mean"], old_baseline["upper_threshold"]
        strongly_high = current > upper and current >= WATER_LEAK_FACTOR * mean

        yesterday = await database.fetchval(
            "SELECT liters FROM water_readings WHERE user_id = $1 AND reading_date = $2",
            user_id,
            today - timedelta(days=1),
        )
        yesterday_strong = (
            yesterday is not None and yesterday > upper and yesterday >= WATER_LEAK_FACTOR * mean
        )

        # A rolling 7-day window, not a calendar-week bucket: a leak spanning a Sunday and
        # the Monday after it must still count as "the same" active leak.
        leak_since = today - timedelta(days=alerts_svc.LEAK_SUPPRESSION_DAYS - 1)
        if strongly_high and yesterday_strong:
            if not await alerts_svc.has_recent_alert(user_id, "water", "leak_suspected", since=leak_since):
                tips = get_tips("water")
                await alerts_svc.create_alert(
                    user_id,
                    "water",
                    "leak_suspected",
                    "Possible leak — two days of unusually high water use",
                    f"{round(current)} L yesterday and today, both well above your usual {round(mean)} L/day.",
                    dedupe_key=alerts_svc.day_dedupe_key("water", "leak_suspected", today),
                    context={"current": round(current, 1), "baseline_mean": round(mean, 1), "tips": tips},
                    push=True,
                    fcm_token=user["fcm_token"],
                )
        elif current > upper and current >= WATER_HIGH_FACTOR * mean:
            if not await alerts_svc.has_recent_alert(user_id, "water", "leak_suspected", since=leak_since):
                tips = get_tips("water")
                await alerts_svc.create_alert(
                    user_id,
                    "water",
                    "high_consumption",
                    "More water than usual today",
                    f"{round(current)} L today, above your usual {round(mean)} L/day.",
                    dedupe_key=alerts_svc.day_dedupe_key("water", "high_consumption", today),
                    context={"current": round(current, 1), "baseline_mean": round(mean, 1), "tips": tips},
                )
        elif current <= old_baseline["lower_threshold"]:
            await alerts_svc.create_alert(
                user_id,
                "water",
                "milestone",
                "Lower water use",
                f"{round(current)} L today — below your usual {round(mean)} L/day.",
                dedupe_key=alerts_svc.milestone_dedupe_key("water", today),
                context={"current": round(current, 1)},
            )

    refreshed = await database.fetch(
        "SELECT liters FROM water_readings WHERE user_id = $1 ORDER BY reading_date DESC LIMIT $2",
        user_id,
        WATER_HISTORY_DAYS,
    )
    refreshed_values = [r["liters"] for r in refreshed]
    new_baseline = compute_baseline(refreshed_values)
    if new_baseline is not None:
        await upsert_baseline(user_id, "water", new_baseline)

    recent = await database.fetch(
        "SELECT liters FROM water_readings WHERE user_id = $1 ORDER BY reading_date DESC LIMIT $2",
        user_id,
        GREEN_SCORE_WATER_WINDOW,
    )
    recent_values = [r["liters"] for r in recent]
    current_avg = sum(recent_values) / len(recent_values) if recent_values else current

    month = today.replace(day=1)
    previous_score = await _previous_month_score(user_id, "water", month)
    score = resource_score(current_avg, old_baseline, user["household_size"], previous_score=previous_score)
    await _upsert_green_score(user_id, month, "water", score, user["ward_id"])

    if user["ward_id"] is not None:
        await ward.upsert_ward_aggregate(user["ward_id"], "water", today)


# ---------------------------------------------------------------------------------- lpg


async def _process_lpg(user_id: UUID, cycle_id: UUID) -> None:
    user = await _user_context(user_id)
    cycle = await database.fetchrow(
        "SELECT end_date, daily_burn_rate FROM lpg_cycles WHERE id = $1 AND user_id = $2",
        cycle_id,
        user_id,
    )
    if user is None or cycle is None or cycle["daily_burn_rate"] is None:
        return  # only a *closed* cycle carries a burn rate to compare
    current, closed_on = cycle["daily_burn_rate"], cycle["end_date"]

    history = await database.fetch(
        "SELECT daily_burn_rate FROM lpg_cycles WHERE user_id = $1 AND end_date IS NOT NULL "
        "AND end_date < $2 ORDER BY end_date DESC LIMIT $3",
        user_id,
        closed_on,
        LPG_HISTORY,
    )
    old_baseline = compute_baseline([r["daily_burn_rate"] for r in history])

    if old_baseline is not None and current <= old_baseline["lower_threshold"]:
        await alerts_svc.create_alert(
            user_id,
            "lpg",
            "milestone",
            "Your cylinder lasted longer",
            f"{round(current, 2)} kg/day this cylinder — better than your usual {round(old_baseline['mean'], 2)}.",
            dedupe_key=alerts_svc.milestone_dedupe_key("lpg", closed_on),
            context={"current": round(current, 2)},
        )

    refreshed = await database.fetch(
        "SELECT daily_burn_rate FROM lpg_cycles WHERE user_id = $1 AND end_date IS NOT NULL "
        "ORDER BY end_date DESC LIMIT $2",
        user_id,
        LPG_HISTORY,
    )
    new_baseline = compute_baseline([r["daily_burn_rate"] for r in refreshed])
    if new_baseline is not None:
        await upsert_baseline(user_id, "lpg", new_baseline)

    month = closed_on.replace(day=1)
    previous_score = await _previous_month_score(user_id, "lpg", month)
    score = resource_score(current, old_baseline, user["household_size"], previous_score=previous_score)
    await _upsert_green_score(user_id, month, "lpg", score, user["ward_id"])

    if user["ward_id"] is not None:
        await ward.upsert_ward_aggregate(user["ward_id"], "lpg", closed_on)


# --------------------------------------------------------------------------- dispatch

_HANDLERS = {
    "electricity": _process_electricity,
    "water": _process_water,
    "lpg": _process_lpg,
}


async def run_post_reading_pipeline(user_id: UUID, resource: str, reading_id: UUID) -> None:
    """Baseline refresh, anomaly/alert check, Green Score and ward aggregate for one reading.

    Looked up lazily by the readings and LPG routers and run inside BackgroundTasks; never
    call this synchronously from a request handler.
    """
    handler = _HANDLERS.get(resource)
    if handler is None:
        raise ValueError(f"unknown resource {resource!r}")
    await handler(user_id, reading_id)


