"""Alert routes (PHASE0_PLAN.md §6): list, unread count, mark read / read-all.

Alerts are written only by services/pipeline.py and app/tasks/scheduler.py — this router is
read/acknowledge only, and every query is scoped by the caller's user id.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app import database
from app.deps import CurrentUser, get_current_user
from app.models.alerts import AlertOut, ReadAllOut, UnreadCountOut

router = APIRouter(prefix="/alerts", tags=["alerts"])

_ALERT_COLUMNS = (
    "id, resource_type, alert_type, title, message, context, is_read, created_at"
)

ALERT_NOT_FOUND = "Alert not found"


@router.get("", response_model=list[AlertOut])
async def list_alerts(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
) -> list[AlertOut]:
    """The caller's alerts, newest first."""
    clause = "AND is_read = FALSE" if unread_only else ""
    rows = await database.fetch(
        f"""
        SELECT {_ALERT_COLUMNS} FROM alerts
        WHERE user_id = $1 {clause}
        ORDER BY created_at DESC
        LIMIT $2
        """,
        user.id,
        limit,
    )
    return [AlertOut.from_row(row) for row in rows]


@router.get("/unread-count", response_model=UnreadCountOut)
async def unread_count(user: CurrentUser = Depends(get_current_user)) -> UnreadCountOut:
    count = await database.fetchval(
        "SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND is_read = FALSE", user.id
    )
    return UnreadCountOut(count=count)


@router.post("/{alert_id}/read", response_model=AlertOut)
async def mark_read(
    alert_id: UUID, user: CurrentUser = Depends(get_current_user)
) -> AlertOut:
    row = await database.fetchrow(
        f"""
        UPDATE alerts SET is_read = TRUE
        WHERE id = $1 AND user_id = $2
        RETURNING {_ALERT_COLUMNS}
        """,
        alert_id,
        user.id,
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, ALERT_NOT_FOUND)
    return AlertOut.from_row(row)


@router.post("/read-all", response_model=ReadAllOut)
async def mark_all_read(user: CurrentUser = Depends(get_current_user)) -> ReadAllOut:
    updated = await database.fetchval(
        """
        WITH marked AS (
            UPDATE alerts SET is_read = TRUE
            WHERE user_id = $1 AND is_read = FALSE
            RETURNING 1
        )
        SELECT COUNT(*) FROM marked
        """,
        user.id,
    )
    return ReadAllOut(updated=updated)
