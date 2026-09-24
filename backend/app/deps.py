"""FastAPI dependencies: Supabase JWT verification, user provisioning, role gates.

Supports both Supabase signing modes:
  * ES256 / RS256 — asymmetric keys published at {SUPABASE_URL}/auth/v1/.well-known/jwks.json
    (new projects). Keys are fetched with httpx and cached for JWKS_CACHE_SECONDS.
  * HS256 — the legacy project JWT secret (SUPABASE_JWT_SECRET). The same secret is what the
    test-suite uses to mint tokens, so tests never need a live Supabase project.

The user row is provisioned on first authenticated request: lookup by id (= JWT `sub`) or by
email, insert if missing. Application role ('citizen' | 'supervisor' | 'admin') lives in our
users table, never in the JWT.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any
from uuid import UUID

import asyncpg
import httpx
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app import database
from app.config import Settings, get_settings

_bearer = HTTPBearer(auto_error=False)

ROLE_CITIZEN = "citizen"
ROLE_SUPERVISOR = "supervisor"
ROLE_ADMIN = "admin"


@dataclass(slots=True)
class CurrentUser:
    id: UUID
    email: str
    name: str | None
    role: str
    ward_id: int | None
    household_size: int
    city: str
    fcm_token: str | None

    @property
    def is_supervisor(self) -> bool:
        return self.role in (ROLE_SUPERVISOR, ROLE_ADMIN)


class TokenVerifier:
    """Verifies Supabase access tokens. One instance per process (cached JWKS)."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._jwks: dict[str, Any] = {}
        self._jwks_fetched_at: float = 0.0

    async def _load_jwks(self, force: bool = False) -> dict[str, Any]:
        fresh = (time.monotonic() - self._jwks_fetched_at) < self._settings.jwks_cache_seconds
        if self._jwks and fresh and not force:
            return self._jwks
        if not self._settings.supabase_url:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth is not configured (SUPABASE_URL)")
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(self._settings.jwks_url)
            resp.raise_for_status()
        keys: dict[str, Any] = {}
        for jwk_dict in resp.json().get("keys", []):
            kid = jwk_dict.get("kid")
            if kid:
                keys[kid] = jwt.PyJWK(jwk_dict).key
        self._jwks = keys
        self._jwks_fetched_at = time.monotonic()
        return keys

    async def verify(self, token: str) -> dict[str, Any]:
        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as exc:  # malformed
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc

        alg = header.get("alg", "")
        options = {"require": ["sub", "exp"]}
        decode_kwargs: dict[str, Any] = {
            "audience": self._settings.jwt_audience,
            "options": options,
            "leeway": 30,
        }
        if self._settings.supabase_url:
            decode_kwargs["issuer"] = f"{self._settings.supabase_url.rstrip('/')}/auth/v1"
        try:
            if alg == "HS256":
                if not self._settings.supabase_jwt_secret:
                    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "HS256 tokens are not enabled")
                claims = jwt.decode(
                    token, self._settings.supabase_jwt_secret, algorithms=["HS256"], **decode_kwargs
                )
            elif alg in ("ES256", "RS256"):
                kid = header.get("kid")
                keys = await self._load_jwks()
                key = keys.get(kid)
                if key is None:  # key rotation — refetch once
                    keys = await self._load_jwks(force=True)
                    key = keys.get(kid)
                if key is None:
                    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown signing key")
                claims = jwt.decode(token, key, algorithms=[alg], **decode_kwargs)
            else:
                raise HTTPException(
                    status.HTTP_401_UNAUTHORIZED, f"Unsupported token algorithm {alg!r}"
                )
        except jwt.ExpiredSignatureError as exc:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired") from exc
        except jwt.PyJWTError as exc:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc
        except httpx.HTTPError as exc:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Auth keys unavailable") from exc

        # Supabase anonymous sign-ins and service tokens are never SAVERA users.
        if claims.get("is_anonymous") is True or claims.get("role") not in (None, "authenticated"):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Anonymous or service tokens are not allowed")
        return claims


_verifier: TokenVerifier | None = None


def get_verifier(settings: Settings = Depends(get_settings)) -> TokenVerifier:
    global _verifier
    if _verifier is None or _verifier._settings is not settings:
        _verifier = TokenVerifier(settings)
    return _verifier


_USER_COLUMNS = "id, email, name, role, ward_id, household_size, city, fcm_token"


def _row_to_user(row: Any) -> CurrentUser:
    return CurrentUser(
        id=row["id"],
        email=row["email"],
        name=row["name"],
        role=row["role"],
        ward_id=row["ward_id"],
        household_size=row["household_size"],
        city=row["city"],
        fcm_token=row["fcm_token"],
    )


async def provision_user(claims: dict[str, Any]) -> CurrentUser:
    """Find-or-create the users row for a verified token."""
    sub = claims["sub"]
    try:
        user_id = UUID(str(sub))
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token subject is not a UUID") from exc
    email = (claims.get("email") or f"{user_id}@users.savera.invalid").lower()
    meta = claims.get("user_metadata") or {}
    name = meta.get("full_name") or meta.get("name")

    row = await database.fetchrow(
        f"SELECT {_USER_COLUMNS} FROM users WHERE id = $1 OR lower(email) = $2 LIMIT 1", user_id, email
    )
    if row is None:
        try:
            row = await database.fetchrow(
                f"""
                INSERT INTO users (id, email, name)
                VALUES ($1, $2, $3)
                ON CONFLICT (id) DO UPDATE SET email = users.email
                RETURNING {_USER_COLUMNS}
                """,
                user_id,
                email,
                name,
            )
        except asyncpg.UniqueViolationError:  # lost a race on the email unique index
            row = await database.fetchrow(
                f"SELECT {_USER_COLUMNS} FROM users WHERE lower(email) = $1", email
            )
    if row is None:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not provision user")
    return _row_to_user(row)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    verifier: TokenVerifier = Depends(get_verifier),
) -> CurrentUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    claims = await verifier.verify(credentials.credentials)
    user = await provision_user(claims)
    request.state.user = user
    return user


def require_role(*roles: str):
    async def _dep(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role")
        return user

    return _dep


require_supervisor = require_role(ROLE_SUPERVISOR, ROLE_ADMIN)
require_admin = require_role(ROLE_ADMIN)


def mint_hs256_token(
    user_id: UUID | str,
    email: str,
    *,
    secret: str,
    audience: str = "authenticated",
    ttl_seconds: int = 3600,
    extra: dict[str, Any] | None = None,
) -> str:
    """Mint a Supabase-shaped HS256 token. Used by tests and the local seed script only."""
    now = int(time.time())
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "aud": audience,
        "role": "authenticated",
        "iat": now,
        "exp": now + ttl_seconds,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, secret, algorithm="HS256")
