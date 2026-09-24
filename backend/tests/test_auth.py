"""Auth dependency: bearer verification, first-request provisioning, role gates."""

from __future__ import annotations

import uuid

import jwt
import pytest
from fastapi import APIRouter, Depends

from app import database
from app.deps import CurrentUser, get_current_user, mint_hs256_token, require_supervisor
from app.main import app
from tests.conftest import TEST_JWT_SECRET, auth_headers_for

# A tiny probe router so these tests do not depend on Phase 1/4 routers.
_probe = APIRouter(prefix="/_probe", tags=["probe"])


@_probe.get("/me")
async def _me(user: CurrentUser = Depends(get_current_user)) -> dict:
    return {"id": str(user.id), "email": user.email, "role": user.role}


@_probe.get("/supervisor")
async def _sup(user: CurrentUser = Depends(require_supervisor)) -> dict:
    return {"ok": True, "role": user.role}


if not any(getattr(r, "path", "") == "/_probe/me" for r in app.routes):
    app.include_router(_probe)


async def test_missing_token_is_401(client):
    resp = await client.get("/_probe/me")
    assert resp.status_code == 401
    assert resp.headers.get("www-authenticate") == "Bearer"


async def test_garbage_token_is_401(client):
    resp = await client.get("/_probe/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401


async def test_expired_token_is_401(client):
    token = mint_hs256_token(uuid.uuid4(), "old@savera.test", secret=TEST_JWT_SECRET, ttl_seconds=-120)
    resp = await client.get("/_probe/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Token expired"


async def test_wrong_secret_is_401(client):
    token = mint_hs256_token(uuid.uuid4(), "x@savera.test", secret="another-secret")
    resp = await client.get("/_probe/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


async def test_wrong_audience_is_401(client):
    token = mint_hs256_token(uuid.uuid4(), "x@savera.test", secret=TEST_JWT_SECRET, audience="anon")
    resp = await client.get("/_probe/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


async def test_unsupported_alg_is_401(client):
    token = jwt.encode({"sub": str(uuid.uuid4()), "exp": 4102444800}, "k", algorithm="HS512")
    resp = await client.get("/_probe/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


async def test_first_request_provisions_user(client):
    uid = uuid.uuid4()
    headers = auth_headers_for(uid, "New.Person@Example.com")
    resp = await client.get("/_probe/me", headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body == {"id": str(uid), "email": "new.person@example.com", "role": "citizen"}
    row = await database.fetchrow("SELECT id, email, role, household_size FROM users WHERE id = $1", uid)
    assert row is not None and row["household_size"] == 1

    # second request must reuse the row, not duplicate it
    resp2 = await client.get("/_probe/me", headers=headers)
    assert resp2.status_code == 200
    assert await database.fetchval("SELECT COUNT(*) FROM users WHERE email = $1", "new.person@example.com") == 1


async def test_existing_email_with_different_sub_is_adopted(client, make_user):
    """Seeded users keep their own UUID; a Supabase login with the same email maps onto them."""
    seeded, _ = await make_user(email="seeded@savera.test", household_size=4)
    headers = auth_headers_for(uuid.uuid4(), "seeded@savera.test")
    resp = await client.get("/_probe/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == str(seeded["id"])


async def test_supervisor_gate(client, citizen, supervisor):
    _, citizen_headers = citizen
    _, supervisor_headers = supervisor
    assert (await client.get("/_probe/supervisor", headers=citizen_headers)).status_code == 403
    resp = await client.get("/_probe/supervisor", headers=supervisor_headers)
    assert resp.status_code == 200 and resp.json()["role"] == "supervisor"


async def test_healthz(client):
    resp = await client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json()["db"] is True


@pytest.mark.parametrize("bad", ["", "Basic abc", "bearer"])
async def test_malformed_authorization_header(client, bad):
    resp = await client.get("/_probe/me", headers={"Authorization": bad} if bad else {})
    assert resp.status_code == 401
