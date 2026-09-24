"""Pydantic v2 response models for /alerts (PHASE0_PLAN.md §6 API contract)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel

ResourceType = Literal["electricity", "water", "lpg", "general"]
AlertType = Literal[
    "high_consumption",
    "leak_suspected",
    "refill_due_soon",
    "refill_overdue",
    "milestone",
    "weekly_digest",
]


class AlertOut(BaseModel):
    id: UUID
    resource_type: ResourceType
    alert_type: AlertType
    title: str
    message: str
    context: dict[str, Any] | None = None
    is_read: bool
    created_at: datetime

    @classmethod
    def from_row(cls, row: Any) -> AlertOut:
        return cls(**dict(row))


class UnreadCountOut(BaseModel):
    count: int


class ReadAllOut(BaseModel):
    updated: int
