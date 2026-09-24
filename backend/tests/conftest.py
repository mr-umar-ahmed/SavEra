"""Shared pytest fixtures.

Integration tests run against a real PostgreSQL 15 + TimescaleDB database
(TEST_DATABASE_URL, default postgresql://postgres:postgres@127.0.0.1:55432/savera_test).
The database is created if missing and migrated to head once per session; every test
starts from truncated tables plus a handful of wards.

Auth in tests: tokens are minted with the HS256 secret "test-secret" (see deps.mint_hs256_token),
exactly the shape Supabase issues, so no live Supabase project is needed.
"""

from __future__ import annotations

import os
import uuid
from collections.abc import AsyncIterator, Callable
from pathlib import Path
from typing import Any

import asyncpg
import pytest
from alembic import command
from alembic.config import Config

BACKEND_DIR = Path(__file__).resolve().parents[1]
TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:55432/savera_test"
)
TEST_JWT_SECRET = "test-secret-with-at-least-32-bytes-of-entropy!!"

# Must be set before `app.*` is imported anywhere (settings are cached on first access).
os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["SUPABASE_JWT_SECRET"] = TEST_JWT_SECRET
os.environ["SUPABASE_URL"] = ""
os.environ["SCHEDULER_ENABLED"] = "false"
os.environ["GCV_API_KEY"] = ""
os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"] = ""
os.environ["UPLOAD_DIR"] = str(BACKEND_DIR / ".pytest_uploads")

from app import database  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.deps import mint_hs256_token  # noqa: E402

TABLES_IN_TRUNCATE_ORDER = [
    "ocr_jobs",
    "ward_aggregates",
    "green_scores",
    "alerts",
    "baselines",
    "lpg_cycles",
    "water_readings",
    "electricity_readings",
    "appliances",
    "users",
    "wards",
]

SEED_WARDS = [
    (1, "Koramangala", 12.9352, 77.6245),
    (2, "Indiranagar", 12.9784, 77.6408),
    (3, "Jayanagar", 12.9299, 77.5826),
    (4, "Whitefield", 12.9698, 77.7500),
    (5, "Malleshwaram", 13.0035, 77.5647),
]


def _admin_url(url: str) -> tuple[str, str]:
    """Split '<server>/<dbname>' -> ('<server>/postgres', '<dbname>')."""
    base, _, dbname = url.rpartition("/")
    return f"{base}/postgres", dbname


async def _recreate_database() -> None:
    """Drop + create the test database so every session proves 'migrations run clean on a
    fresh DB'. WITH (FORCE) is required: TimescaleDB keeps a background-worker backend
    attached to each database that would otherwise block DROP for several seconds."""
    admin_url, dbname = _admin_url(TEST_DB_URL)
    conn = await asyncpg.connect(admin_url)
    try:
        await conn.execute(f'DROP DATABASE IF EXISTS "{dbname}" WITH (FORCE)')
        await conn.execute(f'CREATE DATABASE "{dbname}"')
    finally:
        await conn.close()


def _migrate_to_head() -> None:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    cfg.set_main_option("sqlalchemy.url", get_settings().sync_database_url)
    command.upgrade(cfg, "head")


@pytest.fixture(scope="session", autouse=True)
async def _database_session() -> AsyncIterator[None]:
    await _recreate_database()
    _migrate_to_head()
    await database.connect(TEST_DB_URL, min_size=1, max_size=5)
    try:
        yield
    finally:
        await database.disconnect()


@pytest.fixture(autouse=True)
async def db(_database_session: None) -> AsyncIterator[asyncpg.Pool]:
    """Clean tables before each test and seed wards."""
    pool = database.get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "TRUNCATE " + ", ".join(TABLES_IN_TRUNCATE_ORDER) + " RESTART IDENTITY CASCADE"
        )
        await conn.executemany(
            "INSERT INTO wards (id, name, city, lat, lng) VALUES ($1, $2, 'Bengaluru', $3, $4)",
            SEED_WARDS,
        )
        await conn.execute("SELECT setval('wards_id_seq', (SELECT MAX(id) FROM wards))")
    yield pool


@pytest.fixture
async def client(db: asyncpg.Pool) -> AsyncIterator[Any]:
    """httpx client bound to the ASGI app (lifespan is NOT run; the pool is already up)."""
    import httpx

    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest.fixture
def make_user(db: asyncpg.Pool) -> Callable[..., Any]:
    """Create a users row and return (user_dict, auth_headers)."""

    async def _make(
        *,
        email: str | None = None,
        name: str = "Test User",
        role: str = "citizen",
        ward_id: int | None = 1,
        household_size: int = 3,
        user_id: uuid.UUID | None = None,
    ) -> tuple[dict[str, Any], dict[str, str]]:
        uid = user_id or uuid.uuid4()
        email = email or f"user-{uid.hex[:8]}@savera.test"
        row = await database.fetchrow(
            """
            INSERT INTO users (id, email, name, role, ward_id, household_size)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, email, name, role, ward_id, household_size, city, fcm_token
            """,
            uid,
            email,
            name,
            role,
            ward_id,
            household_size,
        )
        token = mint_hs256_token(uid, email, secret=TEST_JWT_SECRET)
        return dict(row), {"Authorization": f"Bearer {token}"}

    return _make


@pytest.fixture
async def citizen(make_user: Callable[..., Any]) -> tuple[dict[str, Any], dict[str, str]]:
    return await make_user()


@pytest.fixture
async def supervisor(make_user: Callable[..., Any]) -> tuple[dict[str, Any], dict[str, str]]:
    return await make_user(role="supervisor", email="supervisor@savera.test", name="Ward Supervisor")


def auth_headers_for(user_id: uuid.UUID | str, email: str) -> dict[str, str]:
    """Helper for tests that need a token for an arbitrary (possibly not-yet-provisioned) user."""
    return {"Authorization": f"Bearer {mint_hs256_token(user_id, email, secret=TEST_JWT_SECRET)}"}
