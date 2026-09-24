"""Pydantic v2 models for the LPG cycle API (PHASE0_PLAN section 6)."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

DEFAULT_CYLINDER_KG = 14.2  # domestic cylinder; 5 kg and 19 kg commercial sizes also fit 1..50


class LpgCycleCreate(BaseModel):
    """POST /lpg/cycles body. ``start_date`` may be at most one day ahead (checked in the route)."""

    cylinder_kg: float = Field(default=DEFAULT_CYLINDER_KG, ge=1, le=50)
    start_date: date


class LpgCycleClose(BaseModel):
    """POST /lpg/cycles/{id}/close body. Must be on/after start_date and at most one day ahead."""

    end_date: date


class LpgCycleOut(BaseModel):
    id: UUID
    cylinder_kg: float
    start_date: date
    end_date: date | None = None
    daily_burn_rate: float | None = None  # kg/day, set on close
    days: int  # end - start for closed cycles, days elapsed so far for the open one
    is_open: bool


class LpgCurrentOut(BaseModel):
    """GET /lpg/current: the open cycle and its prediction, both null when nothing is open."""

    cycle: LpgCycleOut | None = None
    prediction: dict[str, Any] | None = None
