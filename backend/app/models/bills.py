"""Pydantic models for the bill-photo OCR flow (PHASE0_PLAN.md section 6).

Upload answers 202 with a job id; the client polls ``GET /bills/jobs/{id}`` until the status
leaves ``pending`` and then shows the extraction for confirmation. Nothing is ever saved as a
reading by OCR alone — the user presses save on ``POST /readings/electricity``.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

OcrStatus = Literal["pending", "done", "failed"]
OcrEngine = Literal["gcv", "tesseract", "none"]


class BillExtractionOut(BaseModel):
    """What the parser read off the bill. Every field is a suggestion, not a fact."""

    kwh: float | None = None
    billing_period_start: date | None = None
    billing_period_end: date | None = None
    billed_amount: float | None = None
    utility: str | None = None
    field_confidence: dict[str, int] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


class OcrJobCreated(BaseModel):
    id: UUID
    status: OcrStatus


class OcrJobOut(BaseModel):
    id: UUID
    status: OcrStatus
    engine: OcrEngine | None = None
    confidence: int | None = None
    needs_review: bool | None = None
    extraction: BillExtractionOut | None = None
    raw_text: str | None = None
    image_url: str | None = None
    error_code: str | None = None
    reading_id: UUID | None = None
    created_at: datetime
    finished_at: datetime | None = None

    @classmethod
    def from_row(cls, row) -> OcrJobOut:  # asyncpg.Record or dict
        extraction = row["extraction"]
        return cls(
            id=row["id"],
            status=row["status"],
            engine=row["engine"],
            confidence=row["confidence"],
            needs_review=row["needs_review"],
            extraction=BillExtractionOut(**extraction) if extraction else None,
            raw_text=row["raw_text"],
            image_url=f"/bills/jobs/{row['id']}/image",
            error_code=row["error_code"],
            reading_id=row["reading_id"],
            created_at=row["created_at"],
            finished_at=row["finished_at"],
        )
