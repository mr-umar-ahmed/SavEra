"""Electricity and water reading routes (PHASE0_PLAN.md section 6).

Every route is scoped to the caller's user id; there is no cross-user read path.

Shapes that matter:

* ``POST /readings/electricity`` rejects an **overlapping** billing period with 409 unless
  ``?overwrite=true`` (what the OCR confirmation screen sends when it replaces a bill it
  already saved). Overlap is checked as a range intersection, not just an equal start date,
  so a mis-keyed period cannot slip past ``uq_electricity_user_period``.
* ``POST /readings/water`` is an upsert on ``(user_id, reading_date)``: logging the same day
  twice corrects the figure instead of erroring, and the response says whether it replaced.
* Both POSTs do exactly one write and then hand the side effects (baseline, anomaly, alerts,
  ward aggregate, green score) to BackgroundTasks, which is what keeps the response under the
  spec's 400 ms budget. The pipeline module lands in Phase 2; until then the hook is a no-op.
"""

from __future__ import annotations

import inspect
import logging
from collections.abc import Callable
from datetime import date
from typing import Any, Literal
from uuid import UUID

import asyncpg
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status

from app import database
from app.deps import CurrentUser, get_current_user
from app.models.readings import (
    ElectricityReadingIn,
    ElectricityReadingOut,
    WaterReadingCreated,
    WaterReadingIn,
    WaterReadingOut,
    ist_today,
    water_date_error,
)

logger = logging.getLogger("savera.readings")

router = APIRouter(prefix="/readings", tags=["readings"])

_ELECTRICITY_COLUMNS = (
    "id, kwh, billing_period_start, billing_period_end, billed_amount, source, "
    "bill_image_url, created_at"
)
_WATER_COLUMNS = "id, liters, reading_date, source, created_at"

PERIOD_OVERLAP_CONFLICT = (
    "A bill already covers part of that billing period. "
    "Send ?overwrite=true to replace it, or delete the old one first."
)
READING_NOT_FOUND = "Reading not found"
UNKNOWN_OCR_JOB = "That bill upload does not belong to you"


def _today() -> date:
    """Indirection so tests can pin the date (monkeypatch ``app.routers.readings._today``)."""
    return ist_today()


# --------------------------------------------------------- post-reading pipeline hook


async def _run_pipeline_isolated(
    pipeline: Callable[..., Any], user_id: UUID, resource: str, reading_id: UUID
) -> None:
    """Best-effort side effects: a pipeline failure is logged, never surfaced to the client."""
    try:
        result = pipeline(user_id, resource, reading_id)
        if inspect.isawaitable(result):
            await result
    except Exception:
        logger.exception("post-reading pipeline failed for %s reading %s", resource, reading_id)


def _schedule_pipeline(
    background: BackgroundTasks,
    user_id: UUID,
    resource: Literal["electricity", "water"],
    reading_id: UUID,
) -> None:
    """Schedule the post-reading pipeline, if the Phase 2 module has landed."""
    try:
        from app.services.pipeline import run_post_reading_pipeline
    except ImportError:
        logger.debug("app.services.pipeline not available; skipping %s post-save hook", resource)
        return
    background.add_task(_run_pipeline_isolated, run_post_reading_pipeline, user_id, resource, reading_id)


# ----------------------------------------------------------------------- electricity


@router.get("/electricity", response_model=list[ElectricityReadingOut])
async def list_electricity(
    limit: int = Query(12, ge=1, le=60),
    user: CurrentUser = Depends(get_current_user),
) -> list[ElectricityReadingOut]:
    """The user's bills, newest period first."""
    rows = await database.fetch(
        f"""
        SELECT {_ELECTRICITY_COLUMNS} FROM electricity_readings
        WHERE user_id = $1
        ORDER BY billing_period_start DESC
        LIMIT $2
        """,
        user.id,
        limit,
    )
    return [ElectricityReadingOut.from_row(row) for row in rows]


async def _overlapping_periods(
    conn: asyncpg.Connection, user_id: UUID, start: date, end: date
) -> list[asyncpg.Record]:
    """Existing bills whose period intersects [start, end] (inclusive on both ends)."""
    return await conn.fetch(
        """
        SELECT id, billing_period_start FROM electricity_readings
        WHERE user_id = $1 AND billing_period_start <= $3 AND billing_period_end >= $2
        """,
        user_id,
        start,
        end,
    )


@router.post(
    "/electricity", response_model=ElectricityReadingOut, status_code=status.HTTP_201_CREATED
)
async def create_electricity(
    payload: ElectricityReadingIn,
    background: BackgroundTasks,
    overwrite: bool = Query(False, description="Replace any bill overlapping this period"),
    user: CurrentUser = Depends(get_current_user),
) -> ElectricityReadingOut:
    """Save a bill. 409 when its period overlaps an existing one unless ``overwrite=true``."""
    today = _today()
    if payload.billing_period_end > today:
        raise HTTPException(422, "billing_period_end cannot be in the future")

    bill_image_url: str | None = None
    if payload.ocr_job_id is not None:
        job = await database.fetchrow(
            "SELECT id FROM ocr_jobs WHERE id = $1 AND user_id = $2",
            payload.ocr_job_id,
            user.id,
        )
        if job is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, UNKNOWN_OCR_JOB)
        bill_image_url = f"/bills/jobs/{payload.ocr_job_id}/image"

    pool = database.get_pool()
    async with pool.acquire() as conn, conn.transaction():
        clashes = await _overlapping_periods(
            conn, user.id, payload.billing_period_start, payload.billing_period_end
        )
        if clashes and not overwrite:
            raise HTTPException(status.HTTP_409_CONFLICT, PERIOD_OVERLAP_CONFLICT)
        for clash in clashes:
            # Hypertable rows need the partitioning column in the WHERE clause to be cheap.
            await conn.execute(
                "DELETE FROM electricity_readings WHERE id = $1 AND billing_period_start = $2",
                clash["id"],
                clash["billing_period_start"],
            )
        row = await conn.fetchrow(
            f"""
            INSERT INTO electricity_readings
                (user_id, kwh, billing_period_start, billing_period_end, billed_amount,
                 source, bill_image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING {_ELECTRICITY_COLUMNS}
            """,
            user.id,
            payload.kwh,
            payload.billing_period_start,
            payload.billing_period_end,
            payload.billed_amount,
            payload.source,
            bill_image_url,
        )

    if payload.ocr_job_id is not None:
        await database.execute(
            "UPDATE ocr_jobs SET reading_id = $1 WHERE id = $2 AND user_id = $3",
            row["id"],
            payload.ocr_job_id,
            user.id,
        )

    _schedule_pipeline(background, user.id, "electricity", row["id"])
    return ElectricityReadingOut.from_row(row)


@router.delete("/electricity/{reading_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_electricity(
    reading_id: UUID,
    user: CurrentUser = Depends(get_current_user),
) -> Response:
    """Delete one of the caller's bills."""
    deleted = await database.fetchval(
        "DELETE FROM electricity_readings WHERE id = $1 AND user_id = $2 RETURNING id",
        reading_id,
        user.id,
    )
    if deleted is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, READING_NOT_FOUND)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ----------------------------------------------------------------------------- water


@router.get("/water", response_model=list[WaterReadingOut])
async def list_water(
    days: int = Query(90, ge=1, le=730),
    user: CurrentUser = Depends(get_current_user),
) -> list[WaterReadingOut]:
    """The user's daily litres for the last `days` days, newest first."""
    rows = await database.fetch(
        f"""
        SELECT {_WATER_COLUMNS} FROM water_readings
        WHERE user_id = $1 AND reading_date > $2::date - $3::int
        ORDER BY reading_date DESC
        """,
        user.id,
        _today(),
        days,
    )
    return [WaterReadingOut(**dict(row)) for row in rows]


@router.post("/water", response_model=WaterReadingCreated, status_code=status.HTTP_201_CREATED)
async def create_water(
    payload: WaterReadingIn,
    background: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
) -> WaterReadingCreated:
    """Log a day's water use. Logging the same day again corrects it (upsert)."""
    if (error := water_date_error(payload.reading_date, _today())) is not None:
        raise HTTPException(422, error)

    pool = database.get_pool()
    async with pool.acquire() as conn, conn.transaction():
        existing = await conn.fetchval(
            "SELECT id FROM water_readings WHERE user_id = $1 AND reading_date = $2",
            user.id,
            payload.reading_date,
        )
        if existing is not None:
            row = await conn.fetchrow(
                f"""
                UPDATE water_readings SET liters = $3, source = $4
                WHERE user_id = $1 AND reading_date = $2
                RETURNING {_WATER_COLUMNS}
                """,
                user.id,
                payload.reading_date,
                payload.liters,
                payload.source,
            )
        else:
            row = await conn.fetchrow(
                f"""
                INSERT INTO water_readings (user_id, liters, reading_date, source)
                VALUES ($1, $2, $3, $4)
                RETURNING {_WATER_COLUMNS}
                """,
                user.id,
                payload.liters,
                payload.reading_date,
                payload.source,
            )

    _schedule_pipeline(background, user.id, "water", row["id"])
    return WaterReadingCreated(**dict(row), replaced=existing is not None)


@router.delete("/water/{reading_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_water(
    reading_id: UUID,
    user: CurrentUser = Depends(get_current_user),
) -> Response:
    """Delete one of the caller's water readings."""
    deleted = await database.fetchval(
        "DELETE FROM water_readings WHERE id = $1 AND user_id = $2 RETURNING id",
        reading_id,
        user.id,
    )
    if deleted is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, READING_NOT_FOUND)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
