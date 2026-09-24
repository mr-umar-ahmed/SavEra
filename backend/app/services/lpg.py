"""LPG burn rate and cylinder finish prediction (SPEC 5.3).

Plain arithmetic, honestly labelled: the burn rate is the mean of the newest three closed
cycles' daily burn rates ("your usual, the average of past cylinders") or, when a user has
no closed cycle yet, the national-average default of 14.2 kg per 25 days. There is no
forecasting model of any kind.

Deviation from the spec listing (adopted in PHASE0_PLAN 5.3): ``predict_finish`` takes an
injectable ``today`` so tests and the 07:00 IST scheduler job are deterministic; it defaults
to the current date in Asia/Kolkata. Cycles may be objects with attributes (dataclasses),
mappings (asyncpg rows) or plain dicts.
"""

from __future__ import annotations

import statistics
from collections.abc import Iterable
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

DEFAULT_BURN_RATE = 14.2 / 25  # 0.568 kg/day (national average)
REFILL_BUFFER_DAYS = 3  # trigger alert 3 days before predicted finish
HISTORY_CYCLES = 3  # newest closed cycles averaged into "your usual"

IST = ZoneInfo("Asia/Kolkata")

PREDICTION_KEYS = (
    "estimated_finish_date",
    "refill_alert_date",
    "kg_remaining",
    "burn_rate_kg_per_day",
    "days_to_empty",
    "should_alert_now",
)


def today_ist() -> date:
    """Calendar date in India Standard Time (the only timezone SAVERA reasons in)."""
    return datetime.now(IST).date()


def _field(cycle: Any, name: str) -> Any:
    """Read ``name`` from a dict, a mapping (asyncpg.Record) or an attribute-style object."""
    if isinstance(cycle, dict):
        return cycle.get(name)
    try:
        return cycle[name]
    except (TypeError, KeyError, IndexError):
        return getattr(cycle, name, None)


def close_cycle(cycle: Any) -> float:
    """Compute daily burn rate when user marks cylinder as finished."""
    days = (_field(cycle, "end_date") - _field(cycle, "start_date")).days
    if days <= 0:
        return DEFAULT_BURN_RATE
    return round(float(_field(cycle, "cylinder_kg")) / days, 4)


def burn_rate_from_history(historical_cycles: Iterable[Any]) -> float:
    """Mean daily burn rate of the newest ``HISTORY_CYCLES`` closed cycles, else the default.

    ``historical_cycles`` must be ordered newest first. Cycles without a positive burn rate
    are skipped, so an empty or all-open history yields ``DEFAULT_BURN_RATE``.
    """
    rates: list[float] = []
    for cycle in historical_cycles:
        rate = _field(cycle, "daily_burn_rate")
        if rate:
            rates.append(float(rate))
        if len(rates) == HISTORY_CYCLES:
            break
    burn_rate = statistics.mean(rates) if rates else DEFAULT_BURN_RATE
    if burn_rate <= 0:  # a corrupt negative rate must never invert the prediction
        return DEFAULT_BURN_RATE
    return burn_rate


def predict_finish(
    current_cycle: Any,
    historical_cycles: Iterable[Any],
    today: date | None = None,
) -> dict[str, Any]:
    """Predict the finish date for an active (unclosed) cycle.

    ``historical_cycles``: closed cycles with ``daily_burn_rate``, newest first.
    Always returns a result: a user's very first cycle uses ``DEFAULT_BURN_RATE``.
    """
    today = today or today_ist()
    burn_rate = burn_rate_from_history(historical_cycles)
    cylinder_kg = float(_field(current_cycle, "cylinder_kg"))
    start_date: date = _field(current_cycle, "start_date")

    days_elapsed = max(0, (today - start_date).days)
    kg_consumed = burn_rate * days_elapsed
    kg_remaining = max(0.0, cylinder_kg - kg_consumed)
    days_to_empty = kg_remaining / burn_rate if burn_rate > 0 else 999
    # +1e-9 guards against a 4.999999... float truncating to 4 when the true quotient is 5.
    whole_days_to_empty = int(days_to_empty + 1e-9)
    finish_date = today + timedelta(days=whole_days_to_empty)
    alert_date = finish_date - timedelta(days=REFILL_BUFFER_DAYS)

    return {
        "estimated_finish_date": finish_date.isoformat(),
        "refill_alert_date": alert_date.isoformat(),
        "kg_remaining": round(kg_remaining, 2),
        "burn_rate_kg_per_day": round(burn_rate, 3),
        "days_to_empty": whole_days_to_empty,
        "should_alert_now": today >= alert_date,
        # extras (allowed by the plan): what the tracker card renders
        "pct_remaining": round(kg_remaining / cylinder_kg * 100, 1) if cylinder_kg > 0 else 0.0,
        "days_elapsed": days_elapsed,
    }
