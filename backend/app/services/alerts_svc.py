"""Alert creation (docs/PHASE0_PLAN.md §5.2 "Alert rules") + the FCM push that rides with it.

Every insert goes through :func:`create_alert`, which is idempotent by construction: it
always carries a ``dedupe_key`` and relies on the schema's
``UNIQUE (user_id, dedupe_key)`` with ``ON CONFLICT DO NOTHING``, so re-running the pipeline
(a retried background task, a replayed webhook, the same reading saved twice) can never
duplicate an alert. The dedupe-key builders below encode each rule's suppression window —
one per bill, one per day, one per ISO week, one per ~45-day bucket — as a value, not as
extra logic a caller could get wrong.

Push is sent only for the alert types the plan marks ``push`` in its rules table, and only
when the alert was actually newly created (a suppressed duplicate never re-notifies).
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any
from uuid import UUID

from app import database
from app.services import fcm

MILESTONE_SUPPRESSION_DAYS = 45
LEAK_SUPPRESSION_DAYS = 7

_ALERT_COLUMNS = (
    "id, user_id, resource_type, alert_type, title, message, context, is_read, created_at"
)


# --------------------------------------------------------------------- dedupe-key builders


def bill_dedupe_key(resource: str, reading_id: UUID) -> str:
    """One alert per bill/cycle: keyed to the reading itself, never repeats for that reading."""
    return f"{resource}:high_consumption:{reading_id}"


def day_dedupe_key(resource: str, alert_type: str, day: date) -> str:
    """One alert per calendar day."""
    return f"{resource}:{alert_type}:{day.isoformat()}"


def week_dedupe_key(resource: str, alert_type: str, day: date) -> str:
    """One alert per ISO week (Monday-anchored) — used for the Monday-run weekly digest,
    where a calendar-week bucket is exactly right since the job itself only ever runs once
    a week. **Not** used for the leak-alert suppression below: a fixed Monday boundary would
    let a leak spanning a Sunday/Monday pair fire twice within two days; that suppression is
    a genuine rolling window instead, via :func:`has_recent_alert`."""
    monday = day - timedelta(days=day.weekday())
    return f"{resource}:{alert_type}:week:{monday.isoformat()}"


def bucket_dedupe_key(resource: str, alert_type: str, day: date, bucket_days: int) -> str:
    """One alert per `bucket_days`-wide window anchored to the proleptic Gregorian epoch, so
    the bucket a date falls into never depends on when the rule first fired."""
    bucket = day.toordinal() // bucket_days
    return f"{resource}:{alert_type}:bucket:{bucket}"


def milestone_dedupe_key(resource: str, day: date) -> str:
    return bucket_dedupe_key(resource, "milestone", day, MILESTONE_SUPPRESSION_DAYS)


def cycle_dedupe_key(alert_type: str, cycle_id: UUID) -> str:
    """One alert per LPG cycle for refill_due_soon / refill_overdue — no need to repeat daily
    once the household has been told."""
    return f"lpg:{alert_type}:{cycle_id}"


# ------------------------------------------------------------------------------- creation


async def create_alert(
    user_id: UUID,
    resource_type: str,
    alert_type: str,
    title: str,
    message: str,
    *,
    dedupe_key: str,
    context: dict[str, Any] | None = None,
    push: bool = False,
    fcm_token: str | None = None,
) -> dict[str, Any] | None:
    """Insert an alert. Returns the row, or None when ``dedupe_key`` already existed (no-op).

    Push is attempted only when a row was actually inserted — a suppressed duplicate must
    never re-notify.
    """
    row = await database.fetchrow(
        f"""
        INSERT INTO alerts (user_id, resource_type, alert_type, title, message, context, dedupe_key)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        ON CONFLICT (user_id, dedupe_key) DO NOTHING
        RETURNING {_ALERT_COLUMNS}
        """,
        user_id,
        resource_type,
        alert_type,
        title,
        message,
        context,
        dedupe_key,
    )
    if row is None:
        return None
    if push:
        await fcm.send_push(
            fcm_token,
            title,
            message,
            data={"alert_id": str(row["id"]), "resource_type": resource_type, "alert_type": alert_type},
        )
    return dict(row)


async def has_recent_alert(user_id: UUID, resource_type: str, alert_type: str, *, since: date) -> bool:
    """Whether the user already has an alert of this type on/after `since` — used for the
    "not while a leak alert is active" suppression on water's high_consumption rule."""
    return bool(
        await database.fetchval(
            """
            SELECT EXISTS(
              SELECT 1 FROM alerts
              WHERE user_id = $1 AND resource_type = $2 AND alert_type = $3
                AND created_at >= $4::date
            )
            """,
            user_id,
            resource_type,
            alert_type,
            since,
        )
    )
