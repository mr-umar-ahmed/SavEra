"""Insight routes (PHASE0_PLAN.md §6): everything the dashboard and the three resource
pages render.

These are read-only projections over what the Phase 2 pipeline already computed — baselines,
green scores and ward aggregates are never computed here, only read, so a page load can never
disagree with the alert a household was sent.

The one privacy rule that lives in this file: peer comparison reads ``ward_aggregates`` and
only ever answers when that row covers **at least 10 households**
(``MIN_HOUSEHOLDS_FOR_COMPARISON``), enforced in the SQL itself.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query

from app import database
from app.deps import CurrentUser, get_current_user
from app.models.insights import (
    ApplianceShare,
    BaselineOut,
    DashboardOut,
    ElectricityInsights,
    ElectricityPoint,
    GreenScoreInsights,
    GreenScoreOut,
    LpgInsights,
    LpgSummary,
    PeerComparison,
    ResourceSummary,
    WardRank,
    WaterInsights,
    WaterMonth,
    WaterPoint,
)
from app.services.appliance import APPLIANCE_CATALOG, estimate_breakdown, find_unknown_load
from app.services.lpg import predict_finish, today_ist
from app.services.tips import get_tips
from app.services.ward import month_start

router = APIRouter(prefix="/insights", tags=["insights"])

MIN_HOUSEHOLDS_FOR_COMPARISON = 10
ELECTRICITY_UNIT = "kWh per 30 days"
WATER_UNIT = "litres per day"
LPG_UNIT = "kg per day"
WATER_CURRENT_WINDOW_DAYS = 7

_LABELS = {entry["type"]: entry["label"] for entry in APPLIANCE_CATALOG}


# ------------------------------------------------------------------------------- helpers


async def _baseline(user_id, resource_type: str) -> BaselineOut | None:
    row = await database.fetchrow(
        "SELECT mean, std_dev, upper_threshold, lower_threshold, sample_count FROM baselines "
        "WHERE user_id = $1 AND resource_type = $2",
        user_id,
        resource_type,
    )
    return BaselineOut.from_row(row)


def _status(current: float | None, baseline: BaselineOut | None) -> tuple[str, float | None]:
    """Traffic light for a summary card, plus how far from usual it is."""
    if current is None or baseline is None or not baseline.mean:
        return "unknown", None
    pct = round((current - baseline.mean) / baseline.mean * 100, 1)
    if current > baseline.upper_threshold:
        return "bad", pct
    if current > baseline.mean:
        return "warn", pct
    return "good", pct


async def _latest_electricity(user_id) -> dict[str, Any] | None:
    row = await database.fetchrow(
        "SELECT kwh, billing_period_start, billing_period_end FROM electricity_readings "
        "WHERE user_id = $1 ORDER BY billing_period_start DESC LIMIT 1",
        user_id,
    )
    if row is None:
        return None
    days = (row["billing_period_end"] - row["billing_period_start"]).days + 1
    return {
        "current": round(row["kwh"] / days * 30, 2),
        "period_start": row["billing_period_start"],
        "period_end": row["billing_period_end"],
        "kwh": row["kwh"],
        "billing_days": days,
    }


async def _recent_water_average(user_id) -> float | None:
    """The same smoothed figure the pipeline scores: the mean of the newest logged days."""
    rows = await database.fetch(
        "SELECT liters FROM water_readings WHERE user_id = $1 ORDER BY reading_date DESC LIMIT $2",
        user_id,
        WATER_CURRENT_WINDOW_DAYS,
    )
    return round(sum(r["liters"] for r in rows) / len(rows), 2) if rows else None


async def _lpg_current(user_id, today: date) -> LpgSummary:
    cycle = await database.fetchrow(
        "SELECT id, cylinder_kg, start_date, end_date, daily_burn_rate FROM lpg_cycles "
        "WHERE user_id = $1 AND end_date IS NULL",
        user_id,
    )
    if cycle is None:
        return LpgSummary()
    history = await database.fetch(
        "SELECT daily_burn_rate FROM lpg_cycles WHERE user_id = $1 AND end_date IS NOT NULL "
        "ORDER BY end_date DESC LIMIT 6",
        user_id,
    )
    prediction = predict_finish(cycle, history, today=today)
    return LpgSummary(
        cycle={
            "id": str(cycle["id"]),
            "cylinder_kg": cycle["cylinder_kg"],
            "start_date": cycle["start_date"].isoformat(),
            "days": max(0, (today - cycle["start_date"]).days),
            "is_open": True,
        },
        prediction=prediction,
    )


async def _peer_comparison(user: CurrentUser, resource: str, yours: float | None) -> PeerComparison:
    """Ward average for `resource` this month, or an honest reason why not.

    The ``household_count >= 10`` filter is part of the query, so a row that has not reached
    the privacy floor is never even fetched, let alone returned.
    """
    if user.ward_id is None:
        return PeerComparison(available=False, reason="Pick your ward to compare with neighbours.")

    row = await database.fetchrow(
        """
        SELECT wa.avg_consumption, wa.avg_household_size, wa.household_count, w.name AS ward_name
        FROM ward_aggregates wa
        JOIN wards w ON w.id = wa.ward_id
        WHERE wa.ward_id = $1 AND wa.resource_type = $2
          AND wa.household_count >= $3
        ORDER BY wa.period_start DESC
        LIMIT 1
        """,
        user.ward_id,
        resource,
        MIN_HOUSEHOLDS_FOR_COMPARISON,
    )
    if row is None:
        return PeerComparison(
            available=False,
            reason=(
                f"We need at least {MIN_HOUSEHOLDS_FOR_COMPARISON} households in your ward "
                "before we can show an average without identifying anyone."
            ),
        )

    avg_household = row["avg_consumption"]
    avg_size = row["avg_household_size"] or 1
    pct_diff = (
        round((yours - avg_household) / avg_household * 100, 1)
        if yours is not None and avg_household
        else None
    )
    return PeerComparison(
        available=True,
        ward_name=row["ward_name"],
        avg_per_household=round(avg_household, 2),
        avg_per_person=round(avg_household / avg_size, 2),
        yours=yours,
        pct_diff=pct_diff,
        household_count=row["household_count"],
    )


def _ward_rank(comparison: PeerComparison) -> WardRank:
    """The always-visible one-liner on the dashboard."""
    if not comparison.available or comparison.pct_diff is None:
        return WardRank(available=False, reason=comparison.reason)
    pct = comparison.pct_diff
    if abs(pct) < 1:
        line = f"You use about the same as your {comparison.ward_name} average"
    elif pct < 0:
        line = f"You use {abs(pct):.0f}% less electricity than your {comparison.ward_name} average"
    else:
        line = f"You use {pct:.0f}% more electricity than your {comparison.ward_name} average"
    return WardRank(available=True, line=line, pct_diff=pct)


async def _appliance_shares(user_id, billing_days: int) -> tuple[list[ApplianceShare], dict[str, float]]:
    appliances = await database.fetch(
        "SELECT type, count, daily_hours, star_rating, wattage_override FROM appliances "
        "WHERE user_id = $1",
        user_id,
    )
    breakdown = estimate_breakdown(appliances, billing_days)
    total = sum(breakdown.values()) or 1.0
    shares = [
        ApplianceShare(
            type=atype,
            label=_LABELS.get(atype, atype),
            kwh=kwh,
            pct=round(kwh / total * 100, 1),
        )
        for atype, kwh in sorted(breakdown.items(), key=lambda kv: kv[1], reverse=True)
    ]
    return shares, breakdown


# ----------------------------------------------------------------------------- dashboard


@router.get("/dashboard", response_model=DashboardOut)
async def dashboard(user: CurrentUser = Depends(get_current_user)) -> DashboardOut:
    """Everything the home screen shows, in one round trip."""
    today = today_ist()

    latest = await _latest_electricity(user.id)
    e_baseline = await _baseline(user.id, "electricity")
    e_current = latest["current"] if latest else None
    e_status, e_pct = _status(e_current, e_baseline)
    electricity = ResourceSummary(
        current=e_current,
        unit=ELECTRICITY_UNIT,
        baseline=e_baseline,
        status=e_status,
        pct_vs_baseline=e_pct,
        period_start=latest["period_start"] if latest else None,
        period_end=latest["period_end"] if latest else None,
    )

    w_current = await _recent_water_average(user.id)
    w_baseline = await _baseline(user.id, "water")
    w_status, w_pct = _status(w_current, w_baseline)
    water = ResourceSummary(
        current=w_current,
        unit=WATER_UNIT,
        baseline=w_baseline,
        status=w_status,
        pct_vs_baseline=w_pct,
    )

    green_row = await database.fetchrow(
        "SELECT month, electricity_score, water_score, lpg_score, total_score, ward_percentile "
        "FROM green_scores WHERE user_id = $1 ORDER BY month DESC LIMIT 1",
        user.id,
    )
    unread = await database.fetchval(
        "SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND is_read = FALSE", user.id
    )
    comparison = await _peer_comparison(user, "electricity", e_current)

    return DashboardOut(
        electricity=electricity,
        water=water,
        lpg=await _lpg_current(user.id, today),
        green_score=GreenScoreOut(**dict(green_row)) if green_row else None,
        unread_alerts=unread,
        ward_rank=_ward_rank(comparison),
    )


# --------------------------------------------------------------------------- electricity


@router.get("/electricity", response_model=ElectricityInsights)
async def electricity_insights(
    months: int = Query(6, ge=1, le=24),
    user: CurrentUser = Depends(get_current_user),
) -> ElectricityInsights:
    """Bill history oldest-first (chart order), the appliance split and what is left over."""
    rows = await database.fetch(
        "SELECT kwh, billing_period_start, billing_period_end FROM electricity_readings "
        "WHERE user_id = $1 ORDER BY billing_period_start DESC LIMIT $2",
        user.id,
        months,
    )
    history = [
        ElectricityPoint(
            period_start=r["billing_period_start"],
            period_end=r["billing_period_end"],
            kwh=r["kwh"],
            kwh_per_30d=round(
                r["kwh"] / ((r["billing_period_end"] - r["billing_period_start"]).days + 1) * 30, 2
            ),
        )
        for r in reversed(rows)
    ]

    baseline = await _baseline(user.id, "electricity")
    latest = history[-1] if history else None
    current = latest.kwh_per_30d if latest else None
    over = bool(baseline and current is not None and current > baseline.mean)

    billing_days = (
        (latest.period_end - latest.period_start).days + 1 if latest else 30
    )
    shares, breakdown = await _appliance_shares(user.id, billing_days)
    unknown = find_unknown_load(latest.kwh, breakdown) if latest else 0.0

    return ElectricityInsights(
        history=history,
        baseline=baseline,
        appliance_breakdown=shares,
        unknown_load=unknown,
        # Tips are advice for a household that is over its usual; showing them otherwise
        # would be noise (SPEC: "shown only when user is over baseline").
        tips=get_tips("electricity", appliance_breakdown=breakdown) if over else [],
        over_baseline=over,
        peer_comparison=await _peer_comparison(user, "electricity", current),
    )


# --------------------------------------------------------------------------------- water


@router.get("/water", response_model=WaterInsights)
async def water_insights(
    days: int = Query(90, ge=1, le=730),
    user: CurrentUser = Depends(get_current_user),
) -> WaterInsights:
    """Daily litres plus the monthly roll-up the chart draws."""
    today = today_ist()
    rows = await database.fetch(
        "SELECT liters, reading_date FROM water_readings "
        "WHERE user_id = $1 AND reading_date > $2::date - $3::int "
        "ORDER BY reading_date",
        user.id,
        today,
        days,
    )
    history = [WaterPoint(reading_date=r["reading_date"], liters=r["liters"]) for r in rows]

    monthly_rows = await database.fetch(
        """
        SELECT date_trunc('month', reading_date)::date AS month,
               AVG(liters) AS avg_liters, SUM(liters) AS total_liters, COUNT(*) AS days_logged
        FROM water_readings
        WHERE user_id = $1 AND reading_date > $2::date - $3::int
        GROUP BY 1 ORDER BY 1
        """,
        user.id,
        today,
        days,
    )
    monthly = [
        WaterMonth(
            month=r["month"],
            avg_liters=round(r["avg_liters"], 2),
            total_liters=round(r["total_liters"], 2),
            days_logged=r["days_logged"],
        )
        for r in monthly_rows
    ]

    baseline = await _baseline(user.id, "water")
    current = await _recent_water_average(user.id)
    over = bool(baseline and current is not None and current > baseline.mean)

    return WaterInsights(
        history=history,
        monthly=monthly,
        baseline=baseline,
        tips=get_tips("water") if over else [],
        over_baseline=over,
        peer_comparison=await _peer_comparison(user, "water", current),
    )


# ----------------------------------------------------------------------------------- lpg


@router.get("/lpg", response_model=LpgInsights)
async def lpg_insights(user: CurrentUser = Depends(get_current_user)) -> LpgInsights:
    """The cylinder timeline plus the open cylinder's prediction."""
    today = today_ist()
    rows = await database.fetch(
        "SELECT id, cylinder_kg, start_date, end_date, daily_burn_rate FROM lpg_cycles "
        "WHERE user_id = $1 ORDER BY start_date DESC LIMIT 24",
        user.id,
    )
    cycles = [
        {
            "id": str(r["id"]),
            "cylinder_kg": r["cylinder_kg"],
            "start_date": r["start_date"].isoformat(),
            "end_date": r["end_date"].isoformat() if r["end_date"] else None,
            "daily_burn_rate": r["daily_burn_rate"],
            "days": max(0, ((r["end_date"] or today) - r["start_date"]).days),
            "is_open": r["end_date"] is None,
        }
        for r in rows
    ]

    baseline = await _baseline(user.id, "lpg")
    newest_closed = next((c for c in cycles if not c["is_open"] and c["daily_burn_rate"]), None)
    current_rate = newest_closed["daily_burn_rate"] if newest_closed else None
    over = bool(baseline and current_rate is not None and current_rate > baseline.mean)

    return LpgInsights(
        cycles=cycles,
        current=await _lpg_current(user.id, today),
        baseline=baseline,
        tips=get_tips("lpg") if over else [],
        over_baseline=over,
    )


# -------------------------------------------------------------------------- green score


@router.get("/green-score", response_model=GreenScoreInsights)
async def green_score_insights(
    months: int = Query(6, ge=1, le=24),
    user: CurrentUser = Depends(get_current_user),
) -> GreenScoreInsights:
    """This month's score and the months before it, oldest first."""
    since = month_start(today_ist() - timedelta(days=31 * months))
    rows = await database.fetch(
        "SELECT month, electricity_score, water_score, lpg_score, total_score, ward_percentile "
        "FROM green_scores WHERE user_id = $1 AND month >= $2 ORDER BY month",
        user.id,
        since,
    )
    history = [GreenScoreOut(**dict(r)) for r in rows]
    return GreenScoreInsights(current=history[-1] if history else None, history=history)


# ---------------------------------------------------------------------- peer comparison


@router.get("/peer-comparison", response_model=PeerComparison)
async def peer_comparison(
    resource: str = Query("electricity", pattern="^(electricity|water|lpg)$"),
    user: CurrentUser = Depends(get_current_user),
) -> PeerComparison:
    """Your figure against your ward's average — only once 10+ households are in it."""
    if resource == "electricity":
        latest = await _latest_electricity(user.id)
        yours = latest["current"] if latest else None
    elif resource == "water":
        yours = await _recent_water_average(user.id)
    else:
        yours = await database.fetchval(
            "SELECT daily_burn_rate FROM lpg_cycles WHERE user_id = $1 AND daily_burn_rate IS NOT NULL "
            "ORDER BY end_date DESC LIMIT 1",
            user.id,
        )
        yours = round(yours * 30, 2) if yours else None  # ward aggregate stores kg per 30 days
    return await _peer_comparison(user, resource, yours)
