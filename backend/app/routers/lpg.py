"""LPG cycle routes (PHASE0_PLAN section 6): start / close a cylinder, history, current + prediction.

Every route requires a bearer token and scopes its queries by the caller's user id.

* A second open cylinder is rejected with 409 by the partial unique index
  ``uq_lpg_single_open_cycle`` (``INSERT ... ON CONFLICT DO NOTHING RETURNING``), so two
  concurrent POSTs cannot both succeed.
* Closing a cylinder stores ``close_cycle()``'s burn rate and schedules the same post-reading
  pipeline hook readings use, with resource ``"lpg"`` and the cycle id.
* The prediction is plain arithmetic over the user's newest closed cycles ("your usual") or
  the national-average default; the keys are exactly SPEC 5.3's.
"""

from __future__ import annotations

import inspect
import logging
from collections.abc import Callable
from datetime import date, timedelta
from typing import Any
from uuid import UUID

import asyncpg
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

from app import database
from app.deps import CurrentUser, get_current_user
from app.models.lpg import LpgCurrentOut, LpgCycleClose, LpgCycleCreate, LpgCycleOut
from app.services.lpg import close_cycle, predict_finish, today_ist

logger = logging.getLogger("savera.lpg")

router = APIRouter(prefix="/lpg", tags=["lpg"])

_CYCLE_COLUMNS = "id, cylinder_kg, start_date, end_date, daily_burn_rate"
HISTORY_LIMIT = 6  # closed cycles handed to predict_finish (it averages the newest 3)

OPEN_CYCLE_CONFLICT = "You already have an open cylinder"
ALREADY_CLOSED = "This cylinder is already closed"
SAME_END_DATE_CONFLICT = "Another cylinder already ended on that date"
NOT_FOUND = "Cycle not found"


def _today() -> date:
    """Indirection so tests can pin the date (monkeypatch ``app.routers.lpg._today``)."""
    return today_ist()


def _to_out(row: asyncpg.Record, today: date) -> LpgCycleOut:
    end_date = row["end_date"]
    is_open = end_date is None
    reference = today if is_open else end_date
    return LpgCycleOut(
        id=row["id"],
        cylinder_kg=row["cylinder_kg"],
        start_date=row["start_date"],
        end_date=end_date,
        daily_burn_rate=row["daily_burn_rate"],
        days=max(0, (reference - row["start_date"]).days),
        is_open=is_open,
    )


async def _run_pipeline_isolated(pipeline: Callable[..., Any], user_id: UUID, cycle_id: UUID) -> None:
    """Best-effort side effects: a pipeline failure is logged, never surfaced to the client."""
    try:
        result = pipeline(user_id, "lpg", cycle_id)
        if inspect.isawaitable(result):
            await result
    except Exception:
        logger.exception("post-close pipeline failed for lpg cycle %s", cycle_id)


def _schedule_pipeline(background: BackgroundTasks, user_id: UUID, cycle_id: UUID) -> None:
    """Schedule the post-reading pipeline for a closed cycle, if the module has landed."""
    try:
        from app.services.pipeline import run_post_reading_pipeline
    except ImportError:
        logger.debug("app.services.pipeline not available; skipping LPG post-close hook")
        return
    background.add_task(_run_pipeline_isolated, run_post_reading_pipeline, user_id, cycle_id)


@router.get("/cycles", response_model=list[LpgCycleOut])
async def list_cycles(
    limit: int = Query(24, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user),
) -> list[LpgCycleOut]:
    """The user's cylinders, newest first (the open one, if any, comes first)."""
    rows = await database.fetch(
        f"""
        SELECT {_CYCLE_COLUMNS} FROM lpg_cycles
        WHERE user_id = $1
        ORDER BY start_date DESC, created_at DESC
        LIMIT $2
        """,
        user.id,
        limit,
    )
    today = _today()
    return [_to_out(row, today) for row in rows]


@router.post("/cycles", response_model=LpgCycleOut, status_code=status.HTTP_201_CREATED)
async def start_cycle(
    payload: LpgCycleCreate,
    user: CurrentUser = Depends(get_current_user),
) -> LpgCycleOut:
    """Start a new cylinder. 409 when one is already open."""
    today = _today()
    if payload.start_date > today + timedelta(days=1):
        raise HTTPException(422, "start_date cannot be in the future")
    try:
        row = await database.fetchrow(
            f"""
            INSERT INTO lpg_cycles (user_id, cylinder_kg, start_date)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id) WHERE end_date IS NULL DO NOTHING
            RETURNING {_CYCLE_COLUMNS}
            """,
            user.id,
            payload.cylinder_kg,
            payload.start_date,
        )
    except asyncpg.UniqueViolationError as exc:  # any other unique clash is still "already open"
        raise HTTPException(status.HTTP_409_CONFLICT, OPEN_CYCLE_CONFLICT) from exc
    if row is None:
        raise HTTPException(status.HTTP_409_CONFLICT, OPEN_CYCLE_CONFLICT)
    return _to_out(row, today)


@router.post("/cycles/{cycle_id}/close", response_model=LpgCycleOut)
async def close_cycle_route(
    cycle_id: UUID,
    payload: LpgCycleClose,
    background: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
) -> LpgCycleOut:
    """Mark a cylinder finished: stores end_date and the computed daily burn rate."""
    today = _today()
    row = await database.fetchrow(
        f"SELECT {_CYCLE_COLUMNS} FROM lpg_cycles WHERE id = $1 AND user_id = $2",
        cycle_id,
        user.id,
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND)
    if row["end_date"] is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, ALREADY_CLOSED)
    if payload.end_date < row["start_date"]:
        raise HTTPException(422, "end_date must be on or after start_date")
    if payload.end_date > today + timedelta(days=1):
        raise HTTPException(422, "end_date cannot be in the future")

    burn_rate = close_cycle(
        {
            "cylinder_kg": row["cylinder_kg"],
            "start_date": row["start_date"],
            "end_date": payload.end_date,
        }
    )
    try:
        updated = await database.fetchrow(
            f"""
            UPDATE lpg_cycles
            SET end_date = $3, daily_burn_rate = $4
            WHERE id = $1 AND user_id = $2 AND end_date IS NULL
            RETURNING {_CYCLE_COLUMNS}
            """,
            cycle_id,
            user.id,
            payload.end_date,
            burn_rate,
        )
    except asyncpg.UniqueViolationError as exc:  # UNIQUE (user_id, end_date) on closed cycles
        raise HTTPException(status.HTTP_409_CONFLICT, SAME_END_DATE_CONFLICT) from exc
    if updated is None:  # closed concurrently between the SELECT and the UPDATE
        raise HTTPException(status.HTTP_409_CONFLICT, ALREADY_CLOSED)

    _schedule_pipeline(background, user.id, cycle_id)
    return _to_out(updated, today)


@router.get("/current", response_model=LpgCurrentOut)
async def current_cycle(user: CurrentUser = Depends(get_current_user)) -> LpgCurrentOut:
    """The open cylinder plus its finish prediction; both null when nothing is open."""
    today = _today()
    row = await database.fetchrow(
        f"SELECT {_CYCLE_COLUMNS} FROM lpg_cycles WHERE user_id = $1 AND end_date IS NULL",
        user.id,
    )
    if row is None:
        return LpgCurrentOut(cycle=None, prediction=None)
    history = await database.fetch(
        f"""
        SELECT {_CYCLE_COLUMNS} FROM lpg_cycles
        WHERE user_id = $1 AND end_date IS NOT NULL
        ORDER BY end_date DESC, start_date DESC
        LIMIT $2
        """,
        user.id,
        HISTORY_LIMIT,
    )
    prediction = predict_finish(row, history, today=today)
    return LpgCurrentOut(cycle=_to_out(row, today), prediction=prediction)
