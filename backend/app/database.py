"""asyncpg connection pool + thin query helpers.

Time-series queries are written as raw SQL on purpose (no ORM), per the spec.
"""

from __future__ import annotations

import json
from typing import Any

import asyncpg

from app.config import get_settings

_pool: asyncpg.Pool | None = None


async def _init_connection(conn: asyncpg.Connection) -> None:
    # Transparent JSONB <-> dict conversion for alerts.context etc.
    await conn.set_type_codec(
        "jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog", format="text"
    )
    await conn.set_type_codec(
        "json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog", format="text"
    )


async def connect(dsn: str | None = None, *, min_size: int = 1, max_size: int = 10) -> asyncpg.Pool:
    """Create the global pool (idempotent)."""
    global _pool
    if _pool is not None:
        return _pool
    _pool = await asyncpg.create_pool(
        dsn or get_settings().database_url,
        min_size=min_size,
        max_size=max_size,
        init=_init_connection,
        command_timeout=30,
    )
    return _pool


async def disconnect() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialised — call database.connect() first")
    return _pool


def is_connected() -> bool:
    return _pool is not None


# --- convenience helpers (each acquires a pooled connection) -------------------------------


async def fetch(query: str, *args: Any) -> list[asyncpg.Record]:
    async with get_pool().acquire() as conn:
        return await conn.fetch(query, *args)


async def fetchrow(query: str, *args: Any) -> asyncpg.Record | None:
    async with get_pool().acquire() as conn:
        return await conn.fetchrow(query, *args)


async def fetchval(query: str, *args: Any) -> Any:
    async with get_pool().acquire() as conn:
        return await conn.fetchval(query, *args)


async def execute(query: str, *args: Any) -> str:
    async with get_pool().acquire() as conn:
        return await conn.execute(query, *args)


def record_to_dict(record: asyncpg.Record | None) -> dict[str, Any] | None:
    return dict(record) if record is not None else None


def records_to_dicts(records: list[asyncpg.Record]) -> list[dict[str, Any]]:
    return [dict(r) for r in records]
