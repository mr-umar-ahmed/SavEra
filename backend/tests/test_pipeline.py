"""The post-reading pipeline, end to end against the real test DB (Phase 2 acceptance):
alerts are created when the rules fire, FCM push is attempted on high-severity anomalies
(mocked, payload asserted), baselines/green scores/ward aggregates are refreshed, and
everything is idempotent under the schema's dedupe constraint.

Weather is monkeypatched at ``app.services.pipeline.get_weather_context`` (never a real
network call) and push at ``app.services.fcm.send_push``, matching how each is actually
looked up by the code under test.
"""

from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Any

import pytest

from app import database
from app.services import fcm as fcm_module
from app.services import pipeline as pipeline_module

BASE = "/api/v1/readings"
LPG_BASE = "/api/v1/lpg"


@pytest.fixture
def no_weather(monkeypatch):
    async def _none(*_args, **_kwargs):
        return None

    monkeypatch.setattr(pipeline_module, "get_weather_context", _none)


@pytest.fixture
def hot_weather(monkeypatch):
    async def _hot(*_args, **_kwargs):
        return {"delta_c": 4.0, "hot_days": 20, "sentence": "It was 4°C hotter than usual."}

    monkeypatch.setattr(pipeline_module, "get_weather_context", _hot)


@pytest.fixture
def push_calls(monkeypatch):
    calls: list[dict[str, Any]] = []

    async def _fake_send(token, title, body, *, data=None):
        calls.append({"token": token, "title": title, "body": body, "data": data})
        return bool(token)

    monkeypatch.setattr(fcm_module, "send_push", _fake_send)
    return calls


async def _bill(client, headers, kwh, start, end):
    response = await client.post(
        f"{BASE}/electricity",
        json={
            "kwh": kwh,
            "billing_period_start": start.isoformat(),
            "billing_period_end": end.isoformat(),
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _monthly_bills(client, headers, values: list[float], first_start: date) -> list[dict]:
    """Save consecutive, non-overlapping *30-day* bills starting at `first_start`.

    Fixed 30-day periods (rather than real calendar months, which range 28-31 days) so a
    test's kwh values equal kwh_per_30d exactly — the normalisation itself is covered by
    app/models/readings.py's own tests, not this file's. Returns every created bill, in
    order, so a test can read the last one's actual ``billing_period_start`` back rather
    than recomputing it by hand.
    """
    results = []
    start = first_start
    for kwh in values:
        end = start + timedelta(days=29)
        results.append(await _bill(client, headers, kwh, start, end))
        start = end + timedelta(days=1)
    return results


async def _alerts_for(user_id, alert_type: str | None = None):
    if alert_type:
        return await database.fetch(
            "SELECT * FROM alerts WHERE user_id = $1 AND alert_type = $2 ORDER BY created_at",
            user_id,
            alert_type,
        )
    return await database.fetch("SELECT * FROM alerts WHERE user_id = $1 ORDER BY created_at", user_id)


# ------------------------------------------------------------------------- electricity


async def test_high_severity_anomaly_creates_an_alert_and_pushes(
    client, citizen, no_weather, push_calls
):
    user, headers = citizen
    await database.execute("UPDATE users SET fcm_token = 'test-token' WHERE id = $1", user["id"])
    await database.execute(
        "INSERT INTO appliances (user_id, type, count, daily_hours) VALUES ($1, 'ceiling_fan', 2, 8)",
        user["id"],
    )

    # mean 330, std floor 33 -> 480 is ~45% over: the spec's own test vector.
    await _monthly_bills(client, headers, [320.0, 330.0, 340.0, 480.0], date(2026, 4, 1))

    rows = await _alerts_for(user["id"], "high_consumption")
    assert len(rows) == 1
    context = rows[0]["context"]
    assert context["severity"] == "high"
    assert context["pct_over"] == pytest.approx(45.45, abs=0.1)
    assert context["current"] == pytest.approx(480.0, abs=0.1)
    assert isinstance(context["tips"], list) and context["tips"]

    assert len(push_calls) == 1
    assert push_calls[0]["token"] == "test-token"
    assert push_calls[0]["data"]["alert_type"] == "high_consumption"


async def test_medium_severity_anomaly_does_not_push(client, citizen, no_weather, push_calls):
    user, headers = citizen
    await database.execute("UPDATE users SET fcm_token = 'test-token' WHERE id = $1", user["id"])
    await _monthly_bills(client, headers, [320.0, 330.0, 340.0, 385.0], date(2026, 4, 1))  # just over upper

    rows = await _alerts_for(user["id"], "high_consumption")
    assert len(rows) == 1 and rows[0]["context"]["severity"] == "medium"
    assert push_calls == []  # push only fires on 'high'


async def test_weather_context_is_attached_when_available(client, citizen, hot_weather):
    user, headers = citizen
    await _monthly_bills(client, headers, [320.0, 330.0, 340.0, 480.0], date(2026, 4, 1))

    rows = await _alerts_for(user["id"], "high_consumption")
    assert rows[0]["context"]["weather_context"] == "It was 4°C hotter than usual."


async def test_a_normal_bill_creates_no_high_consumption_alert(client, citizen, no_weather):
    user, headers = citizen
    await _monthly_bills(client, headers, [320.0, 330.0, 340.0, 325.0], date(2026, 4, 1))
    assert await _alerts_for(user["id"], "high_consumption") == []


async def test_a_quiet_month_creates_a_milestone(client, citizen, no_weather):
    user, headers = citizen
    await _monthly_bills(client, headers, [400.0, 410.0, 390.0, 250.0], date(2026, 4, 1))  # well below usual
    rows = await _alerts_for(user["id"], "milestone")
    assert len(rows) == 1
    assert rows[0]["resource_type"] == "electricity"


async def test_baseline_is_refreshed_after_every_bill(client, citizen, no_weather):
    user, headers = citizen
    await _monthly_bills(client, headers, [300.0, 310.0, 290.0], date(2026, 4, 1))
    row = await database.fetchrow(
        "SELECT * FROM baselines WHERE user_id = $1 AND resource_type = 'electricity'", user["id"]
    )
    assert row is not None
    assert row["sample_count"] == 3
    assert row["mean"] == pytest.approx(300.0)


async def test_baseline_is_walk_forward_not_leaking_the_current_reading(client, citizen, no_weather):
    """The alert on the 480 bill must be judged against mean 330 (the first 3 bills only),
    never a mean that already includes the 480 itself."""
    user, headers = citizen
    await _monthly_bills(client, headers, [320.0, 330.0, 340.0, 480.0], date(2026, 4, 1))
    rows = await _alerts_for(user["id"], "high_consumption")
    assert rows[0]["context"]["baseline_mean"] == pytest.approx(330.0)


async def test_green_score_is_100_at_the_mean(client, citizen, no_weather):
    user, headers = citizen
    bills = await _monthly_bills(client, headers, [300.0, 300.0, 300.0, 300.0], date(2026, 4, 1))
    month = date.fromisoformat(bills[-1]["billing_period_start"]).replace(day=1)
    score = await database.fetchval(
        "SELECT electricity_score FROM green_scores WHERE user_id = $1 AND month = $2",
        user["id"],
        month,
    )
    assert score == pytest.approx(100.0)


async def test_ward_aggregate_is_upserted_after_a_bill(client, citizen, no_weather):
    user, headers = citizen
    assert user["ward_id"] is not None
    await _bill(client, headers, 300.0, date(2026, 8, 1), date(2026, 8, 31))
    row = await database.fetchrow(
        "SELECT * FROM ward_aggregates WHERE ward_id = $1 AND resource_type = 'electricity' "
        "AND period_start = DATE '2026-08-01'",
        user["ward_id"],
    )
    assert row is not None
    assert row["household_count"] >= 1


async def test_running_the_pipeline_twice_for_the_same_reading_does_not_duplicate_the_alert(
    client, citizen, no_weather
):
    user, headers = citizen
    bills = await _monthly_bills(client, headers, [320.0, 330.0, 340.0, 480.0], date(2026, 4, 1))
    reading_id = uuid.UUID(bills[-1]["id"])
    await pipeline_module.run_post_reading_pipeline(user["id"], "electricity", reading_id)
    await pipeline_module.run_post_reading_pipeline(user["id"], "electricity", reading_id)
    assert len(await _alerts_for(user["id"], "high_consumption")) == 1


# ------------------------------------------------------------------------------- water


async def _water(client, headers, liters, day):
    response = await client.post(
        f"{BASE}/water", json={"liters": liters, "reading_date": day.isoformat()}, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_a_single_high_day_creates_high_consumption_not_leak(client, citizen):
    user, headers = citizen
    for i in range(10):
        await _water(client, headers, 380.0 + (i % 3), date(2026, 7, 1) + timedelta(days=i))
    await _water(client, headers, 600.0, date(2026, 7, 11))  # one spike day

    assert len(await _alerts_for(user["id"], "high_consumption")) == 1
    assert await _alerts_for(user["id"], "leak_suspected") == []


async def test_two_consecutive_high_days_create_a_leak_alert_and_push(client, citizen, push_calls):
    user, headers = citizen
    await database.execute("UPDATE users SET fcm_token = 'test-token' WHERE id = $1", user["id"])
    for i in range(10):
        await _water(client, headers, 380.0, date(2026, 7, 1) + timedelta(days=i))
    await _water(client, headers, 700.0, date(2026, 7, 11))
    await _water(client, headers, 700.0, date(2026, 7, 12))

    leaks = await _alerts_for(user["id"], "leak_suspected")
    assert len(leaks) == 1
    assert leaks[0]["context"]["current"] == pytest.approx(700.0)
    assert any(call["data"]["alert_type"] == "leak_suspected" for call in push_calls)


async def test_high_consumption_is_suppressed_while_a_leak_is_active(client, citizen):
    """Day 11 is a lone high day (no leak confirmed yet -> high_consumption fires normally).
    Day 12 confirms two strong days in a row -> leak_suspected. Day 13, with a leak already
    on record, must not add a second high_consumption on top of it."""
    user, headers = citizen
    for i in range(10):
        await _water(client, headers, 380.0, date(2026, 7, 1) + timedelta(days=i))
    await _water(client, headers, 700.0, date(2026, 7, 11))
    assert len(await _alerts_for(user["id"], "high_consumption")) == 1

    await _water(client, headers, 700.0, date(2026, 7, 12))  # confirms the leak
    assert len(await _alerts_for(user["id"], "leak_suspected")) == 1

    await _water(client, headers, 700.0, date(2026, 7, 13))  # suppressed by the active leak
    assert len(await _alerts_for(user["id"], "high_consumption")) == 1
    assert len(await _alerts_for(user["id"], "leak_suspected")) == 1


async def test_a_quiet_day_creates_a_water_milestone(client, citizen):
    user, headers = citizen
    for i in range(10):
        await _water(client, headers, 400.0, date(2026, 7, 1) + timedelta(days=i))
    await _water(client, headers, 150.0, date(2026, 7, 11))
    rows = await _alerts_for(user["id"], "milestone")
    assert any(r["resource_type"] == "water" for r in rows)


# --------------------------------------------------------------------------------- lpg


async def test_lpg_close_refreshes_baseline_and_may_create_a_milestone(client, citizen):
    user, headers = citizen
    start = date(2026, 1, 1)
    for _ in range(4):
        opened = await client.post(
            f"{LPG_BASE}/cycles", json={"start_date": start.isoformat()}, headers=headers
        )
        assert opened.status_code == 201, opened.text
        end = start + timedelta(days=30)
        closed = await client.post(
            f"{LPG_BASE}/cycles/{opened.json()['id']}/close",
            json={"end_date": end.isoformat()},
            headers=headers,
        )
        assert closed.status_code == 200, closed.text
        start = end + timedelta(days=1)

    baseline = await database.fetchrow(
        "SELECT * FROM baselines WHERE user_id = $1 AND resource_type = 'lpg'", user["id"]
    )
    assert baseline is not None
    assert baseline["sample_count"] == 4  # the refresh includes the cycle that was just closed
