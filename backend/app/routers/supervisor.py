"""Supervisor router — role-gated endpoints over ward_aggregates.

Privacy rule (non-negotiable): every endpoint reads ONLY from ``ward_aggregates``
and ``wards``. No per-user table is ever named in a query here, and no ``user_id``
appears in any response.  The ``household_count >= 10`` filter is applied on every
read path so a ward with few households is never surfaced.
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Path, Query
from pydantic import BaseModel, Field

from app import database
from app.deps import CurrentUser, require_supervisor
from app.services.lpg import today_ist
from app.services.ward import month_start, add_months

router = APIRouter(prefix="/supervisor", tags=["supervisor"])

MIN_HOUSEHOLDS = 10


# ──────────────────────────────────────────── response models


class WardListItem(BaseModel):
    id: int
    name: str
    city: str


class HeatmapResource(BaseModel):
    resource_type: str
    avg_consumption: float
    household_count: int
    pct_change_vs_prev: float | None = None
    anomaly_flag: bool = False


class HeatmapResponse(BaseModel):
    ward_id: int
    ward_name: str
    resources: list[HeatmapResource] = Field(default_factory=list)


class AnomalyWard(BaseModel):
    ward_id: int
    ward_name: str
    resource_type: str
    avg_consumption: float
    pct_change_vs_prev: float | None = None
    household_count: int


class ComparisonWard(BaseModel):
    ward_id: int
    ward_name: str
    avg_per_household: float
    avg_per_person: float
    household_count: int


# ──────────────────────────────────────────── endpoints


@router.get("/wards", response_model=list[WardListItem])
async def supervisor_wards(
    user: CurrentUser = Depends(require_supervisor),
) -> list[WardListItem]:
    """Wards in the supervisor's city (no supervisor→ward table in MVP)."""
    rows = await database.fetch(
        "SELECT id, name, city FROM wards WHERE city = $1 ORDER BY name",
        user.city,
    )
    return [WardListItem(**dict(r)) for r in rows]


@router.get("/wards/{ward_id}/heatmap", response_model=HeatmapResponse)
async def ward_heatmap(
    ward_id: int = Path(...),
    user: CurrentUser = Depends(require_supervisor),
) -> HeatmapResponse:
    """Per-resource stats for one ward: current month avg, % change, anomaly flag."""
    ward = await database.fetchrow("SELECT id, name FROM wards WHERE id = $1", ward_id)
    if ward is None:
        return HeatmapResponse(ward_id=ward_id, ward_name="Unknown")

    today = today_ist()
    current_month = month_start(today)

    rows = await database.fetch(
        """
        SELECT resource_type, avg_consumption, household_count,
               pct_change_vs_prev, anomaly_flag
        FROM ward_aggregates
        WHERE ward_id = $1 AND period_start = $2 AND household_count >= $3
        ORDER BY resource_type
        """,
        ward_id,
        current_month,
        MIN_HOUSEHOLDS,
    )

    resources = [
        HeatmapResource(
            resource_type=r["resource_type"],
            avg_consumption=round(r["avg_consumption"], 2),
            household_count=r["household_count"],
            pct_change_vs_prev=(
                round(r["pct_change_vs_prev"], 1)
                if r["pct_change_vs_prev"] is not None
                else None
            ),
            anomaly_flag=r["anomaly_flag"],
        )
        for r in rows
    ]

    return HeatmapResponse(
        ward_id=ward["id"],
        ward_name=ward["name"],
        resources=resources,
    )


@router.get("/anomalies", response_model=list[AnomalyWard])
async def supervisor_anomalies(
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
    user: CurrentUser = Depends(require_supervisor),
) -> list[AnomalyWard]:
    """Wards with anomaly_flag=true in the given month (default: current month)."""
    if month:
        period = date(int(month[:4]), int(month[5:7]), 1)
    else:
        period = month_start(today_ist())

    rows = await database.fetch(
        """
        SELECT wa.ward_id, w.name AS ward_name, wa.resource_type,
               wa.avg_consumption, wa.pct_change_vs_prev, wa.household_count
        FROM ward_aggregates wa
        JOIN wards w ON w.id = wa.ward_id
        WHERE wa.anomaly_flag = TRUE
          AND wa.period_start = $1
          AND wa.household_count >= $2
          AND w.city = $3
        ORDER BY wa.avg_consumption DESC
        """,
        period,
        MIN_HOUSEHOLDS,
        user.city,
    )
    return [
        AnomalyWard(
            ward_id=r["ward_id"],
            ward_name=r["ward_name"],
            resource_type=r["resource_type"],
            avg_consumption=round(r["avg_consumption"], 2),
            pct_change_vs_prev=(
                round(r["pct_change_vs_prev"], 1)
                if r["pct_change_vs_prev"] is not None
                else None
            ),
            household_count=r["household_count"],
        )
        for r in rows
    ]


@router.get("/comparison", response_model=list[ComparisonWard])
async def supervisor_comparison(
    resource: str = Query("electricity", pattern="^(electricity|water|lpg)$"),
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
    user: CurrentUser = Depends(require_supervisor),
) -> list[ComparisonWard]:
    """Per-ward avg per household and per person for one resource, one month."""
    if month:
        period = date(int(month[:4]), int(month[5:7]), 1)
    else:
        period = month_start(today_ist())

    rows = await database.fetch(
        """
        SELECT wa.ward_id, w.name AS ward_name,
               wa.avg_consumption, wa.avg_household_size, wa.household_count
        FROM ward_aggregates wa
        JOIN wards w ON w.id = wa.ward_id
        WHERE wa.resource_type = $1
          AND wa.period_start = $2
          AND wa.household_count >= $3
          AND w.city = $4
        ORDER BY wa.avg_consumption
        """,
        resource,
        period,
        MIN_HOUSEHOLDS,
        user.city,
    )
    return [
        ComparisonWard(
            ward_id=r["ward_id"],
            ward_name=r["ward_name"],
            avg_per_household=round(r["avg_consumption"], 2),
            avg_per_person=round(
                r["avg_consumption"] / (r["avg_household_size"] or 1), 2
            ),
            household_count=r["household_count"],
        )
        for r in rows
    ]
