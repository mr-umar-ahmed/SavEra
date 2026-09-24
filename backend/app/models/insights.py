"""Pydantic v2 response models for /insights (PHASE0_PLAN.md §6 API contract).

These are the shapes the dashboard and the three resource pages render. Every figure that
is an *estimate* rather than a measurement carries that word in its field name or its note,
because the UI is required to say so.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field

Status = Literal["good", "warn", "bad", "unknown"]

#: Shown wherever a Green Score appears, so nobody thinks a big family is being penalised.
NORMALISATION_NOTE = (
    "Scores divide your use by the number of people in your home, so a larger household is "
    "never penalised for being larger."
)

#: Shown wherever an appliance breakdown appears (SPEC: never call this NILM).
ESTIMATE_NOTE = (
    "Estimated from BEE star-rating wattages and the daily hours you entered — not measured."
)


class BaselineOut(BaseModel):
    mean: float
    std_dev: float
    upper_threshold: float
    lower_threshold: float
    sample_count: int

    @classmethod
    def from_row(cls, row: Any) -> BaselineOut | None:
        return None if row is None else cls(**{k: row[k] for k in cls.model_fields})


class ResourceSummary(BaseModel):
    """One dashboard summary card."""

    current: float | None = None
    unit: str
    baseline: BaselineOut | None = None
    status: Status = "unknown"
    pct_vs_baseline: float | None = None
    period_start: date | None = None
    period_end: date | None = None


class LpgSummary(BaseModel):
    cycle: dict[str, Any] | None = None
    prediction: dict[str, Any] | None = None


class GreenScoreOut(BaseModel):
    month: date
    electricity_score: float | None = None
    water_score: float | None = None
    lpg_score: float | None = None
    total_score: float | None = None
    ward_percentile: float | None = None


class PeerComparison(BaseModel):
    """Anonymised ward comparison. Never populated below the 10-household privacy floor."""

    available: bool
    reason: str | None = None
    ward_name: str | None = None
    avg_per_household: float | None = None
    avg_per_person: float | None = None
    yours: float | None = None
    pct_diff: float | None = None
    household_count: int | None = None


class WardRank(BaseModel):
    available: bool
    line: str | None = None
    pct_diff: float | None = None
    reason: str | None = None


class DashboardOut(BaseModel):
    electricity: ResourceSummary
    water: ResourceSummary
    lpg: LpgSummary
    green_score: GreenScoreOut | None = None
    normalisation_note: str = NORMALISATION_NOTE
    unread_alerts: int = 0
    ward_rank: WardRank


class ElectricityPoint(BaseModel):
    period_start: date
    period_end: date
    kwh: float
    kwh_per_30d: float


class ApplianceShare(BaseModel):
    type: str
    label: str
    kwh: float
    pct: float


class ElectricityInsights(BaseModel):
    history: list[ElectricityPoint] = Field(default_factory=list)
    baseline: BaselineOut | None = None
    appliance_breakdown: list[ApplianceShare] = Field(default_factory=list)
    unknown_load: float = 0.0
    estimate_note: str = ESTIMATE_NOTE
    tips: list[str] = Field(default_factory=list)
    over_baseline: bool = False
    peer_comparison: PeerComparison


class WaterPoint(BaseModel):
    reading_date: date
    liters: float


class WaterMonth(BaseModel):
    month: date
    avg_liters: float
    total_liters: float
    days_logged: int


class WaterInsights(BaseModel):
    history: list[WaterPoint] = Field(default_factory=list)
    monthly: list[WaterMonth] = Field(default_factory=list)
    baseline: BaselineOut | None = None
    tips: list[str] = Field(default_factory=list)
    over_baseline: bool = False
    peer_comparison: PeerComparison


class LpgInsights(BaseModel):
    cycles: list[dict[str, Any]] = Field(default_factory=list)
    current: LpgSummary
    baseline: BaselineOut | None = None
    tips: list[str] = Field(default_factory=list)
    over_baseline: bool = False


class GreenScoreInsights(BaseModel):
    current: GreenScoreOut | None = None
    history: list[GreenScoreOut] = Field(default_factory=list)
    normalisation_note: str = NORMALISATION_NOTE
