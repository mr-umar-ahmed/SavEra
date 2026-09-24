"""The three scheduled jobs from SPEC §Phase 2, registered by app/tasks/scheduler.py.

Each takes an injectable ``today`` so tests never depend on the wall clock — exactly the
pattern ``services/lpg.py`` already uses for ``predict_finish``.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta

from app import database
from app.services import alerts_svc
from app.services.baseline import compute_baseline
from app.services.lpg import burn_rate_from_history, predict_finish, today_ist
from app.services.pipeline import upsert_baseline  # the one DB-writing baseline helper

logger = logging.getLogger("savera.jobs")

ELECTRICITY_HISTORY = 6
WATER_HISTORY_DAYS = 90
LPG_HISTORY = 6
REFILL_OVERDUE_GRACE_DAYS = 2


async def recompute_all_baselines(today: date | None = None) -> int:
    """Monthly job (1st, 02:00 IST): refresh every user's baseline for every resource they
    have >= 3 samples of. Idempotent — running it twice in a row yields the same rows,
    since it always recomputes from the full current history rather than adjusting a running
    total. Returns the number of baselines written.
    """
    del today  # baselines use all history to date; no walk-forward cutoff for this job
    written = 0
    user_ids = [r["id"] for r in await database.fetch("SELECT id FROM users")]

    for user_id in user_ids:
        electricity = await database.fetch(
            "SELECT kwh, billing_period_start, billing_period_end FROM electricity_readings "
            "WHERE user_id = $1 ORDER BY billing_period_start DESC LIMIT $2",
            user_id,
            ELECTRICITY_HISTORY,
        )
        baseline = compute_baseline(
            [
                r["kwh"] / ((r["billing_period_end"] - r["billing_period_start"]).days + 1) * 30
                for r in electricity
            ]
        )
        if baseline is not None:
            await upsert_baseline(user_id, "electricity", baseline)
            written += 1

        water = await database.fetch(
            "SELECT liters FROM water_readings WHERE user_id = $1 ORDER BY reading_date DESC LIMIT $2",
            user_id,
            WATER_HISTORY_DAYS,
        )
        baseline = compute_baseline([r["liters"] for r in water])
        if baseline is not None:
            await upsert_baseline(user_id, "water", baseline)
            written += 1

        lpg = await database.fetch(
            "SELECT daily_burn_rate FROM lpg_cycles WHERE user_id = $1 AND end_date IS NOT NULL "
            "ORDER BY end_date DESC LIMIT $2",
            user_id,
            LPG_HISTORY,
        )
        baseline = compute_baseline([r["daily_burn_rate"] for r in lpg])
        if baseline is not None:
            await upsert_baseline(user_id, "lpg", baseline)
            written += 1

    logger.info("monthly baseline refresh: %d baselines written for %d users", written, len(user_ids))
    return written


async def check_lpg_refills(today: date | None = None) -> int:
    """Daily job (07:00 IST): every open cylinder gets checked against its own prediction.

    Fires ``refill_due_soon`` when ``predict_finish().should_alert_now`` (the 3-day buffer)
    and ``refill_overdue`` when today is more than two days past the estimated finish date
    and the cylinder is still open. Both are deduped per cycle, so a household is told once,
    not every morning. Returns the number of alerts created.

    The overdue check uses the finish date computed **from the cycle's start**
    (``start_date`` + kg/burn_rate), not ``predict_finish``'s own ``estimated_finish_date``:
    that field is deliberately "from today", so once a cylinder is already empty it always
    reads as "runs out today" — a moving target that a fixed +2-day grace could never catch.
    """
    today = today or today_ist()
    created = 0
    open_cycles = await database.fetch(
        """
        SELECT c.id, c.user_id, c.cylinder_kg, c.start_date, u.fcm_token
        FROM lpg_cycles c JOIN users u ON u.id = c.user_id
        WHERE c.end_date IS NULL
        """
    )

    for cycle in open_cycles:
        history = await database.fetch(
            "SELECT daily_burn_rate FROM lpg_cycles WHERE user_id = $1 AND end_date IS NOT NULL "
            "ORDER BY end_date DESC LIMIT $2",
            cycle["user_id"],
            LPG_HISTORY,
        )
        prediction = predict_finish(
            {"cylinder_kg": cycle["cylinder_kg"], "start_date": cycle["start_date"]},
            history,
            today=today,
        )
        burn_rate = burn_rate_from_history(history)
        original_finish_date = cycle["start_date"] + timedelta(
            days=int(cycle["cylinder_kg"] / burn_rate) if burn_rate > 0 else 999
        )

        if prediction["should_alert_now"]:
            finish_date = date.fromisoformat(prediction["estimated_finish_date"])
            alert = await alerts_svc.create_alert(
                cycle["user_id"],
                "lpg",
                "refill_due_soon",
                "Time to book a refill",
                f"Your cylinder is expected to run out around {finish_date.isoformat()}.",
                dedupe_key=alerts_svc.cycle_dedupe_key("refill_due_soon", cycle["id"]),
                context={
                    "estimated_finish_date": prediction["estimated_finish_date"],
                    "kg_remaining": prediction["kg_remaining"],
                },
                push=True,
                fcm_token=cycle["fcm_token"],
            )
            created += 1 if alert else 0

        if today > original_finish_date + timedelta(days=REFILL_OVERDUE_GRACE_DAYS):
            alert = await alerts_svc.create_alert(
                cycle["user_id"],
                "lpg",
                "refill_overdue",
                "Your cylinder is likely empty",
                f"It was expected to run out on {original_finish_date.isoformat()} — "
                "mark it finished when you replace it.",
                dedupe_key=alerts_svc.cycle_dedupe_key("refill_overdue", cycle["id"]),
                context={"estimated_finish_date": original_finish_date.isoformat()},
                push=True,
                fcm_token=cycle["fcm_token"],
            )
            created += 1 if alert else 0

    logger.info("LPG refill check: %d alert(s) created for %d open cylinder(s)", created, len(open_cycles))
    return created


async def send_weekly_digest(today: date | None = None) -> int:
    """Weekly job (Monday 08:00 IST): one in-app summary per user, deduped by ISO week."""
    today = today or today_ist()
    month = today.replace(day=1)
    created = 0
    users = await database.fetch("SELECT id FROM users WHERE role = 'citizen'")

    for user in users:
        score = await database.fetchval(
            "SELECT total_score FROM green_scores WHERE user_id = $1 AND month = $2",
            user["id"],
            month,
        )
        message = (
            f"Your green score this month is {round(score)}/100."
            if score is not None
            else "Add a reading this week to start tracking your green score."
        )
        alert = await alerts_svc.create_alert(
            user["id"],
            "general",
            "weekly_digest",
            "Your week with SAVERA",
            message,
            dedupe_key=alerts_svc.week_dedupe_key("general", "weekly_digest", today),
            context={"total_score": score},
        )
        created += 1 if alert else 0

    logger.info("weekly digest: %d alert(s) created for %d user(s)", created, len(users))
    return created
