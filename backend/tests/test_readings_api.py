"""Electricity and water reading API against the real test DB (Phase 1 acceptance:
"can save electricity, water and LPG readings via API").

``_today`` is pinned to 2026-09-24 so future-date rejection is deterministic.
"""

from __future__ import annotations

import sys
import types
import uuid
from datetime import date, timedelta

import pytest

from app import database
from app.routers import readings as readings_router

TODAY = date(2026, 9, 24)
BASE = "/api/v1/readings"


@pytest.fixture(autouse=True)
def frozen_today(monkeypatch):
    monkeypatch.setattr(readings_router, "_today", lambda: TODAY)
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


def _bill(
    kwh: float = 300.0,
    start: date = date(2026, 8, 1),
    end: date = date(2026, 8, 31),
    **extra,
) -> dict:
    return {
        "kwh": kwh,
        "billing_period_start": start.isoformat(),
        "billing_period_end": end.isoformat(),
        **extra,
    }


async def _post_bill(client, headers, **kwargs):
    query = kwargs.pop("query", "")
    return await client.post(f"{BASE}/electricity{query}", json=_bill(**kwargs), headers=headers)


async def _post_water(client, headers, liters: float = 400.0, day: date = date(2026, 9, 20)):
    return await client.post(
        f"{BASE}/water",
        json={"liters": liters, "reading_date": day.isoformat()},
        headers=headers,
    )


# ------------------------------------------------------------------------ electricity


async def test_save_and_list_a_bill(client, citizen):
    _, headers = citizen
    response = await _post_bill(client, headers, kwh=342.0)
    assert response.status_code == 201, response.text
    created = response.json()
    assert created["kwh"] == 342.0
    assert created["billing_days"] == 31
    assert created["kwh_per_30d"] == 330.97  # 342 / 31 * 30
    assert created["source"] == "manual"
    assert created["bill_image_url"] is None

    listed = await client.get(f"{BASE}/electricity", headers=headers)
    assert listed.status_code == 200
    assert [r["id"] for r in listed.json()] == [created["id"]]


async def test_bills_are_listed_newest_period_first(client, citizen):
    _, headers = citizen
    for month in (4, 5, 6):
        start = date(2026, month, 1)
        end = date(2026, month, 30 if month != 5 else 31)
        assert (await _post_bill(client, headers, start=start, end=end)).status_code == 201

    rows = (await client.get(f"{BASE}/electricity", headers=headers)).json()
    assert [r["billing_period_start"] for r in rows] == ["2026-06-01", "2026-05-01", "2026-04-01"]

    limited = (await client.get(f"{BASE}/electricity?limit=2", headers=headers)).json()
    assert len(limited) == 2


async def test_overlapping_period_is_rejected_with_409(client, citizen):
    _, headers = citizen
    assert (await _post_bill(client, headers)).status_code == 201

    exact = await _post_bill(client, headers, kwh=310.0)
    assert exact.status_code == 409

    # a *partial* overlap is caught too, not just an identical start date
    partial = await _post_bill(
        client, headers, kwh=310.0, start=date(2026, 8, 15), end=date(2026, 9, 14)
    )
    assert partial.status_code == 409
    assert "overwrite=true" in partial.json()["detail"]


async def test_adjacent_periods_do_not_overlap(client, citizen):
    _, headers = citizen
    assert (await _post_bill(client, headers)).status_code == 201
    following = await _post_bill(
        client, headers, start=date(2026, 9, 1), end=date(2026, 9, 24)
    )
    assert following.status_code == 201


async def test_overwrite_replaces_every_overlapping_bill(client, citizen):
    user, headers = citizen
    assert (await _post_bill(client, headers, start=date(2026, 7, 1), end=date(2026, 7, 31))).status_code == 201
    assert (await _post_bill(client, headers, start=date(2026, 8, 1), end=date(2026, 8, 31))).status_code == 201

    replacement = await _post_bill(
        client,
        headers,
        kwh=620.0,
        start=date(2026, 7, 1),
        end=date(2026, 8, 31),
        query="?overwrite=true",
    )
    assert replacement.status_code == 201
    rows = (await client.get(f"{BASE}/electricity", headers=headers)).json()
    assert len(rows) == 1 and rows[0]["kwh"] == 620.0
    assert await database.fetchval(
        "SELECT COUNT(*) FROM electricity_readings WHERE user_id = $1", user["id"]
    ) == 1


async def test_future_and_invalid_periods_are_rejected(client, citizen):
    _, headers = citizen
    future = await _post_bill(
        client, headers, start=date(2026, 9, 1), end=TODAY + timedelta(days=1)
    )
    assert future.status_code == 422

    reversed_period = await _post_bill(
        client, headers, start=date(2026, 8, 31), end=date(2026, 8, 1)
    )
    assert reversed_period.status_code == 422

    too_long = await _post_bill(client, headers, start=date(2026, 1, 1), end=date(2026, 8, 31))
    assert too_long.status_code == 422


@pytest.mark.parametrize("kwh", [0, -5, 5001])
async def test_out_of_range_kwh_is_rejected(client, citizen, kwh):
    _, headers = citizen
    assert (await _post_bill(client, headers, kwh=kwh)).status_code == 422


async def test_delete_a_bill(client, citizen):
    _, headers = citizen
    created = (await _post_bill(client, headers)).json()
    assert (await client.delete(f"{BASE}/electricity/{created['id']}", headers=headers)).status_code == 204
    assert (await client.get(f"{BASE}/electricity", headers=headers)).json() == []
    assert (await client.delete(f"{BASE}/electricity/{created['id']}", headers=headers)).status_code == 404


async def test_unknown_ocr_job_is_rejected(client, citizen):
    _, headers = citizen
    response = await _post_bill(client, headers, ocr_job_id=str(uuid.uuid4()), source="ocr")
    assert response.status_code == 404


async def test_a_bill_saved_from_an_ocr_job_links_back_to_the_image(client, citizen):
    user, headers = citizen
    job_id = await database.fetchval(
        "INSERT INTO ocr_jobs (user_id, image_path, status) VALUES ($1, 'x.jpg', 'done') RETURNING id",
        user["id"],
    )
    created = (
        await _post_bill(client, headers, source="ocr", ocr_job_id=str(job_id))
    ).json()
    assert created["source"] == "ocr"
    assert created["bill_image_url"] == f"/bills/jobs/{job_id}/image"
    assert await database.fetchval("SELECT reading_id FROM ocr_jobs WHERE id = $1", job_id) == uuid.UUID(
        created["id"]
    )


# ------------------------------------------------------------------------------ water


async def test_save_and_list_water(client, citizen):
    _, headers = citizen
    response = await _post_water(client, headers, liters=418.5)
    assert response.status_code == 201, response.text
    created = response.json()
    assert created["liters"] == 418.5
    assert created["replaced"] is False

    rows = (await client.get(f"{BASE}/water", headers=headers)).json()
    assert [r["id"] for r in rows] == [created["id"]]


async def test_logging_the_same_day_twice_corrects_it(client, citizen):
    user, headers = citizen
    first = (await _post_water(client, headers, liters=400.0)).json()
    second = (await _post_water(client, headers, liters=455.0)).json()
    assert second["replaced"] is True
    assert second["id"] == first["id"]
    assert second["liters"] == 455.0
    assert await database.fetchval(
        "SELECT COUNT(*) FROM water_readings WHERE user_id = $1", user["id"]
    ) == 1


async def test_water_history_window_is_respected(client, citizen):
    _, headers = citizen
    for offset in (1, 30, 200):
        assert (
            await _post_water(client, headers, day=TODAY - timedelta(days=offset))
        ).status_code == 201

    assert len((await client.get(f"{BASE}/water?days=90", headers=headers)).json()) == 2
    assert len((await client.get(f"{BASE}/water?days=365", headers=headers)).json()) == 3
    rows = (await client.get(f"{BASE}/water?days=365", headers=headers)).json()
    assert rows[0]["reading_date"] > rows[-1]["reading_date"]  # newest first


async def test_water_cannot_be_logged_far_in_the_future(client, citizen):
    _, headers = citizen
    assert (await _post_water(client, headers, day=TODAY + timedelta(days=1))).status_code == 201
    late = await _post_water(client, headers, day=TODAY + timedelta(days=2))
    assert late.status_code == 422
    assert "tomorrow" in late.json()["detail"]


@pytest.mark.parametrize("liters", [0, -1, 50001])
async def test_out_of_range_liters_is_rejected(client, citizen, liters):
    _, headers = citizen
    assert (await _post_water(client, headers, liters=liters)).status_code == 422


async def test_delete_a_water_reading(client, citizen):
    _, headers = citizen
    created = (await _post_water(client, headers)).json()
    assert (await client.delete(f"{BASE}/water/{created['id']}", headers=headers)).status_code == 204
    assert (await client.get(f"{BASE}/water", headers=headers)).json() == []


# ------------------------------------------------------------- isolation and pipeline


async def test_readings_are_scoped_to_their_owner(client, make_user):
    _, mine = await make_user(email="mine@savera.test")
    _, theirs = await make_user(email="theirs@savera.test")

    bill = (await _post_bill(client, mine)).json()
    water = (await _post_water(client, mine)).json()

    assert (await client.get(f"{BASE}/electricity", headers=theirs)).json() == []
    assert (await client.get(f"{BASE}/water", headers=theirs)).json() == []
    assert (await client.delete(f"{BASE}/electricity/{bill['id']}", headers=theirs)).status_code == 404
    assert (await client.delete(f"{BASE}/water/{water['id']}", headers=theirs)).status_code == 404

    # ... and the owner's rows survived the other user's attempts
    assert len((await client.get(f"{BASE}/electricity", headers=mine)).json()) == 1
    assert len((await client.get(f"{BASE}/water", headers=mine)).json()) == 1


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/electricity"),
        ("post", "/electricity"),
        ("get", "/water"),
        ("post", "/water"),
    ],
)
async def test_every_route_requires_a_token(client, method, path):
    response = await client.request(method, f"{BASE}{path}", json={})
    assert response.status_code == 401


async def test_saving_a_reading_schedules_the_side_effect_pipeline(client, citizen, fake_pipeline):
    _, headers = citizen
    bill = (await _post_bill(client, headers)).json()
    water = (await _post_water(client, headers)).json()

    resources = {args[1] for args, _ in fake_pipeline}
    assert resources == {"electricity", "water"}
    ids = {str(args[2]) for args, _ in fake_pipeline}
    assert ids == {bill["id"], water["id"]}


async def test_a_failing_pipeline_never_breaks_the_save(client, citizen, monkeypatch):
    module = types.ModuleType("app.services.pipeline")

    async def run_post_reading_pipeline(*_args, **_kwargs):
        raise RuntimeError("weather service exploded")

    module.run_post_reading_pipeline = run_post_reading_pipeline
    monkeypatch.setitem(sys.modules, "app.services.pipeline", module)

    _, headers = citizen
    assert (await _post_bill(client, headers)).status_code == 201
    assert len((await client.get(f"{BASE}/electricity", headers=headers)).json()) == 1
