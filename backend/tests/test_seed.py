"""Seed script gate (Phase 1): three named users with six months of data, 39 fillers,
deterministic, re-runnable, and every seeded row satisfies the schema constraints.

Runs ``seed_data.test_users.seed_all`` against the test pool (``db`` fixture) exactly as the
CLI would, anchored on 2026-09-24.
"""

from __future__ import annotations

from datetime import date

from app import database
from seed_data import SEED_TODAY, seed_user_id
from seed_data.test_users import (
    FILLER_WARDS,
    NAMED_SLUGS,
    SPIKE_WARD,
    build_dataset,
    predict_open_cycle,
    seed_all,
    verify,
)

TODAY = date(2026, 9, 24)
COUNT_TABLES = ["wards", "users", "appliances", "electricity_readings", "water_readings", "lpg_cycles"]


async def _table_counts() -> dict[str, int]:
    return {t: await database.fetchval(f"SELECT COUNT(*) FROM {t}") for t in COUNT_TABLES}


async def _user_id(email: str):
    return await database.fetchval("SELECT id FROM users WHERE lower(email) = $1", email)


async def _count(table: str, user_id, extra: str = "") -> int:
    return await database.fetchval(f"SELECT COUNT(*) FROM {table} WHERE user_id = $1 {extra}", user_id)


async def _ward_month_avg(ward: str, month_start: date) -> float:
    return await database.fetchval(
        """
        SELECT AVG(w.liters)
        FROM water_readings w
        JOIN users u ON u.id = w.user_id
        JOIN wards wd ON wd.id = u.ward_id
        WHERE wd.name = $1
          AND w.reading_date >= $2
          AND w.reading_date < ($2 + INTERVAL '1 month')::date
        """,
        ward,
        month_start,
    )


def test_seed_today_constant_matches_plan():
    assert SEED_TODAY == TODAY


def test_build_dataset_is_deterministic():
    first = build_dataset(TODAY, 42)
    second = build_dataset(TODAY, 42)
    assert first == second
    assert build_dataset(TODAY, 7) != first  # the seed actually drives the filler generator
    assert [h.slug for h in first[:3]] == list(NAMED_SLUGS)
    assert len(first) == 3 + sum(n for _, n in FILLER_WARDS) == 42


async def test_seed_all_populates_named_users_and_fillers(db):
    counts = await seed_all(db, today=TODAY)
    assert counts["named_users"] == 3
    assert counts["filler_users"] == 39
    assert counts["users"] == 42
    assert counts["wards"] >= 30

    water_days: dict[str, int] = {}
    for slug in NAMED_SLUGS:
        uid = await _user_id(f"{slug}@savera.test")
        assert uid == seed_user_id(slug), slug
        assert await _count("electricity_readings", uid) == 6, slug
        assert await _count("lpg_cycles", uid) >= 3, slug
        assert await _count("lpg_cycles", uid, "AND end_date IS NULL") == 1, slug
        assert await _count("appliances", uid) >= 3, slug
        water_days[slug] = await _count("water_readings", uid)

    # Ananya and Deepa log every day; Rohan is the sparse logger (~40 % of days).
    assert water_days["ananya"] >= 150
    assert water_days["deepa"] >= 150
    assert water_days["ananya"] == water_days["deepa"]
    assert 0.25 * water_days["ananya"] <= water_days["rohan"] <= 0.55 * water_days["ananya"]

    fillers = await database.fetch(
        """
        SELECT wd.name AS ward, COUNT(*) AS n
        FROM users u JOIN wards wd ON wd.id = u.ward_id
        WHERE u.email LIKE 'filler-%@savera.test'
        GROUP BY wd.name
        """
    )
    assert {r["ward"]: r["n"] for r in fillers} == dict(FILLER_WARDS)
    assert sum(r["n"] for r in fillers) == 39

    # every filler has readings for all six months, water, and exactly one open cycle
    short = await database.fetchval(
        """
        SELECT COUNT(*) FROM users u
        WHERE u.email LIKE 'filler-%@savera.test'
          AND (SELECT COUNT(*) FROM electricity_readings e WHERE e.user_id = u.id) <> 6
        """
    )
    assert short == 0
    open_cycles = await database.fetchval(
        """
        SELECT COUNT(*) FROM users u
        WHERE u.email LIKE '%@savera.test'
          AND (SELECT COUNT(*) FROM lpg_cycles c WHERE c.user_id = u.id AND c.end_date IS NULL) <> 1
        """
    )
    assert open_cycles == 0


async def test_seed_all_is_idempotent(db):
    first = await seed_all(db, today=TODAY)
    before = await _table_counts()
    ananya = seed_user_id("ananya")
    ids_before = {
        r["id"]
        for r in await database.fetch("SELECT id FROM electricity_readings WHERE user_id = $1", ananya)
    }

    second = await seed_all(db, today=TODAY)
    after = await _table_counts()
    assert after == before
    assert second == first
    ids_after = {
        r["id"]
        for r in await database.fetch("SELECT id FROM electricity_readings WHERE user_id = $1", ananya)
    }
    assert ids_after == ids_before  # upserts keep the original reading ids


async def test_named_user_patterns(db):
    await seed_all(db, today=TODAY)

    async def bills(slug: str) -> list[float]:
        rows = await database.fetch(
            "SELECT kwh FROM electricity_readings WHERE user_id = $1 ORDER BY billing_period_start",
            seed_user_id(slug),
        )
        return [r["kwh"] for r in rows]

    # billing periods are whole calendar months Apr..Sep 2026
    periods = await database.fetch(
        """
        SELECT billing_period_start AS s, billing_period_end AS e
        FROM electricity_readings WHERE user_id = $1 ORDER BY billing_period_start
        """,
        seed_user_id("ananya"),
    )
    assert [(r["s"], r["e"]) for r in periods] == [
        (date(2026, 4, 1), date(2026, 4, 30)),
        (date(2026, 5, 1), date(2026, 5, 31)),
        (date(2026, 6, 1), date(2026, 6, 30)),
        (date(2026, 7, 1), date(2026, 7, 31)),
        (date(2026, 8, 1), date(2026, 8, 31)),
        (date(2026, 9, 1), date(2026, 9, 30)),
    ]

    ananya = await bills("ananya")
    mean = sum(ananya) / len(ananya)
    assert all(abs(k - mean) <= 12 for k in ananya)  # stable

    rohan = await bills("rohan")
    summer = sum(rohan[:2]) / 2
    later = sum(rohan[3:]) / 3
    assert summer >= 1.45 * later  # AC spike Apr-May, then a milestone-level drop

    deepa_june = await database.fetchval(
        """
        SELECT AVG(liters) FROM water_readings
        WHERE user_id = $1 AND reading_date BETWEEN DATE '2026-06-01' AND DATE '2026-06-30'
        """,
        seed_user_id("deepa"),
    )
    leak = await database.fetch(
        """
        SELECT liters FROM water_readings
        WHERE user_id = $1 AND reading_date BETWEEN DATE '2026-07-10' AND DATE '2026-07-19'
        ORDER BY reading_date
        """,
        seed_user_id("deepa"),
    )
    assert len(leak) == 10
    assert all(r["liters"] >= 2.4 * deepa_june for r in leak)  # ~400 -> ~1,100 L/day
    assert 330 <= deepa_june <= 470

    # Rohan has ACs in his appliance profile
    ac_types = await database.fetch(
        "SELECT type FROM appliances WHERE user_id = $1 AND type LIKE 'ac_%'", seed_user_id("rohan")
    )
    assert len(ac_types) >= 1


async def test_lpg_open_cycle_states(db):
    await seed_all(db, today=TODAY)

    async def prediction(slug: str) -> dict:
        rows = await database.fetch(
            "SELECT start_date, end_date, daily_burn_rate FROM lpg_cycles WHERE user_id = $1 ORDER BY start_date",
            seed_user_id(slug),
        )
        open_cycles = [r for r in rows if r["end_date"] is None]
        assert len(open_cycles) == 1
        closed = [r for r in rows if r["end_date"] is not None]
        assert all(r["daily_burn_rate"] and r["daily_burn_rate"] > 0 for r in closed)
        rates = [r["daily_burn_rate"] for r in sorted(closed, key=lambda r: r["end_date"], reverse=True)]
        return predict_open_cycle(open_cycles[0]["start_date"], rates, TODAY)

    ananya = await prediction("ananya")  # refill due within days
    assert ananya["kg_remaining"] > 0
    assert ananya["should_alert_now"] is True
    assert ananya["days_to_empty"] <= 5

    rohan = await prediction("rohan")  # forgot to close it: overdue
    assert rohan["kg_remaining"] == 0

    deepa = await prediction("deepa")  # plenty left, no alert
    assert deepa["should_alert_now"] is False
    assert deepa["kg_remaining"] > 5

    # cycle counts per the plan: 5 + open, 5 + open, 4 + open
    for slug, expected in (("ananya", 6), ("rohan", 6), ("deepa", 5)):
        assert await _count("lpg_cycles", seed_user_id(slug)) == expected, slug


async def test_indiranagar_august_water_spike(db):
    await seed_all(db, today=TODAY)
    jul = await _ward_month_avg(SPIKE_WARD, date(2026, 7, 1))
    aug = await _ward_month_avg(SPIKE_WARD, date(2026, 8, 1))
    assert aug >= 1.3 * jul

    # control ward: no spike
    jul_k = await _ward_month_avg("Koramangala", date(2026, 7, 1))
    aug_k = await _ward_month_avg("Koramangala", date(2026, 8, 1))
    assert 0.9 * jul_k <= aug_k <= 1.1 * jul_k

    # ward household counts: three wards >= 10 households, Whitefield below the privacy floor
    rows = await database.fetch(
        """
        SELECT wd.name AS ward, COUNT(DISTINCT u.id) AS n
        FROM users u JOIN wards wd ON wd.id = u.ward_id
        WHERE u.email LIKE '%@savera.test'
        GROUP BY wd.name
        """
    )
    by_ward = {r["ward"]: r["n"] for r in rows}
    assert by_ward == {"Koramangala": 13, "Indiranagar": 13, "Jayanagar": 13, "Whitefield": 3}


async def test_seeded_rows_satisfy_schema_constraints(db):
    await seed_all(db, today=TODAY)  # any CHECK violation would have raised here
    assert await database.fetchval("SELECT MIN(liters) FROM water_readings") > 0
    assert await database.fetchval("SELECT MIN(kwh) FROM electricity_readings") > 0
    assert await database.fetchval("SELECT MAX(kwh) FROM electricity_readings") <= 5000
    assert (
        await database.fetchval(
            "SELECT COUNT(*) FROM electricity_readings WHERE billing_period_end < billing_period_start"
        )
        == 0
    )
    assert (
        await database.fetchval(
            "SELECT COUNT(*) FROM lpg_cycles WHERE (end_date IS NULL) <> (daily_burn_rate IS NULL)"
        )
        == 0
    )
    assert await database.fetchval("SELECT MIN(household_size) FROM users") >= 1
    assert await database.fetchval("SELECT MAX(household_size) FROM users") <= 6
    # filler ranges from the plan: 180-420 kWh/month
    lo, hi = await database.fetchrow(
        """
        SELECT MIN(kwh), MAX(kwh) FROM electricity_readings e
        JOIN users u ON u.id = e.user_id WHERE u.email LIKE 'filler-%@savera.test'
        """
    )
    assert 180 <= lo and hi <= 420


async def test_verify_passes_on_fresh_seed(db, capsys):
    await seed_all(db, today=TODAY)
    report = await verify(db, today=TODAY)
    assert report["failures"] == []
    assert report["named"]["ananya"]["electricity"] == 6
    assert report["fillers"] == 39
    out = capsys.readouterr().out
    assert "ananya@savera.test" in out and "OK" in out


async def test_reset_deletes_only_seed_rows(db, make_user):
    keep, _ = await make_user(email="keep@example.com")
    await database.execute(
        """
        INSERT INTO water_readings (user_id, liters, reading_date) VALUES ($1, 321, DATE '2026-09-01')
        """,
        keep["id"],
    )
    await seed_all(db, today=TODAY)
    before = await _table_counts()

    counts = await seed_all(db, today=TODAY, reset=True)
    assert counts["users"] == 42
    assert await _table_counts() == before
    assert await database.fetchval("SELECT COUNT(*) FROM users WHERE id = $1", keep["id"]) == 1
    assert await _count("water_readings", keep["id"]) == 1
