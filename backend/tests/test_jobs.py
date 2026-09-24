"""The three scheduled jobs (SPEC §Phase 2), driven directly against the test DB with an
injected `today` — never the wall clock, and never a real APScheduler tick."""

from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Any

import pytest

from app import database
from app.services import fcm as fcm_module
from app.services import jobs

TODAY = date(2026, 9, 24)


@pytest.fixture
def push_calls(monkeypatch):
    calls: list[dict[str, Any]] = []

    async def _fake_send(token, title, body, *, data=None):
        calls.append({"token": token, "title": title, "body": body, "data": data})
        return bool(token)

    monkeypatch.setattr(fcm_module, "send_push", _fake_send)
    return calls


async def _closed_cycle(user_id, start: date, end: date, burn_rate: float, cylinder_kg=14.2):
    await database.execute(
        """
        INSERT INTO lpg_cycles (user_id, cylinder_kg, start_date, end_date, daily_burn_rate)
        VALUES ($1, $2, $3, $4, $5)
        """,
        user_id,
        cylinder_kg,
        start,
        end,
        burn_rate,
    )


async def _open_cycle(user_id, start: date, cylinder_kg=14.2) -> uuid.UUID:
    return await database.fetchval(
        "INSERT INTO lpg_cycles (user_id, cylinder_kg, start_date) VALUES ($1, $2, $3) RETURNING id",
        user_id,
        cylinder_kg,
        start,
    )


# ---------------------------------------------------------------- recompute_all_baselines


async def test_recompute_all_baselines_writes_electricity_water_and_lpg(citizen):
    user, _ = citizen
    for i, kwh in enumerate([300.0, 310.0, 290.0]):
        start = date(2026, i + 4, 1)
        end = date(2026, i + 4, 28)
        await database.execute(
            "INSERT INTO electricity_readings (user_id, kwh, billing_period_start, billing_period_end) "
            "VALUES ($1, $2, $3, $4)",
            user["id"],
            kwh,
            start,
            end,
        )
    for i, liters in enumerate([400.0, 410.0, 390.0]):
        await database.execute(
            "INSERT INTO water_readings (user_id, liters, reading_date) VALUES ($1, $2, $3)",
            user["id"],
            liters,
            date(2026, 7, 1) + timedelta(days=i),
        )
    await _closed_cycle(user["id"], date(2026, 1, 1), date(2026, 1, 31), 0.47)
    await _closed_cycle(user["id"], date(2026, 2, 1), date(2026, 2, 28), 0.5)
    await _closed_cycle(user["id"], date(2026, 3, 1), date(2026, 3, 30), 0.45)

    written = await jobs.recompute_all_baselines()
    assert written == 3

    for resource in ("electricity", "water", "lpg"):
        row = await database.fetchrow(
            "SELECT sample_count FROM baselines WHERE user_id = $1 AND resource_type = $2",
            user["id"],
            resource,
        )
        assert row is not None and row["sample_count"] == 3


async def test_recompute_all_baselines_skips_users_under_three_samples(citizen):
    user, _ = citizen
    await database.execute(
        "INSERT INTO water_readings (user_id, liters, reading_date) VALUES ($1, 400, $2)",
        user["id"],
        date(2026, 7, 1),
    )
    written = await jobs.recompute_all_baselines()
    assert written == 0
    assert await database.fetchrow("SELECT 1 FROM baselines WHERE user_id = $1", user["id"]) is None


async def test_recompute_all_baselines_is_idempotent(citizen):
    user, _ = citizen
    for i, liters in enumerate([400.0, 410.0, 390.0]):
        await database.execute(
            "INSERT INTO water_readings (user_id, liters, reading_date) VALUES ($1, $2, $3)",
            user["id"],
            liters,
            date(2026, 7, 1) + timedelta(days=i),
        )
    await jobs.recompute_all_baselines()
    first = await database.fetchrow(
        "SELECT mean, computed_at FROM baselines WHERE user_id = $1 AND resource_type = 'water'", user["id"]
    )
    await jobs.recompute_all_baselines()
    second = await database.fetchrow(
        "SELECT mean, computed_at FROM baselines WHERE user_id = $1 AND resource_type = 'water'", user["id"]
    )
    assert first["mean"] == second["mean"]
    assert await database.fetchval(
        "SELECT COUNT(*) FROM baselines WHERE user_id = $1", user["id"]
    ) == 1  # UNIQUE (user_id, resource_type) — updated in place, never duplicated


# --------------------------------------------------------------------- check_lpg_refills


async def test_refill_due_soon_fires_within_the_three_day_buffer_and_pushes(citizen, push_calls):
    user, _ = citizen
    await database.execute("UPDATE users SET fcm_token = 'test-token' WHERE id = $1", user["id"])
    # 14.2 kg at the default 0.568 kg/day burn rate empties in ~25 days; opened 23 days ago
    # leaves ~2 days -> inside the 3-day alert buffer.
    await _open_cycle(user["id"], TODAY - timedelta(days=23))

    created = await jobs.check_lpg_refills(today=TODAY)
    assert created == 1
    rows = await database.fetch(
        "SELECT * FROM alerts WHERE user_id = $1 AND alert_type = 'refill_due_soon'", user["id"]
    )
    assert len(rows) == 1
    assert push_calls and push_calls[0]["data"]["alert_type"] == "refill_due_soon"


async def test_refill_due_soon_does_not_fire_early(citizen, push_calls):
    user, _ = citizen
    await _open_cycle(user["id"], TODAY - timedelta(days=1))  # just started
    created = await jobs.check_lpg_refills(today=TODAY)
    assert created == 0
    assert push_calls == []


async def test_refill_overdue_fires_two_days_past_the_estimate(citizen, push_calls):
    user, _ = citizen
    await database.execute("UPDATE users SET fcm_token = 'test-token' WHERE id = $1", user["id"])
    # opened 40 days ago, well past the ~25-day default estimate + the 2-day grace.
    await _open_cycle(user["id"], TODAY - timedelta(days=40))

    await jobs.check_lpg_refills(today=TODAY)
    rows = await database.fetch(
        "SELECT * FROM alerts WHERE user_id = $1 AND alert_type = 'refill_overdue'", user["id"]
    )
    assert len(rows) == 1


async def test_refill_alerts_are_deduped_per_cycle_across_runs(citizen):
    user, _ = citizen
    await _open_cycle(user["id"], TODAY - timedelta(days=23))
    first = await jobs.check_lpg_refills(today=TODAY)
    second = await jobs.check_lpg_refills(today=TODAY + timedelta(days=1))
    assert first == 1
    assert second == 0  # the household was already told; no repeat the next morning
    assert await database.fetchval(
        "SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND alert_type = 'refill_due_soon'", user["id"]
    ) == 1


async def test_a_cylinder_with_no_history_uses_the_default_burn_rate(citizen):
    """A brand-new user's very first cylinder must still produce a usable prediction —
    services/lpg.py's DEFAULT_BURN_RATE, no history required."""
    user, _ = citizen
    await _open_cycle(user["id"], TODAY - timedelta(days=30))  # past the ~25-day default
    created = await jobs.check_lpg_refills(today=TODAY)
    assert created >= 1


async def test_closed_cycles_are_never_checked_for_refills(citizen):
    user, _ = citizen
    await _closed_cycle(user["id"], date(2026, 1, 1), date(2026, 1, 20), 0.5)
    created = await jobs.check_lpg_refills(today=TODAY)
    assert created == 0


# -------------------------------------------------------------------- send_weekly_digest


async def test_weekly_digest_covers_citizens_only(citizen, supervisor):
    created = await jobs.send_weekly_digest(today=TODAY)
    assert created == 1  # the supervisor fixture is role='supervisor', not a digest recipient

    citizen_user, _ = citizen
    rows = await database.fetch(
        "SELECT * FROM alerts WHERE user_id = $1 AND alert_type = 'weekly_digest'", citizen_user["id"]
    )
    assert len(rows) == 1
    assert rows[0]["resource_type"] == "general"

    supervisor_user, _ = supervisor
    assert await database.fetchval(
        "SELECT COUNT(*) FROM alerts WHERE user_id = $1", supervisor_user["id"]
    ) == 0


async def test_weekly_digest_mentions_the_green_score_when_one_exists(citizen):
    user, _ = citizen
    await database.execute(
        "INSERT INTO green_scores (user_id, month, total_score) VALUES ($1, $2, 82.0)",
        user["id"],
        TODAY.replace(day=1),
    )
    await jobs.send_weekly_digest(today=TODAY)
    row = await database.fetchrow(
        "SELECT message, context FROM alerts WHERE user_id = $1 AND alert_type = 'weekly_digest'",
        user["id"],
    )
    assert "82" in row["message"]
    assert row["context"]["total_score"] == pytest.approx(82.0)


async def test_weekly_digest_is_deduped_within_the_same_week(citizen):
    await jobs.send_weekly_digest(today=TODAY)
    second = await jobs.send_weekly_digest(today=TODAY + timedelta(days=1))
    assert second == 0
