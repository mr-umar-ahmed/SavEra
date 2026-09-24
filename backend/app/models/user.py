"""Pydantic v2 request/response schemas for /profile, /profile/appliances and /wards."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.services.appliance import VALID_TYPES

# --- wards -------------------------------------------------------------------------------


class WardOut(BaseModel):
    id: int
    name: str
    city: str
    lat: float | None = None
    lng: float | None = None


# --- profile -----------------------------------------------------------------------------


class ProfileOut(BaseModel):
    """The signed-in user's own profile.

    * ``push_enabled``        = ``users.fcm_token IS NOT NULL`` (opt-in stores a token, opt-out
                                clears it; there is no separate flag column).
    * ``onboarding_complete`` = ``users.ward_id IS NOT NULL``. Picking a ward is the one
                                onboarding step the app cannot default; the appliance list may
                                legitimately be empty, so it is not part of the definition.
    """

    id: UUID
    email: str
    name: str | None = None
    ward_id: int | None = None
    ward_name: str | None = None
    household_size: int
    city: str
    role: str
    push_enabled: bool
    onboarding_complete: bool
    created_at: datetime


class ProfileUpdate(BaseModel):
    """PATCH body — only the fields present are updated (``model_fields_set``).

    ``name`` and ``ward_id`` accept an explicit ``null`` to clear them; ``household_size`` and
    ``city`` do not.
    """

    name: str | None = Field(default=None, max_length=120)
    ward_id: int | None = Field(default=None, ge=1)
    household_size: int | None = Field(default=None, ge=1, le=20)
    city: str | None = Field(default=None, min_length=1, max_length=80)

    @field_validator("name", "city", mode="before")
    @classmethod
    def _strip(cls, v: Any) -> Any:
        if isinstance(v, str):
            v = v.strip()
        return v

    @field_validator("name")
    @classmethod
    def _empty_name_is_null(cls, v: str | None) -> str | None:
        return v or None

    @model_validator(mode="after")
    def _no_null_for_required_columns(self) -> ProfileUpdate:
        for field in ("household_size", "city"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class PushTokenIn(BaseModel):
    fcm_token: str = Field(min_length=1, max_length=4096)

    @field_validator("fcm_token", mode="before")
    @classmethod
    def _strip(cls, v: Any) -> Any:
        return v.strip() if isinstance(v, str) else v


# --- appliances --------------------------------------------------------------------------


class ApplianceIn(BaseModel):
    type: str
    count: int = Field(default=1, ge=1, le=10)
    daily_hours: float = Field(default=4.0, ge=0, le=24)
    star_rating: int | None = Field(default=None, ge=1, le=5)
    wattage_override: float | None = Field(default=None, gt=0)

    @field_validator("type")
    @classmethod
    def _known_type(cls, v: str) -> str:
        if v not in VALID_TYPES:
            raise ValueError(f"unknown appliance type {v!r}; expected one of {list(VALID_TYPES)}")
        return v


class AppliancesPut(BaseModel):
    """Replace-all payload: the list *is* the profile (an empty list clears it)."""

    appliances: list[ApplianceIn] = Field(default_factory=list, max_length=len(VALID_TYPES))

    @model_validator(mode="after")
    def _no_duplicate_types(self) -> AppliancesPut:
        seen: set[str] = set()
        dupes: list[str] = []
        for a in self.appliances:
            if a.type in seen and a.type not in dupes:
                dupes.append(a.type)
            seen.add(a.type)
        if dupes:
            raise ValueError(
                f"duplicate appliance type(s) {dupes}; use 'count' for several of the same kind"
            )
        return self


class ApplianceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    count: int
    daily_hours: float
    star_rating: int | None = None
    wattage_override: float | None = None
    effective_watts: float  # estimated from BEE wattages (or the user's override)


class ApplianceTypeOut(BaseModel):
    type: str
    label: str
    has_star_rating: bool
    default_hours: float
    always_on: bool
    watts_by_star: dict[str, float]
    default_watts: float
