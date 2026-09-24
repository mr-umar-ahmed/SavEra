"""Demo households with six months of readings (docs/PHASE0_PLAN.md section 8).

    python -m seed_data.test_users                 # seed against DATABASE_URL
    python -m seed_data.test_users --reset         # delete the seeded rows first
    python -m seed_data.test_users --verify        # re-check an already seeded database
    python -m seed_data.test_users --seed 7 --today 2026-09-24

Three named households carry the demo story, and 39 filler households give the wards enough
members for the >= 10 privacy floor to open up (Whitefield deliberately stays at 3 so the
"not enough households" path is reachable):

    ananya  Koramangala  steady 300 kWh bills, ~380 L/day, refill due in days
    rohan   Indiranagar  Apr-May AC spike falling to ~330 by Jul-Sep, cylinder left open (overdue)
    deepa   Jayanagar    ~400 L/day with a 10-day, ~1,100 L/day leak in July

Everything is reproducible and re-runnable:

* ids are ``uuid5`` of a stable key, so a second run upserts the same rows rather than
  duplicating them (``test_seed.py`` asserts the reading ids never change);
* the named households use fixed figures, the fillers come from ``random.Random(seed)``;
* ``today`` defaults to ``SEED_TODAY`` (2026-09-24) so LPG cycle states — the one thing that
  drifts with the clock — are identical on every machine.

Nothing here writes alerts, baselines or ward aggregates: those are computed by the Phase 2
pipeline from exactly this data. ``verify()`` checks the *conditions* that should make them
fire. The supervisor demo account belongs to the Phase 4 supervisor work, not here.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from dataclasses import dataclass
from datetime import date, timedelta
from random import Random
from typing import Any
from uuid import UUID

import asyncpg

from app.services.lpg import close_cycle, predict_finish
from seed_data import SEED_EMAIL_DOMAIN, SEED_TODAY, seed_user_id, seed_uuid
from seed_data.wards import seed_wards

DEFAULT_SEED = 42
MONTHS = 6
DEFAULT_CYLINDER_KG = 14.2

#: Named demo households, in the order ``build_dataset`` returns them.
NAMED_SLUGS: tuple[str, ...] = ("ananya", "rohan", "deepa")

#: Filler households per ward. Whitefield stays under the 10-household privacy floor.
FILLER_WARDS: tuple[tuple[str, int], ...] = (
    ("Koramangala", 12),
    ("Indiranagar", 12),
    ("Jayanagar", 12),
    ("Whitefield", 3),
)

#: The ward whose August water is inflated so a ward-level anomaly is reachable in Phase 4.
SPIKE_WARD = "Indiranagar"
SPIKE_MONTH = 8
SPIKE_FACTOR = 1.45

# Bengaluru domestic tariff, roughly: a fixed charge plus a flat per-unit rate. Only ever
# used to fill `billed_amount` with a believable number for the UI.
TARIFF_FIXED = 120.0
TARIFF_PER_KWH = 7.5

FILLER_KWH_MIN, FILLER_KWH_MAX = 180.0, 420.0


# --------------------------------------------------------------------------- dataset


@dataclass(frozen=True, slots=True)
class ApplianceSeed:
    type: str
    count: int
    daily_hours: float
    star_rating: int | None = None


@dataclass(frozen=True, slots=True)
class LpgSeed:
    start_date: date
    end_date: date | None
    cylinder_kg: float = DEFAULT_CYLINDER_KG

    @property
    def burn_rate(self) -> float | None:
        if self.end_date is None:
            return None
        return close_cycle(
            {
                "cylinder_kg": self.cylinder_kg,
                "start_date": self.start_date,
                "end_date": self.end_date,
            }
        )


@dataclass(frozen=True, slots=True)
class Household:
    """One seeded household. Frozen and tuple-valued so two builds compare equal."""

    slug: str
    email: str
    name: str
    ward: str
    household_size: int
    electricity: tuple[tuple[date, date, float], ...]  # (period_start, period_end, kwh)
    water: tuple[tuple[date, float], ...]
    lpg: tuple[LpgSeed, ...]
    appliances: tuple[ApplianceSeed, ...]
    is_named: bool

    @property
    def user_id(self) -> UUID:
        return seed_user_id(self.slug)


def month_start(day: date) -> date:
    return day.replace(day=1)


def add_months(day: date, months: int) -> date:
    total = day.year * 12 + (day.month - 1) + months
    return date(total // 12, total % 12 + 1, 1)


def month_end(day: date) -> date:
    return add_months(month_start(day), 1) - timedelta(days=1)


def billing_months(today: date, count: int = MONTHS) -> list[tuple[date, date]]:
    """The `count` whole calendar months ending with the month `today` falls in."""
    last = month_start(today)
    return [
        (start, month_end(start)) for start in (add_months(last, -i) for i in range(count - 1, -1, -1))
    ]


def water_dates(today: date, count: int = MONTHS) -> list[date]:
    """Every day from the start of the six-month window up to and including `today`."""
    first = billing_months(today, count)[0][0]
    return [first + timedelta(days=i) for i in range((today - first).days + 1)]


def _bill_amount(kwh: float) -> float:
    return round(TARIFF_FIXED + kwh * TARIFF_PER_KWH, 2)


def _lpg_chain(today: date, *, elapsed: int, cycle_days: int, closed: int) -> tuple[LpgSeed, ...]:
    """`closed` back-to-back finished cylinders, then one opened `elapsed` days ago."""
    open_start = today - timedelta(days=elapsed)
    cycles = [LpgSeed(start_date=open_start, end_date=None)]
    end = open_start
    for _ in range(closed):
        start = end - timedelta(days=cycle_days)
        cycles.append(LpgSeed(start_date=start, end_date=end))
        end = start
    return tuple(reversed(cycles))


def _seasonal_water(base: float, day: date, jitter: float, ward: str) -> float:
    value = base + jitter
    if ward == SPIKE_WARD and day.month == SPIKE_MONTH:
        value *= SPIKE_FACTOR
    return round(value, 1)


# ------------------------------------------------------------------- named households


def _ananya(today: date) -> Household:
    """Stable on everything; her open cylinder is days from empty (refill_due_soon)."""
    months = billing_months(today)
    kwh = (298.0, 305.0, 296.0, 309.0, 301.0, 294.0)  # mean 300.5, spread +-6
    water = tuple(
        (day, _seasonal_water(380.0, day, ((i * 7) % 13) - 6, "Koramangala"))
        for i, day in enumerate(water_dates(today))
    )
    return Household(
        slug="ananya",
        email=f"ananya@{SEED_EMAIL_DOMAIN}",
        name="Ananya Rao",
        ward="Koramangala",
        household_size=4,
        electricity=tuple((s, e, k) for (s, e), k in zip(months, kwh, strict=True)),
        water=water,
        # 31-day cylinders; opened 29 days ago -> ~1 day of gas left, alert window open.
        lpg=_lpg_chain(today, elapsed=29, cycle_days=31, closed=5),
        appliances=(
            ApplianceSeed("refrigerator", 1, 24.0, 4),
            ApplianceSeed("ceiling_fan", 3, 8.0),
            ApplianceSeed("tv_led_40", 1, 4.0),
            ApplianceSeed("geyser", 1, 0.5),
        ),
        is_named=True,
    )


def _rohan(today: date) -> Household:
    """Apr-May air-conditioning spike that falls away; forgot to close his cylinder."""
    months = billing_months(today)
    kwh = (495.0, 510.0, 410.0, 335.0, 330.0, 325.0)  # Apr-May ~1.52x Jul-Sep
    days = water_dates(today)
    water = tuple(
        (day, _seasonal_water(360.0, day, ((i * 11) % 15) - 7, SPIKE_WARD))
        for i, day in enumerate(days)
        if i % 5 in (0, 1)  # a sparse logger: ~40 % of days
    )
    return Household(
        slug="rohan",
        email=f"rohan@{SEED_EMAIL_DOMAIN}",
        name="Rohan Mehta",
        ward=SPIKE_WARD,
        household_size=3,
        electricity=tuple((s, e, k) for (s, e), k in zip(months, kwh, strict=True)),
        water=water,
        # 28-day cylinders; open for 40 days -> already past empty (refill_overdue).
        lpg=_lpg_chain(today, elapsed=40, cycle_days=28, closed=5),
        appliances=(
            ApplianceSeed("ac_1.5ton", 1, 6.0, 3),
            ApplianceSeed("refrigerator", 1, 24.0, 3),
            ApplianceSeed("ceiling_fan", 2, 6.0),
            ApplianceSeed("tv_led_55", 1, 3.0),
            ApplianceSeed("washing_machine", 1, 1.0, 4),
        ),
        is_named=True,
    )


def _deepa(today: date) -> Household:
    """Steady until a ten-day leak in July nearly triples her daily litres."""
    months = billing_months(today)
    kwh = (262.0, 271.0, 258.0, 266.0, 269.0, 255.0)
    year = month_start(today).year
    leak_start = date(year, 7, 10)
    leak_days = {leak_start + timedelta(days=i) for i in range(10)}
    water = []
    for i, day in enumerate(water_dates(today)):
        jitter = ((i * 7) % 11) - 5
        litres = 1100.0 + jitter * 4 if day in leak_days else 400.0 + jitter
        water.append((day, _seasonal_water(litres, day, 0.0, "Jayanagar")))
    return Household(
        slug="deepa",
        email=f"deepa@{SEED_EMAIL_DOMAIN}",
        name="Deepa Nair",
        ward="Jayanagar",
        household_size=5,
        electricity=tuple((s, e, k) for (s, e), k in zip(months, kwh, strict=True)),
        water=tuple(water),
        # 35-day cylinders; opened 12 days ago -> roughly two thirds left, no alert.
        lpg=_lpg_chain(today, elapsed=12, cycle_days=35, closed=4),
        appliances=(
            ApplianceSeed("refrigerator", 1, 24.0, 2),
            ApplianceSeed("ceiling_fan", 4, 9.0),
            ApplianceSeed("geyser", 1, 0.5),
            ApplianceSeed("washing_machine", 1, 1.5, 3),
        ),
        is_named=True,
    )


_NAMED_BUILDERS = {"ananya": _ananya, "rohan": _rohan, "deepa": _deepa}


# ------------------------------------------------------------------ filler households


def _filler(index: int, ward: str, today: date, rng: Random) -> Household:
    """A readings-only household: no login, just enough data to make a ward average real."""
    slug = f"filler-{index:02d}"
    months = billing_months(today)
    base_kwh = rng.uniform(210.0, 390.0)
    electricity = tuple(
        (start, end, min(FILLER_KWH_MAX, max(FILLER_KWH_MIN, round(base_kwh * rng.uniform(0.93, 1.07), 1))))
        for start, end in months
    )
    base_litres = rng.uniform(280.0, 460.0)
    water = tuple(
        (day, _seasonal_water(base_litres * rng.uniform(0.92, 1.08), day, 0.0, ward))
        for day in water_dates(today)
    )
    cycle_days = rng.randint(26, 40)
    household = Household(
        slug=slug,
        email=f"{slug}@{SEED_EMAIL_DOMAIN}",
        name=f"Household {index:02d}",
        ward=ward,
        household_size=rng.randint(1, 6),
        electricity=electricity,
        water=water,
        lpg=_lpg_chain(today, elapsed=rng.randint(2, 24), cycle_days=cycle_days, closed=2),
        appliances=(
            ApplianceSeed("refrigerator", 1, 24.0, rng.randint(2, 5)),
            ApplianceSeed("ceiling_fan", rng.randint(1, 4), float(rng.randint(4, 10))),
        ),
        is_named=False,
    )
    return household


def build_dataset(today: date | None = None, seed: int = DEFAULT_SEED) -> list[Household]:
    """The complete demo dataset: three named households then 39 fillers, in ward order."""
    today = today or SEED_TODAY
    households = [_NAMED_BUILDERS[slug](today) for slug in NAMED_SLUGS]
    rng = Random(seed)
    index = 1
    for ward, count in FILLER_WARDS:
        for _ in range(count):
            households.append(_filler(index, ward, today, rng))
            index += 1
    return households


def predict_open_cycle(
    start_date: date,
    burn_rates: list[float] | tuple[float, ...],
    today: date | None = None,
    cylinder_kg: float = DEFAULT_CYLINDER_KG,
) -> dict[str, Any]:
    """``predict_finish`` for a seeded open cylinder, given its closed cycles' rates."""
    return predict_finish(
        {"cylinder_kg": cylinder_kg, "start_date": start_date},
        [{"daily_burn_rate": rate} for rate in burn_rates],
        today=today,
    )


# ---------------------------------------------------------------------------- writing

_USER_SQL = """
INSERT INTO users (id, email, name, ward_id, household_size, city, role)
VALUES ($1, $2, $3, $4, $5, 'Bengaluru', 'citizen')
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email, name = EXCLUDED.name, ward_id = EXCLUDED.ward_id,
    household_size = EXCLUDED.household_size
"""
_APPLIANCE_SQL = """
INSERT INTO appliances (id, user_id, type, count, daily_hours, star_rating)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (user_id, type) DO UPDATE
SET count = EXCLUDED.count, daily_hours = EXCLUDED.daily_hours,
    star_rating = EXCLUDED.star_rating
"""
_ELECTRICITY_SQL = """
INSERT INTO electricity_readings
    (id, user_id, kwh, billing_period_start, billing_period_end, billed_amount, source)
VALUES ($1, $2, $3, $4, $5, $6, 'manual')
ON CONFLICT (user_id, billing_period_start) DO UPDATE
SET kwh = EXCLUDED.kwh, billing_period_end = EXCLUDED.billing_period_end,
    billed_amount = EXCLUDED.billed_amount
"""
_WATER_SQL = """
INSERT INTO water_readings (id, user_id, liters, reading_date, source)
VALUES ($1, $2, $3, $4, 'manual')
ON CONFLICT (user_id, reading_date) DO UPDATE SET liters = EXCLUDED.liters
"""
_LPG_SQL = """
INSERT INTO lpg_cycles (id, user_id, cylinder_kg, start_date, end_date, daily_burn_rate)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (id) DO UPDATE
SET end_date = EXCLUDED.end_date, daily_burn_rate = EXCLUDED.daily_burn_rate
"""


async def _ward_ids(conn: asyncpg.Connection) -> dict[str, int]:
    rows = await conn.fetch("SELECT id, name FROM wards WHERE city = 'Bengaluru'")
    return {row["name"]: row["id"] for row in rows}


async def _write_household(
    conn: asyncpg.Connection, household: Household, ward_ids: dict[str, int]
) -> None:
    user_id = household.user_id
    await conn.execute(
        _USER_SQL,
        user_id,
        household.email,
        household.name,
        ward_ids.get(household.ward),
        household.household_size,
    )
    await conn.executemany(
        _APPLIANCE_SQL,
        [
            (
                seed_uuid("appliance", f"{household.slug}:{a.type}"),
                user_id,
                a.type,
                a.count,
                a.daily_hours,
                a.star_rating,
            )
            for a in household.appliances
        ],
    )
    await conn.executemany(
        _ELECTRICITY_SQL,
        [
            (
                seed_uuid("electricity", f"{household.slug}:{start.isoformat()}"),
                user_id,
                kwh,
                start,
                end,
                _bill_amount(kwh),
            )
            for start, end, kwh in household.electricity
        ],
    )
    await conn.executemany(
        _WATER_SQL,
        [
            (
                seed_uuid("water", f"{household.slug}:{day.isoformat()}"),
                user_id,
                litres,
                day,
            )
            for day, litres in household.water
        ],
    )
    await conn.executemany(
        _LPG_SQL,
        [
            (
                seed_uuid("lpg", f"{household.slug}:{cycle.start_date.isoformat()}"),
                user_id,
                cycle.cylinder_kg,
                cycle.start_date,
                cycle.end_date,
                cycle.burn_rate,
            )
            for cycle in household.lpg
        ],
    )


async def _reset(pool: asyncpg.Pool, households: list[Household]) -> int:
    """Delete exactly the seeded users (their readings cascade); nothing else is touched."""
    ids = [h.user_id for h in households]
    async with pool.acquire() as conn:
        deleted = await conn.fetchval(
            "WITH gone AS (DELETE FROM users WHERE id = ANY($1::uuid[]) RETURNING 1) "
            "SELECT COUNT(*) FROM gone",
            ids,
        )
    return int(deleted)


async def seed_all(
    pool: asyncpg.Pool,
    *,
    today: date | None = None,
    seed: int = DEFAULT_SEED,
    reset: bool = False,
) -> dict[str, int]:
    """Seed wards + every household. Safe to run repeatedly; returns a small count summary."""
    today = today or SEED_TODAY
    households = build_dataset(today, seed)
    ward_total = await seed_wards(pool)
    if reset:
        await _reset(pool, households)

    async with pool.acquire() as conn:
        async with conn.transaction():
            ward_ids = await _ward_ids(conn)
            missing = {h.ward for h in households} - set(ward_ids)
            if missing:
                raise RuntimeError(f"wards.sql is missing seeded ward(s): {sorted(missing)}")
            for household in households:
                await _write_household(conn, household, ward_ids)

    named = sum(1 for h in households if h.is_named)
    return {
        "wards": ward_total,
        "named_users": named,
        "filler_users": len(households) - named,
        "users": len(households),
        "electricity_readings": sum(len(h.electricity) for h in households),
        "water_readings": sum(len(h.water) for h in households),
        "lpg_cycles": sum(len(h.lpg) for h in households),
        "appliances": sum(len(h.appliances) for h in households),
    }


# --------------------------------------------------------------------------- verifying


async def verify(
    pool: asyncpg.Pool, *, today: date | None = None, seed: int = DEFAULT_SEED
) -> dict[str, Any]:
    """Re-read the database and assert the demo story actually landed. Prints a report."""
    today = today or SEED_TODAY
    households = build_dataset(today, seed)
    expected = {h.slug: h for h in households}
    failures: list[str] = []
    named: dict[str, dict[str, Any]] = {}

    async with pool.acquire() as conn:
        for slug in NAMED_SLUGS:
            household = expected[slug]
            user_id = household.user_id
            row = await conn.fetchrow(
                """
                SELECT
                  (SELECT COUNT(*) FROM electricity_readings WHERE user_id = u.id) AS electricity,
                  (SELECT COUNT(*) FROM water_readings      WHERE user_id = u.id) AS water,
                  (SELECT COUNT(*) FROM lpg_cycles          WHERE user_id = u.id) AS lpg,
                  (SELECT COUNT(*) FROM appliances          WHERE user_id = u.id) AS appliances,
                  u.email, w.name AS ward
                FROM users u LEFT JOIN wards w ON w.id = u.ward_id
                WHERE u.id = $1
                """,
                user_id,
            )
            if row is None:
                failures.append(f"{slug}: user row is missing")
                continue
            summary = dict(row)
            cycles = await conn.fetch(
                "SELECT start_date, end_date, daily_burn_rate FROM lpg_cycles "
                "WHERE user_id = $1 ORDER BY start_date",
                user_id,
            )
            open_cycles = [c for c in cycles if c["end_date"] is None]
            if len(open_cycles) != 1:
                failures.append(f"{slug}: expected exactly 1 open cylinder, found {len(open_cycles)}")
            else:
                rates = [
                    c["daily_burn_rate"]
                    for c in sorted(
                        (c for c in cycles if c["end_date"] is not None),
                        key=lambda c: c["end_date"],
                        reverse=True,
                    )
                ]
                summary["prediction"] = predict_open_cycle(
                    open_cycles[0]["start_date"], rates, today
                )
            for field_name, expected_count in (
                ("electricity", len(household.electricity)),
                ("water", len(household.water)),
                ("lpg", len(household.lpg)),
                ("appliances", len(household.appliances)),
            ):
                if summary[field_name] != expected_count:
                    failures.append(
                        f"{slug}: {field_name} rows = {summary[field_name]}, expected {expected_count}"
                    )
            named[slug] = summary

        fillers = int(
            await conn.fetchval(
                "SELECT COUNT(*) FROM users WHERE email LIKE $1",
                f"filler-%@{SEED_EMAIL_DOMAIN}",
            )
        )
        by_ward = {
            r["ward"]: r["n"]
            for r in await conn.fetch(
                """
                SELECT w.name AS ward, COUNT(*) AS n
                FROM users u JOIN wards w ON w.id = u.ward_id
                WHERE u.email LIKE $1 GROUP BY w.name
                """,
                f"%@{SEED_EMAIL_DOMAIN}",
            )
        }

    expected_fillers = sum(count for _, count in FILLER_WARDS)
    if fillers != expected_fillers:
        failures.append(f"filler households = {fillers}, expected {expected_fillers}")

    # The conditions the Phase 2 pipeline turns into alerts.
    checks: list[tuple[str, bool]] = []
    if "prediction" in named.get("ananya", {}):
        checks.append(("ananya's cylinder is inside the refill window", named["ananya"]["prediction"]["should_alert_now"]))
    if "prediction" in named.get("rohan", {}):
        checks.append(("rohan's cylinder is past empty (overdue)", named["rohan"]["prediction"]["kg_remaining"] == 0))
    if "prediction" in named.get("deepa", {}):
        checks.append(("deepa's cylinder is not due yet", not named["deepa"]["prediction"]["should_alert_now"]))
    for label, ok in checks:
        if not ok:
            failures.append(f"condition not met: {label}")

    _print_report(named, by_ward, fillers, checks, failures)
    return {"named": named, "by_ward": by_ward, "fillers": fillers, "failures": failures}


def _print_report(
    named: dict[str, dict[str, Any]],
    by_ward: dict[str, int],
    fillers: int,
    checks: list[tuple[str, bool]],
    failures: list[str],
) -> None:
    print("SAVERA seed verification")
    print("-" * 64)
    for slug, summary in named.items():
        print(
            f"  {summary.get('email', slug):<24} ward={summary.get('ward', '?'):<14}"
            f" bills={summary['electricity']:<3} water={summary['water']:<4}"
            f" lpg={summary['lpg']:<2} appliances={summary['appliances']}"
        )
        prediction = summary.get("prediction")
        if prediction:
            print(
                f"      cylinder: {prediction['kg_remaining']} kg left,"
                f" {prediction['days_to_empty']} days to empty,"
                f" alert now = {prediction['should_alert_now']}"
            )
    print(f"  filler households: {fillers}")
    print(f"  households per ward: {by_ward}")
    for label, ok in checks:
        print(f"  [{'OK' if ok else 'FAIL'}] {label}")
    print("-" * 64)
    if failures:
        print(f"FAILED ({len(failures)} problem(s)):")
        for failure in failures:
            print(f"  - {failure}")
    else:
        print("OK — the seeded dataset matches the plan.")


# --------------------------------------------------------------------------------- CLI


async def _main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Seed SAVERA demo households.")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="RNG seed for fillers")
    parser.add_argument(
        "--today", type=date.fromisoformat, default=SEED_TODAY, help="anchor date (YYYY-MM-DD)"
    )
    parser.add_argument("--reset", action="store_true", help="delete the seeded users first")
    parser.add_argument("--verify", action="store_true", help="only verify an existing seed")
    args = parser.parse_args(argv)

    from app.config import get_settings

    pool = await asyncpg.create_pool(get_settings().database_url, min_size=1, max_size=4)
    try:
        if not args.verify:
            counts = await seed_all(pool, today=args.today, seed=args.seed, reset=args.reset)
            print(
                "seeded: "
                + ", ".join(f"{key}={value}" for key, value in sorted(counts.items()))
            )
        report = await verify(pool, today=args.today, seed=args.seed)
    finally:
        await pool.close()
    return 1 if report["failures"] else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(_main(sys.argv[1:])))
