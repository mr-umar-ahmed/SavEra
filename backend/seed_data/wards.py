"""Seed the BBMP ward list from ``wards.sql``.

    python -m seed_data.wards            # applies wards.sql against DATABASE_URL

The SQL inserts by name with ``ON CONFLICT (city, name) DO NOTHING`` (never explicit ids), so
it is safe to run repeatedly and against a database that already holds some of the wards.
``seed_wards(pool)`` is the programmatic entry point used by ``seed_data.test_users`` and the
test-suite.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import asyncpg

WARDS_SQL_PATH = Path(__file__).with_name("wards.sql")


def load_wards_sql() -> str:
    return WARDS_SQL_PATH.read_text(encoding="utf-8")


async def seed_wards(pool: asyncpg.Pool) -> int:
    """Apply ``wards.sql`` (idempotent) and return the number of ward rows in the table."""
    sql = load_wards_sql()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(sql)
        return int(await conn.fetchval("SELECT COUNT(*) FROM wards"))


async def _main() -> int:
    from app.config import get_settings  # local import so the module imports without the app

    dsn = get_settings().database_url
    pool = await asyncpg.create_pool(dsn, min_size=1, max_size=2)
    try:
        total = await seed_wards(pool)
    finally:
        await pool.close()
    print(f"wards: applied {WARDS_SQL_PATH.name}; {total} ward rows now present")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(_main()))
