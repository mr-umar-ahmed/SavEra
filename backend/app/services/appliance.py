"""Rule-based appliance energy estimation (docs/SPEC.md §5.1, implemented verbatim).

Everything here is *estimated from BEE wattages* (Bureau of Energy Efficiency star-label
programme) and the user's own stated daily hours. Nothing is measured; there is no signal
disaggregation of any kind, and the UI must label the numbers as estimates.

Inputs may be either objects with attributes (dataclasses, pydantic models, ``CurrentUser``-style
records) or mapping-like rows (dicts, ``asyncpg.Record``); ``_field`` is the tiny adapter that
hides the difference. ``billing_days`` is inclusive (start and end day both count).
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any

# BEE Standard Wattages (Watts) by type and star rating
# Source: Bureau of Energy Efficiency India star label programme
BEE_WATTAGE: dict[str, dict[int | None, int]] = {
    "ac_1ton": {1: 1500, 2: 1300, 3: 1100, 4: 1000, 5: 900},
    "ac_1.5ton": {1: 2200, 2: 1900, 3: 1600, 4: 1400, 5: 1200},
    "ac_2ton": {1: 2800, 2: 2500, 3: 2100, 4: 1900, 5: 1600},
    "refrigerator": {1: 85, 2: 70, 3: 55, 4: 45, 5: 35},  # always-on, 24h
    "ceiling_fan": {None: 75},
    "geyser": {None: 2000},  # 30 min/day typical
    "washing_machine": {1: 500, 2: 450, 3: 400, 4: 350, 5: 300},
    "tv_led_40": {None: 50},
    "tv_led_55": {None: 90},
    "other": {None: 100},  # conservative default
}

ALWAYS_ON: frozenset[str] = frozenset({"refrigerator"})  # daily_hours irrelevant, always 24h
GEYSER_DAILY_H = 0.5  # assume 30 min/day regardless of input

#: Watts used when the type is unknown, or a star-rated type is saved without a star rating
#: (the spec's ``.get(None, 100)`` fallback).
DEFAULT_WATTS = 100

#: The ten schema-enumerated appliance types, in catalog (display) order.
VALID_TYPES: tuple[str, ...] = tuple(BEE_WATTAGE.keys())

_LABELS: dict[str, str] = {
    "ac_1ton": "AC 1 ton",
    "ac_1.5ton": "AC 1.5 ton",
    "ac_2ton": "AC 2 ton",
    "refrigerator": "Refrigerator",
    "ceiling_fan": "Ceiling fan",
    "geyser": "Geyser",
    "washing_machine": "Washing machine",
    "tv_led_40": "TV LED 40 inch",
    "tv_led_55": "TV LED 55 inch",
    "other": "Other",
}

# Typical daily use pre-filled in the onboarding form; the user edits it. Always-on and
# geyser hours are fixed by the algorithm regardless of what is stored.
_DEFAULT_HOURS: dict[str, float] = {
    "ac_1ton": 6.0,
    "ac_1.5ton": 6.0,
    "ac_2ton": 6.0,
    "refrigerator": 24.0,
    "ceiling_fan": 8.0,
    "geyser": GEYSER_DAILY_H,
    "washing_machine": 1.0,
    "tv_led_40": 4.0,
    "tv_led_55": 4.0,
    "other": 4.0,
}


def _build_catalog() -> list[dict[str, Any]]:
    catalog: list[dict[str, Any]] = []
    for atype in VALID_TYPES:
        table = BEE_WATTAGE[atype]
        has_star = None not in table
        catalog.append(
            {
                "type": atype,
                "label": _LABELS[atype],
                "has_star_rating": has_star,
                "default_hours": _DEFAULT_HOURS[atype],
                "always_on": atype in ALWAYS_ON,
                # JSON object keys must be strings: "1".."5" for star-rated types, {} otherwise.
                "watts_by_star": {str(star): float(w) for star, w in table.items() if star},
                # What effective_watts() uses when no star rating / override is given.
                "default_watts": float(table.get(None, DEFAULT_WATTS)),
            }
        )
    return catalog


#: Static catalog served by ``GET /profile/appliance-types`` so the form and backend cannot drift.
APPLIANCE_CATALOG: list[dict[str, Any]] = _build_catalog()


def _field(appliance: Any, name: str, default: Any = None) -> Any:
    """Read ``name`` from an attribute object or a mapping-like row (dict / asyncpg.Record)."""
    if isinstance(appliance, Mapping) or (
        hasattr(appliance, "keys") and hasattr(appliance, "__getitem__")
    ):
        try:
            value = appliance[name]
        except (KeyError, IndexError, TypeError):
            value = None
    else:
        value = getattr(appliance, name, None)
    return default if value is None else value


def effective_watts(appliance: Any) -> float:
    """Wattage the estimate uses for one unit of this appliance.

    Order of precedence (exactly the spec's expression): the user's ``wattage_override``,
    then the BEE table for ``(type, star_rating)``, then the type's flat default, then 100 W.
    """
    override = _field(appliance, "wattage_override")
    if override:
        return float(override)
    table = BEE_WATTAGE.get(_field(appliance, "type"), {None: DEFAULT_WATTS})
    return float(table.get(_field(appliance, "star_rating"), table.get(None, DEFAULT_WATTS)))


def _daily_hours(appliance: Any, atype: Any) -> float:
    if atype in ALWAYS_ON:
        return 24.0
    if atype == "geyser":
        return GEYSER_DAILY_H
    return float(_field(appliance, "daily_hours", 0.0))


def estimate_breakdown(appliances: Iterable[Any], billing_days: int) -> dict[str, float]:
    """Return ``{appliance_type: kwh_estimate}`` for one billing period.

    ``billing_days`` is the inclusive length of the bill. The gap between the bill's actual
    kWh and the sum of these estimates is computed separately by :func:`find_unknown_load`
    (call it after the reading is saved, passing the actual kWh).
    """
    breakdown: dict[str, float] = {}
    for a in appliances:
        atype = _field(a, "type")
        wattage = effective_watts(a)
        hours = _daily_hours(a, atype)
        kwh = (wattage / 1000) * hours * billing_days * int(_field(a, "count", 1))
        breakdown[atype] = round(kwh, 1)
    return breakdown


def find_unknown_load(actual_kwh: float, breakdown: Mapping[str, float]) -> float:
    """kWh on the bill not explained by the profile (never negative)."""
    estimated_total = sum(breakdown.values())
    unknown = actual_kwh - estimated_total
    return max(0.0, round(unknown, 1))
