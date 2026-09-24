"""Phase 1 gate: migrations run clean on a fresh DB (the session fixture drops + recreates it)."""

from __future__ import annotations

from app import database

EXPECTED_TABLES = {
    "wards", "users", "appliances", "electricity_readings", "water_readings", "lpg_cycles",
    "baselines", "alerts", "green_scores", "ward_aggregates", "ocr_jobs",
}


async def test_all_tables_exist(db):
    rows = await database.fetch(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'alembic_version'"
    )
    assert {r["tablename"] for r in rows} == EXPECTED_TABLES


async def test_hypertables_created(db):
    rows = await database.fetch("SELECT hypertable_name FROM timescaledb_information.hypertables")
    assert {r["hypertable_name"] for r in rows} == {"electricity_readings", "water_readings"}


async def test_alembic_is_at_head(db):
    versions = await database.fetch("SELECT version_num FROM alembic_version")
    assert [v["version_num"] for v in versions] == ["0002"]


async def test_single_open_lpg_cycle_enforced(db, make_user):
    user, _ = await make_user()
    await database.execute(
        "INSERT INTO lpg_cycles (user_id, start_date) VALUES ($1, DATE '2026-09-01')", user["id"]
    )
    inserted = await database.fetchval(
        """
        INSERT INTO lpg_cycles (user_id, start_date) VALUES ($1, DATE '2026-09-10')
        ON CONFLICT (user_id) WHERE end_date IS NULL DO NOTHING RETURNING id
        """,
        user["id"],
    )
    assert inserted is None
    assert await database.fetchval("SELECT COUNT(*) FROM lpg_cycles WHERE user_id = $1", user["id"]) == 1


async def test_readings_upsert_targets(db, make_user):
    user, _ = await make_user()
    for _ in range(2):  # second insert must hit ON CONFLICT, not duplicate
        await database.execute(
            """
            INSERT INTO electricity_readings (user_id, kwh, billing_period_start, billing_period_end)
            VALUES ($1, 300, DATE '2026-08-01', DATE '2026-08-31')
            ON CONFLICT (user_id, billing_period_start) DO UPDATE SET kwh = EXCLUDED.kwh
            """,
            user["id"],
        )
        await database.execute(
            """
            INSERT INTO water_readings (user_id, liters, reading_date)
            VALUES ($1, 400, DATE '2026-08-01')
            ON CONFLICT (user_id, reading_date) DO UPDATE SET liters = EXCLUDED.liters
            """,
            user["id"],
        )
    assert await database.fetchval("SELECT COUNT(*) FROM electricity_readings") == 1
    assert await database.fetchval("SELECT COUNT(*) FROM water_readings") == 1


async def test_email_uniqueness_is_case_insensitive(db, make_user):
    import asyncpg
    import pytest

    await make_user(email="Same@Example.com")
    with pytest.raises(asyncpg.UniqueViolationError):
        await make_user(email="same@example.com")
