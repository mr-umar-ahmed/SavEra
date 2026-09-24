"""Profile, appliance profile and ward lookup routes (docs/PHASE0_PLAN.md §6).

    GET    /profile                  ProfileOut
    PATCH  /profile                  partial update -> ProfileOut
    PUT    /profile/push-token       {fcm_token} -> 204   (push opt-in)
    DELETE /profile/push-token       -> 204               (push opt-out clears the token)
    GET    /profile/appliances       [ApplianceOut]
    PUT    /profile/appliances       {appliances:[...]} -> [ApplianceOut]  (transactional replace-all)
    GET    /profile/appliance-types  static catalog
    GET    /wards?city=              [WardOut]

Definitions surfaced on ProfileOut:
    push_enabled        = fcm_token IS NOT NULL
    onboarding_complete = ward_id IS NOT NULL   (see models/user.py::ProfileOut)

``router`` is exported without a prefix and composes two sub-routers (``/profile`` and
``/wards``) so that ``app.include_router(profile.router, prefix="/api/v1")`` in main.py
yields both ``/api/v1/profile/*`` and ``/api/v1/wards`` — the contract needs the ward
selector outside ``/profile``. Every route requires a bearer token and scopes its SQL by
the authenticated user's id.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app import database
from app.deps import CurrentUser, get_current_user
from app.models.user import (
    ApplianceOut,
    AppliancesPut,
    ApplianceTypeOut,
    ProfileOut,
    ProfileUpdate,
    PushTokenIn,
    WardOut,
)
from app.services.appliance import APPLIANCE_CATALOG, VALID_TYPES, effective_watts

_profile = APIRouter(prefix="/profile", tags=["profile"])
_wards = APIRouter(prefix="/wards", tags=["wards"])

_PROFILE_SQL = """
    SELECT u.id, u.email, u.name, u.ward_id, w.name AS ward_name, u.household_size, u.city,
           u.role, (u.fcm_token IS NOT NULL) AS push_enabled,
           (u.ward_id IS NOT NULL) AS onboarding_complete, u.created_at
    FROM users u
    LEFT JOIN wards w ON w.id = u.ward_id
    WHERE u.id = $1
"""

_APPLIANCE_COLUMNS = "id, type, count, daily_hours, star_rating, wattage_override"
_CATALOG_ORDER = {t: i for i, t in enumerate(VALID_TYPES)}


def _validation_error(field: str, msg: str) -> HTTPException:
    """422 shaped like FastAPI's own body-validation errors so clients handle both alike."""
    return HTTPException(
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=[{"type": "value_error", "loc": ["body", field], "msg": msg}],
    )


async def _load_profile(user_id: UUID) -> ProfileOut:
    row = await database.fetchrow(_PROFILE_SQL, user_id)
    if row is None:  # the auth dependency provisioned it moments ago; only a race can hit this
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    return ProfileOut(**dict(row))


def _appliance_out(row: Any) -> ApplianceOut:
    data = dict(row)
    return ApplianceOut(**data, effective_watts=effective_watts(data))


def _sorted_appliances(rows: list[Any]) -> list[ApplianceOut]:
    out = [_appliance_out(r) for r in rows]
    out.sort(key=lambda a: _CATALOG_ORDER.get(a.type, len(_CATALOG_ORDER)))
    return out


# --- /profile ----------------------------------------------------------------------------


@_profile.get("", response_model=ProfileOut)
async def get_profile(user: CurrentUser = Depends(get_current_user)) -> ProfileOut:
    return await _load_profile(user.id)


@_profile.patch("", response_model=ProfileOut)
async def update_profile(
    body: ProfileUpdate, user: CurrentUser = Depends(get_current_user)
) -> ProfileOut:
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        return await _load_profile(user.id)

    if changes.get("ward_id") is not None:
        exists = await database.fetchval("SELECT 1 FROM wards WHERE id = $1", changes["ward_id"])
        if exists is None:
            raise _validation_error("ward_id", f"ward {changes['ward_id']} does not exist")

    # Column names come from ProfileUpdate's declared fields only — never from client keys.
    assignments = [f"{column} = ${i}" for i, column in enumerate(changes, start=2)]
    try:
        await database.execute(
            f"UPDATE users SET {', '.join(assignments)} WHERE id = $1",
            user.id,
            *changes.values(),
        )
    except asyncpg.ForeignKeyViolationError as exc:  # ward deleted between check and update
        raise _validation_error("ward_id", "ward does not exist") from exc
    except asyncpg.CheckViolationError as exc:
        raise _validation_error("household_size", str(exc)) from exc
    return await _load_profile(user.id)


@_profile.put("/push-token", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def set_push_token(
    body: PushTokenIn, user: CurrentUser = Depends(get_current_user)
) -> Response:
    await database.execute("UPDATE users SET fcm_token = $2 WHERE id = $1", user.id, body.fcm_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@_profile.delete("/push-token", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def clear_push_token(user: CurrentUser = Depends(get_current_user)) -> Response:
    await database.execute("UPDATE users SET fcm_token = NULL WHERE id = $1", user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- /profile/appliances -------------------------------------------------------------------


@_profile.get("/appliance-types", response_model=list[ApplianceTypeOut])
async def list_appliance_types(
    user: CurrentUser = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return APPLIANCE_CATALOG


@_profile.get("/appliances", response_model=list[ApplianceOut])
async def list_appliances(user: CurrentUser = Depends(get_current_user)) -> list[ApplianceOut]:
    rows = await database.fetch(
        f"SELECT {_APPLIANCE_COLUMNS} FROM appliances WHERE user_id = $1", user.id
    )
    return _sorted_appliances(rows)


@_profile.put("/appliances", response_model=list[ApplianceOut])
async def replace_appliances(
    body: AppliancesPut, user: CurrentUser = Depends(get_current_user)
) -> list[ApplianceOut]:
    """Replace the whole appliance profile in one transaction (the list *is* the profile)."""
    items = body.appliances
    try:
        async with database.get_pool().acquire() as conn, conn.transaction():
            await conn.execute("DELETE FROM appliances WHERE user_id = $1", user.id)
            if not items:
                return []
            rows = await conn.fetch(
                f"""
                INSERT INTO appliances (user_id, type, count, daily_hours, star_rating, wattage_override)
                SELECT $1, t.type, t.count, t.daily_hours, t.star_rating, t.wattage_override
                FROM unnest($2::text[], $3::int[], $4::float8[], $5::int[], $6::float8[])
                     AS t(type, count, daily_hours, star_rating, wattage_override)
                RETURNING {_APPLIANCE_COLUMNS}
                """,
                user.id,
                [a.type for a in items],
                [a.count for a in items],
                [a.daily_hours for a in items],
                [a.star_rating for a in items],
                [a.wattage_override for a in items],
            )
    except asyncpg.UniqueViolationError as exc:  # defence in depth: the model already rejects dupes
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Duplicate appliance type in profile"
        ) from exc
    except asyncpg.CheckViolationError as exc:
        raise _validation_error("appliances", str(exc)) from exc
    return _sorted_appliances(rows)


# --- /wards ----------------------------------------------------------------------------------


@_wards.get("", response_model=list[WardOut])
async def list_wards(
    city: str | None = Query(default=None, max_length=80, description="Defaults to every city"),
    user: CurrentUser = Depends(get_current_user),
) -> list[dict[str, Any]]:
    city = city.strip() if city else None
    rows = await database.fetch(
        """
        SELECT id, name, city, lat, lng
        FROM wards
        WHERE $1::text IS NULL OR lower(city) = lower($1::text)
        ORDER BY name, id
        """,
        city or None,
    )
    return database.records_to_dicts(rows)


router = APIRouter()
router.include_router(_profile)
router.include_router(_wards)
