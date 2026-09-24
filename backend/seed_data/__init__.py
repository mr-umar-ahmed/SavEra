"""Deterministic seed data for SAVERA (docs/PHASE0_PLAN.md section 8).

* ``seed_data.wards``      - ~30 named BBMP wards (``wards.sql``), by name, never explicit ids.
* ``seed_data.test_users`` - three named demo households + 39 filler households with six
  months (Apr-Sep 2026) of electricity bills, daily water readings and LPG cycles.

Everything is reproducible: ids are ``uuid5`` of a stable key, values come from
``random.Random`` seeded from ``--seed`` (default 42), and the "as of" date defaults to
``SEED_TODAY`` so LPG open-cycle states are the same on every machine.
"""

from __future__ import annotations

import uuid
from datetime import date

#: The date the demo dataset is anchored on (LPG open cycles are placed relative to it).
SEED_TODAY = date(2026, 9, 24)

#: Every seeded user has an email under this domain; ``--reset`` deletes exactly those rows.
SEED_EMAIL_DOMAIN = "savera.test"

_NAMESPACE = uuid.NAMESPACE_URL


def seed_uuid(kind: str, key: str) -> uuid.UUID:
    """Stable id for a seeded row: ``uuid5(NAMESPACE_URL, "savera:seed:<kind>:<key>")``."""
    return uuid.uuid5(_NAMESPACE, f"savera:seed:{kind}:{key}")


def seed_user_id(slug: str) -> uuid.UUID:
    """``uuid5(NAMESPACE_URL, "savera:seed:user:<slug>")`` - the id of a seeded user."""
    return seed_uuid("user", slug)


__all__ = ["SEED_EMAIL_DOMAIN", "SEED_TODAY", "seed_user_id", "seed_uuid"]
