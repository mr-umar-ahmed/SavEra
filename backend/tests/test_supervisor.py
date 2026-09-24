"""Tests for the supervisor router (Phase 4).

Key assertions:
  - Citizen JWT gets 403 on every supervisor route.
  - No user_id, email, name or seeded UUID appears in any supervisor response.
  - household_count < 10 hides the ward from every response.
  - Ward anomaly flag fires correctly.
"""

from __future__ import annotations

import json
import re
import uuid
from datetime import date

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app import database
from app.deps import mint_hs256_token
from app.main import app

# The conftest.py already provides event_loop, a fresh database with migrations,
# and seed data.  We create our own users+tokens here for isolation.

from tests.conftest import TEST_JWT_SECRET

CITIZEN_UUID = uuid.UUID("00000000-0000-4000-a000-000000000ccc")
SUPER_UUID = uuid.UUID("00000000-0000-4000-a000-000000000ddd")
JWT_SECRET = TEST_JWT_SECRET


@pytest_asyncio.fixture
async def citizen_token() -> str:
    return mint_hs256_token(CITIZEN_UUID, "citizen_sv@test.local", secret=JWT_SECRET)


@pytest_asyncio.fixture
async def supervisor_token() -> str:
    return mint_hs256_token(SUPER_UUID, "supervisor_sv@test.local", secret=JWT_SECRET)


@pytest_asyncio.fixture(autouse=True)
async def seed_supervisor_data():
    """Seed a supervisor user, a ward with 12 households, and ward_aggregates."""
    # Wards
    await database.execute(
        "INSERT INTO wards (name, city) VALUES ($1, $2) ON CONFLICT (city, name) DO NOTHING",
        "TestWard", "Bengaluru",
    )
    ward = await database.fetchrow("SELECT id FROM wards WHERE name = 'TestWard'")
    ward_id = ward["id"]

    # Citizen user
    await database.execute(
        """INSERT INTO users (id, email, role, ward_id) VALUES ($1, $2, 'citizen', $3)
           ON CONFLICT (id) DO UPDATE SET role = 'citizen', ward_id = $3""",
        CITIZEN_UUID, "citizen_sv@test.local", ward_id,
    )

    # Supervisor user
    await database.execute(
        """INSERT INTO users (id, email, role, ward_id) VALUES ($1, $2, 'supervisor', $3)
           ON CONFLICT (id) DO UPDATE SET role = 'supervisor', ward_id = $3""",
        SUPER_UUID, "supervisor_sv@test.local", ward_id,
    )

    # Ward aggregate with >= 10 households
    this_month = date.today().replace(day=1)
    from app.services.ward import month_end
    end = month_end(this_month)

    await database.execute(
        """INSERT INTO ward_aggregates
           (ward_id, resource_type, period_start, period_end,
            avg_consumption, total_consumption, household_count, avg_household_size,
            pct_change_vs_prev, anomaly_flag)
           VALUES ($1, 'electricity', $2, $3, 320.5, 3846.0, 12, 3.1, 15.2, FALSE)
           ON CONFLICT (ward_id, resource_type, period_start) DO UPDATE SET
             avg_consumption = EXCLUDED.avg_consumption,
             household_count = EXCLUDED.household_count""",
        ward_id, this_month, end,
    )

    # Also one with anomaly_flag = true
    await database.execute(
        """INSERT INTO ward_aggregates
           (ward_id, resource_type, period_start, period_end,
            avg_consumption, total_consumption, household_count, avg_household_size,
            pct_change_vs_prev, anomaly_flag)
           VALUES ($1, 'water', $2, $3, 550.0, 6600.0, 12, 3.1, 28.5, TRUE)
           ON CONFLICT (ward_id, resource_type, period_start) DO UPDATE SET
             avg_consumption = EXCLUDED.avg_consumption,
             anomaly_flag = TRUE""",
        ward_id, this_month, end,
    )

    # Also one ward with household_count < 10 (should be hidden)
    await database.execute(
        "INSERT INTO wards (name, city) VALUES ($1, $2) ON CONFLICT (city, name) DO NOTHING",
        "SmallWard", "Bengaluru",
    )
    small_ward = await database.fetchrow("SELECT id FROM wards WHERE name = 'SmallWard'")
    await database.execute(
        """INSERT INTO ward_aggregates
           (ward_id, resource_type, period_start, period_end,
            avg_consumption, total_consumption, household_count, avg_household_size,
            pct_change_vs_prev, anomaly_flag)
           VALUES ($1, 'electricity', $2, $3, 250.0, 1250.0, 5, 2.5, NULL, FALSE)
           ON CONFLICT (ward_id, resource_type, period_start) DO UPDATE SET
             household_count = 5""",
        small_ward["id"], this_month, end,
    )

    yield

    # Cleanup
    await database.execute("DELETE FROM ward_aggregates WHERE ward_id IN (SELECT id FROM wards WHERE name IN ('TestWard', 'SmallWard'))")
    await database.execute("DELETE FROM users WHERE id IN ($1, $2)", CITIZEN_UUID, SUPER_UUID)
    await database.execute("DELETE FROM wards WHERE name IN ('TestWard', 'SmallWard')")


# ──────────────────────────────────── 403 for citizen

@pytest.mark.asyncio
async def test_citizen_gets_403_on_supervisor_wards(client, citizen_token):
    r = await client.get("/api/v1/supervisor/wards", headers={"Authorization": f"Bearer {citizen_token}"})
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_citizen_gets_403_on_heatmap(client, citizen_token):
    r = await client.get("/api/v1/supervisor/wards/1/heatmap", headers={"Authorization": f"Bearer {citizen_token}"})
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_citizen_gets_403_on_anomalies(client, citizen_token):
    r = await client.get("/api/v1/supervisor/anomalies", headers={"Authorization": f"Bearer {citizen_token}"})
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_citizen_gets_403_on_comparison(client, citizen_token):
    r = await client.get("/api/v1/supervisor/comparison", headers={"Authorization": f"Bearer {citizen_token}"})
    assert r.status_code == 403


# ──────────────────────────────────── supervisor access

@pytest.mark.asyncio
async def test_supervisor_wards(client, supervisor_token):
    r = await client.get("/api/v1/supervisor/wards", headers={"Authorization": f"Bearer {supervisor_token}"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    # Should include TestWard and SmallWard (ward listing is not filtered by household count)
    names = {w["name"] for w in data}
    assert "TestWard" in names


@pytest.mark.asyncio
async def test_supervisor_heatmap(client, supervisor_token):
    ward = await database.fetchrow("SELECT id FROM wards WHERE name = 'TestWard'")
    r = await client.get(
        f"/api/v1/supervisor/wards/{ward['id']}/heatmap",
        headers={"Authorization": f"Bearer {supervisor_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ward_name"] == "TestWard"
    # Only resources with >= 10 households
    for res in data["resources"]:
        assert res["household_count"] >= 10


@pytest.mark.asyncio
async def test_supervisor_anomalies(client, supervisor_token):
    r = await client.get("/api/v1/supervisor/anomalies", headers={"Authorization": f"Bearer {supervisor_token}"})
    assert r.status_code == 200
    data = r.json()
    flagged = [a for a in data if a["ward_name"] == "TestWard" and a["resource_type"] == "water"]
    assert len(flagged) >= 1
    assert flagged[0]["avg_consumption"] == 550.0


@pytest.mark.asyncio
async def test_supervisor_comparison(client, supervisor_token):
    r = await client.get(
        "/api/v1/supervisor/comparison?resource=electricity",
        headers={"Authorization": f"Bearer {supervisor_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    for ward in data:
        assert ward["household_count"] >= 10


# ──────────────────────────────────── privacy: no PII

def _find_pii_in(obj, pii_patterns: list[str]) -> list[str]:
    """Recursively search JSON for PII patterns."""
    text = json.dumps(obj)
    found = []
    for pattern in pii_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            found.append(pattern)
    return found


@pytest.mark.asyncio
async def test_no_pii_in_supervisor_responses(client, supervisor_token):
    """No user_id, email, name or seeded UUID appears in any supervisor response."""
    pii = [
        str(CITIZEN_UUID),
        str(SUPER_UUID),
        "citizen_sv@test.local",
        "supervisor_sv@test.local",
        "user_id",
    ]

    ward = await database.fetchrow("SELECT id FROM wards WHERE name = 'TestWard'")
    endpoints = [
        "/api/v1/supervisor/wards",
        f"/api/v1/supervisor/wards/{ward['id']}/heatmap",
        "/api/v1/supervisor/anomalies",
        "/api/v1/supervisor/comparison?resource=electricity",
    ]

    for url in endpoints:
        r = await client.get(url, headers={"Authorization": f"Bearer {supervisor_token}"})
        assert r.status_code == 200
        found = _find_pii_in(r.json(), pii)
        assert found == [], f"PII found in {url}: {found}"


# ──────────────────────────────────── privacy: household_count < 10 hidden

@pytest.mark.asyncio
async def test_small_ward_hidden_from_heatmap(client, supervisor_token):
    small_ward = await database.fetchrow("SELECT id FROM wards WHERE name = 'SmallWard'")
    r = await client.get(
        f"/api/v1/supervisor/wards/{small_ward['id']}/heatmap",
        headers={"Authorization": f"Bearer {supervisor_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    # Resources list should be empty (household_count < 10)
    assert len(data["resources"]) == 0


@pytest.mark.asyncio
async def test_small_ward_hidden_from_comparison(client, supervisor_token):
    r = await client.get(
        "/api/v1/supervisor/comparison?resource=electricity",
        headers={"Authorization": f"Bearer {supervisor_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    names = {w["ward_name"] for w in data}
    assert "SmallWard" not in names


# ──────────────────────────────────── source-level: no per-user tables

def test_supervisor_router_does_not_name_per_user_tables():
    """The supervisor router must never directly query per-user tables."""
    import inspect
    import app.routers.supervisor as mod

    source = inspect.getsource(mod)
    per_user_tables = [
        "electricity_readings",
        "water_readings",
        "lpg_cycles",
        "baselines",
        "alerts",
        "green_scores",
        "appliances",
    ]
    for table in per_user_tables:
        assert table not in source, (
            f"supervisor.py references per-user table '{table}' — "
            f"only ward_aggregates and wards should be queried"
        )
