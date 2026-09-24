"""LPG cycle API: start / close / list / current (+ prediction) against the real test DB.

The router's ``_today`` is pinned to 2026-09-24 so every date assertion is deterministic.
"""

from __future__ import annotations

import sys
import types
import uuid
from datetime import date, timedelta

import pytest

from app import database
from app.routers import lpg as lpg_router
from app.services.lpg import DEFAULT_BURN_RATE, PREDICTION_KEYS

TODAY = date(2026, 9, 24)
BASE = "/api/v1/lpg"
ALLOWED_EXTRAS = {"pct_remaining", "days_elapsed"}


@pytest.fixture(autouse=True)
def frozen_today(monkeypatch):
    monkeypatch.setattr(lpg_router, "_today", lambda: TODAY)
    return TODAY


@pytest.fixture
def fake_pipeline(monkeypatch):
    """Stand-in for app.services.pipeline that records every call (also shadows the real one)."""
    calls: list[tuple[tuple, dict]] = []
    module = types.ModuleType("app.services.pipeline")

    async def run_post_reading_pipeline(*args, **kwargs):
        calls.append((args, kwargs))

    module.run_post_reading_pipeline = run_post_reading_pipeline
    monkeypatch.setitem(sys.modules, "app.services.pipeline", module)
    return calls


async def _start(client, headers, start_date: date, cylinder_kg: float | None = None):
    body: dict = {"start_date": start_date.isoformat()}
    if cylinder_kg is not None:
        body["cylinder_kg"] = cylinder_kg
    return await client.post(f"{BASE}/cycles", json=body, headers=headers)


async def _close(client, headers, cycle_id, end_date: date):
    return await client.post(
        f"{BASE}/cycles/{cycle_id}/close", json={"end_date": end_date.isoformat()}, headers=headers
    )


async def _insert_closed(user_id, start: date, end: date, rate: float) -> uuid.UUID:
    return await database.fetchval(
        """
        INSERT INTO lpg_cycles (user_id, start_date, end_date, daily_burn_rate)
        VALUES ($1, $2, $3, $4) RETURNING id
        """,
        user_id,
        start,
        end,
        rate,
    )


# --- auth ------------------------------------------------------------------------------------


async def test_every_route_requires_auth(client):
    assert (await client.get(f"{BASE}/cycles")).status_code == 401
    assert (await client.post(f"{BASE}/cycles", json={"start_date": "2026-09-01"})).status_code == 401
    assert (await client.get(f"{BASE}/current")).status_code == 401
    resp = await client.post(f"{BASE}/cycles/{uuid.uuid4()}/close", json={"end_date": "2026-09-01"})
    assert resp.status_code == 401


# --- start -----------------------------------------------------------------------------------


async def test_start_cycle_returns_201(client, citizen):
    user, headers = citizen
    resp = await _start(client, headers, TODAY - timedelta(days=20))
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert uuid.UUID(body["id"])
    assert body["cylinder_kg"] == 14.2  # default
    assert body["start_date"] == "2026-09-04"
    assert body["end_date"] is None
    assert body["daily_burn_rate"] is None
    assert body["days"] == 20  # elapsed so far
    assert body["is_open"] is True

    row = await database.fetchrow("SELECT user_id, end_date FROM lpg_cycles WHERE id = $1", uuid.UUID(body["id"]))
    assert row["user_id"] == user["id"] and row["end_date"] is None


async def test_second_start_is_409(client, citizen):
    user, headers = citizen
    assert (await _start(client, headers, TODAY - timedelta(days=20))).status_code == 201
    resp = await _start(client, headers, TODAY - timedelta(days=1))
    assert resp.status_code == 409
    assert resp.json() == {"detail": "You already have an open cylinder"}
    assert await database.fetchval("SELECT COUNT(*) FROM lpg_cycles WHERE user_id = $1", user["id"]) == 1


async def test_start_date_may_be_tomorrow_but_not_later(client, citizen):
    _, headers = citizen
    assert (await _start(client, headers, TODAY + timedelta(days=2))).status_code == 422
    assert (await _start(client, headers, TODAY + timedelta(days=1))).status_code == 201


@pytest.mark.parametrize("bad_kg", [0, 0.5, 51, -14.2])
async def test_start_rejects_cylinder_size_outside_1_to_50(client, citizen, bad_kg):
    _, headers = citizen
    assert (await _start(client, headers, TODAY, cylinder_kg=bad_kg)).status_code == 422


async def test_start_accepts_custom_cylinder_size(client, citizen):
    _, headers = citizen
    resp = await _start(client, headers, TODAY - timedelta(days=3), cylinder_kg=5)
    assert resp.status_code == 201
    assert resp.json()["cylinder_kg"] == 5.0


async def test_start_requires_start_date(client, citizen):
    _, headers = citizen
    assert (await client.post(f"{BASE}/cycles", json={}, headers=headers)).status_code == 422


# --- list ------------------------------------------------------------------------------------


async def test_list_cycles_newest_first_and_scoped_to_user(client, citizen, make_user):
    user, headers = citizen
    other, other_headers = await make_user()
    await _insert_closed(user["id"], date(2026, 6, 1), date(2026, 6, 26), 0.568)
    await _insert_closed(user["id"], date(2026, 7, 1), date(2026, 7, 31), 0.4733)
    await _insert_closed(other["id"], date(2026, 8, 1), date(2026, 8, 20), 0.71)
    assert (await _start(client, headers, date(2026, 9, 4))).status_code == 201

    resp = await client.get(f"{BASE}/cycles", headers=headers)
    assert resp.status_code == 200
    cycles = resp.json()
    assert [c["start_date"] for c in cycles] == ["2026-09-04", "2026-07-01", "2026-06-01"]
    assert [c["is_open"] for c in cycles] == [True, False, False]
    assert [c["days"] for c in cycles] == [20, 30, 25]
    assert cycles[1]["end_date"] == "2026-07-31" and cycles[1]["daily_burn_rate"] == 0.4733
    assert set(cycles[0]) == {"id", "cylinder_kg", "start_date", "end_date", "daily_burn_rate", "days", "is_open"}

    limited = await client.get(f"{BASE}/cycles?limit=2", headers=headers)
    assert [c["start_date"] for c in limited.json()] == ["2026-09-04", "2026-07-01"]

    others = (await client.get(f"{BASE}/cycles", headers=other_headers)).json()
    assert [c["start_date"] for c in others] == ["2026-08-01"]


async def test_list_is_empty_for_new_user(client, citizen):
    _, headers = citizen
    resp = await client.get(f"{BASE}/cycles", headers=headers)
    assert resp.status_code == 200 and resp.json() == []


# --- close -----------------------------------------------------------------------------------


async def test_close_computes_burn_rate(client, citizen):
    user, headers = citizen
    cycle_id = (await _start(client, headers, date(2026, 8, 1))).json()["id"]

    resp = await _close(client, headers, cycle_id, date(2026, 8, 26))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["id"] == cycle_id
    assert body["end_date"] == "2026-08-26"
    assert body["daily_burn_rate"] == pytest.approx(0.568)  # 14.2 kg over 25 days
    assert body["days"] == 25
    assert body["is_open"] is False

    row = await database.fetchrow("SELECT end_date, daily_burn_rate FROM lpg_cycles WHERE id = $1", uuid.UUID(cycle_id))
    assert row["end_date"] == date(2026, 8, 26)
    assert row["daily_burn_rate"] == pytest.approx(0.568)


async def test_close_twice_is_409(client, citizen):
    _, headers = citizen
    cycle_id = (await _start(client, headers, date(2026, 8, 1))).json()["id"]
    assert (await _close(client, headers, cycle_id, date(2026, 8, 26))).status_code == 200
    resp = await _close(client, headers, cycle_id, date(2026, 8, 27))
    assert resp.status_code == 409
    assert resp.json()["detail"] == "This cylinder is already closed"


async def test_close_same_day_uses_default_rate(client, citizen):
    _, headers = citizen
    cycle_id = (await _start(client, headers, date(2026, 9, 20))).json()["id"]
    resp = await _close(client, headers, cycle_id, date(2026, 9, 20))
    assert resp.status_code == 200
    assert resp.json()["daily_burn_rate"] == pytest.approx(DEFAULT_BURN_RATE)
    assert resp.json()["days"] == 0


async def test_close_rejects_end_before_start(client, citizen):
    _, headers = citizen
    cycle_id = (await _start(client, headers, date(2026, 9, 10))).json()["id"]
    resp = await _close(client, headers, cycle_id, date(2026, 9, 9))
    assert resp.status_code == 422
    assert (await client.get(f"{BASE}/current", headers=headers)).json()["cycle"]["is_open"] is True


async def test_close_rejects_end_after_tomorrow(client, citizen):
    _, headers = citizen
    cycle_id = (await _start(client, headers, date(2026, 9, 10))).json()["id"]
    assert (await _close(client, headers, cycle_id, TODAY + timedelta(days=2))).status_code == 422
    assert (await _close(client, headers, cycle_id, TODAY + timedelta(days=1))).status_code == 200


async def test_close_other_users_cycle_is_404(client, citizen, make_user):
    owner, owner_headers = citizen
    _, intruder_headers = await make_user()
    cycle_id = (await _start(client, owner_headers, date(2026, 9, 1))).json()["id"]

    resp = await _close(client, intruder_headers, cycle_id, date(2026, 9, 20))
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Cycle not found"
    still_open = await database.fetchval("SELECT end_date IS NULL FROM lpg_cycles WHERE id = $1", uuid.UUID(cycle_id))
    assert still_open is True


async def test_close_unknown_or_malformed_id(client, citizen):
    _, headers = citizen
    assert (await _close(client, headers, uuid.uuid4(), date(2026, 9, 20))).status_code == 404
    assert (await _close(client, headers, "not-a-uuid", date(2026, 9, 20))).status_code == 422


async def test_close_on_a_date_another_cycle_ended_is_409(client, citizen):
    """UNIQUE (user_id, end_date) from the spec schema is mapped to 409, not a 500."""
    user, headers = citizen
    await _insert_closed(user["id"], date(2026, 8, 1), date(2026, 8, 26), 0.568)
    cycle_id = (await _start(client, headers, date(2026, 8, 26))).json()["id"]
    resp = await _close(client, headers, cycle_id, date(2026, 8, 26))
    assert resp.status_code == 409
    assert "date" in resp.json()["detail"]


async def test_can_start_a_new_cycle_after_closing(client, citizen):
    _, headers = citizen
    cycle_id = (await _start(client, headers, date(2026, 8, 1))).json()["id"]
    assert (await _close(client, headers, cycle_id, date(2026, 8, 26))).status_code == 200
    resp = await _start(client, headers, date(2026, 8, 27))
    assert resp.status_code == 201
    assert resp.json()["id"] != cycle_id


# --- close: pipeline hook --------------------------------------------------------------------


async def test_close_schedules_pipeline_with_lpg_resource(client, citizen, fake_pipeline):
    user, headers = citizen
    cycle_id = (await _start(client, headers, date(2026, 8, 1))).json()["id"]
    assert (await _close(client, headers, cycle_id, date(2026, 8, 26))).status_code == 200
    # httpx's ASGI transport runs BackgroundTasks before the response is handed back.
    assert fake_pipeline == [((user["id"], "lpg", uuid.UUID(cycle_id)), {})]


async def test_start_does_not_schedule_pipeline(client, citizen, fake_pipeline):
    _, headers = citizen
    assert (await _start(client, headers, date(2026, 8, 1))).status_code == 201
    assert fake_pipeline == []


async def test_close_survives_pipeline_failure(client, citizen, monkeypatch):
    _, headers = citizen
    module = types.ModuleType("app.services.pipeline")

    async def boom(*_args, **_kwargs):
        raise RuntimeError("weather API down")

    module.run_post_reading_pipeline = boom
    monkeypatch.setitem(sys.modules, "app.services.pipeline", module)

    cycle_id = (await _start(client, headers, date(2026, 8, 1))).json()["id"]
    resp = await _close(client, headers, cycle_id, date(2026, 8, 26))
    assert resp.status_code == 200
    assert resp.json()["daily_burn_rate"] == pytest.approx(0.568)


async def test_close_works_without_pipeline_module(client, citizen, monkeypatch):
    _, headers = citizen
    monkeypatch.setitem(sys.modules, "app.services.pipeline", None)  # makes the import raise ImportError
    cycle_id = (await _start(client, headers, date(2026, 8, 1))).json()["id"]
    assert (await _close(client, headers, cycle_id, date(2026, 8, 26))).status_code == 200


# --- current ---------------------------------------------------------------------------------


async def test_current_without_open_cycle_is_nulls(client, citizen):
    user, headers = citizen
    await _insert_closed(user["id"], date(2026, 8, 1), date(2026, 8, 26), 0.568)
    resp = await client.get(f"{BASE}/current", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == {"cycle": None, "prediction": None}


async def test_current_returns_prediction_with_exact_spec_keys(client, citizen):
    """Spec vector through the API: 14.2 kg started 20 days ago, no history."""
    _, headers = citizen
    cycle_id = (await _start(client, headers, date(2026, 9, 4))).json()["id"]

    resp = await client.get(f"{BASE}/current", headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["cycle"]["id"] == cycle_id
    assert body["cycle"]["is_open"] is True and body["cycle"]["days"] == 20

    prediction = body["prediction"]
    assert set(PREDICTION_KEYS) <= set(prediction)
    assert set(prediction) - set(PREDICTION_KEYS) <= ALLOWED_EXTRAS
    assert prediction["burn_rate_kg_per_day"] == pytest.approx(0.568)
    assert prediction["kg_remaining"] == pytest.approx(2.84)
    assert prediction["days_to_empty"] == 5
    assert prediction["estimated_finish_date"] == "2026-09-29"
    assert prediction["refill_alert_date"] == "2026-09-26"
    assert prediction["should_alert_now"] is False
    assert prediction["pct_remaining"] == pytest.approx(20.0)
    assert prediction["days_elapsed"] == 20


async def test_current_uses_closed_history_newest_first(client, citizen):
    _, headers = citizen
    first = (await _start(client, headers, date(2026, 7, 1))).json()["id"]
    assert (await _close(client, headers, first, date(2026, 7, 26))).status_code == 200  # 0.568
    second = (await _start(client, headers, date(2026, 7, 26))).json()["id"]
    assert (await _close(client, headers, second, date(2026, 8, 15))).status_code == 200  # 0.71
    assert (await _start(client, headers, date(2026, 9, 4))).status_code == 201

    prediction = (await client.get(f"{BASE}/current", headers=headers)).json()["prediction"]
    expected_rate = (0.568 + 0.71) / 2
    assert prediction["burn_rate_kg_per_day"] == pytest.approx(round(expected_rate, 3))
    assert prediction["kg_remaining"] == pytest.approx(round(14.2 - expected_rate * 20, 2))


async def test_current_averages_only_the_newest_three_closed_cycles(client, citizen):
    user, headers = citizen
    for i, rate in enumerate([0.9, 0.7, 0.6, 0.5]):  # oldest first; newest three are 0.7/0.6/0.5
        start = date(2026, 3, 1) + timedelta(days=30 * i)
        await _insert_closed(user["id"], start, start + timedelta(days=25), rate)
    assert (await _start(client, headers, date(2026, 9, 4))).status_code == 201

    prediction = (await client.get(f"{BASE}/current", headers=headers)).json()["prediction"]
    assert prediction["burn_rate_kg_per_day"] == pytest.approx(0.6)


async def test_current_alerts_when_finish_is_within_three_days(client, citizen):
    _, headers = citizen
    assert (await _start(client, headers, TODAY - timedelta(days=23))).status_code == 201
    prediction = (await client.get(f"{BASE}/current", headers=headers)).json()["prediction"]
    assert prediction["days_to_empty"] == 2
    assert prediction["should_alert_now"] is True


async def test_current_is_scoped_to_the_caller(client, citizen, make_user):
    _, headers = citizen
    _, other_headers = await make_user()
    assert (await _start(client, headers, date(2026, 9, 4))).status_code == 201
    assert (await client.get(f"{BASE}/current", headers=other_headers)).json() == {"cycle": None, "prediction": None}
