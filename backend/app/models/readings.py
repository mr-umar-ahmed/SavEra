"""Pydantic v2 request/response models for electricity and water readings.

Units (docs/PHASE0_PLAN.md §5.2): electricity is normalised to kWh per 30 days using the
*inclusive* billing-day count so bills of different lengths are comparable; water is one
litres sample per logged day.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field, model_validator

IST = ZoneInfo("Asia/Kolkata")

ReadingSource = Literal["manual", "ocr", "ami"]

MIN_BILLING_DAYS = 1
MAX_BILLING_DAYS = 120
# A water reading may be logged for tomorrow at most (late-night entries across midnight UTC/IST).
WATER_FUTURE_GRACE_DAYS = 1


def ist_today(today: date | None = None) -> date:
    """Today's date in India Standard Time; `today` is injectable for deterministic tests."""
    return today or datetime.now(IST).date()


def billing_days(start: date, end: date) -> int:
    """Inclusive length of a billing period (Jul 1 - Jul 31 -> 31 days)."""
    return (end - start).days + 1


def kwh_per_30d(kwh: float, start: date, end: date) -> float:
    """kWh normalised to a 30-day period (300 kWh over 30 days -> 300.0; 310 over 31 -> 300.0)."""
    return round(kwh / billing_days(start, end) * 30, 2)


def water_date_error(reading_date: date, today: date | None = None) -> str | None:
    """Return a human-readable reason when `reading_date` is not allowed, else None."""
    latest = ist_today(today) + timedelta(days=WATER_FUTURE_GRACE_DAYS)
    if reading_date > latest:
        return f"reading_date cannot be after {latest.isoformat()} (tomorrow in IST)"
    return None


# --------------------------------------------------------------------------- electricity


class ElectricityReadingIn(BaseModel):
    kwh: float = Field(gt=0, le=5000, description="Units consumed in the billing period")
    billing_period_start: date
    billing_period_end: date
    billed_amount: float | None = Field(default=None, ge=0)
    source: ReadingSource = "manual"
    ocr_job_id: UUID | None = Field(
        default=None, description="Links the reading to a bill image uploaded via /bills/upload"
    )

    @model_validator(mode="after")
    def _validate_period(self) -> ElectricityReadingIn:
        if self.billing_period_end < self.billing_period_start:
            raise ValueError("billing_period_end must be on or after billing_period_start")
        days = billing_days(self.billing_period_start, self.billing_period_end)
        if not MIN_BILLING_DAYS <= days <= MAX_BILLING_DAYS:
            raise ValueError(
                f"billing period must be {MIN_BILLING_DAYS}..{MAX_BILLING_DAYS} days (got {days})"
            )
        return self

    @property
    def billing_days(self) -> int:
        return billing_days(self.billing_period_start, self.billing_period_end)


class ElectricityReadingOut(BaseModel):
    id: UUID
    kwh: float
    billing_period_start: date
    billing_period_end: date
    billing_days: int = Field(description="Inclusive day count of the billing period")
    kwh_per_30d: float = Field(description="kwh / billing_days * 30")
    billed_amount: float | None
    source: ReadingSource
    bill_image_url: str | None
    created_at: datetime

    @classmethod
    def from_row(cls, row) -> ElectricityReadingOut:  # asyncpg.Record or dict
        start, end = row["billing_period_start"], row["billing_period_end"]
        return cls(
            id=row["id"],
            kwh=row["kwh"],
            billing_period_start=start,
            billing_period_end=end,
            billing_days=billing_days(start, end),
            kwh_per_30d=kwh_per_30d(row["kwh"], start, end),
            billed_amount=row["billed_amount"],
            source=row["source"],
            bill_image_url=row["bill_image_url"],
            created_at=row["created_at"],
        )


# --------------------------------------------------------------------------------- water


class WaterReadingIn(BaseModel):
    liters: float = Field(gt=0, le=50000)
    reading_date: date
    source: ReadingSource = "manual"


class WaterReadingOut(BaseModel):
    id: UUID
    liters: float
    reading_date: date
    source: ReadingSource
    created_at: datetime


class WaterReadingCreated(WaterReadingOut):
    replaced: bool = Field(
        description="True when an existing reading for the same day was overwritten (upsert)"
    )
