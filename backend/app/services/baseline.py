"""Baseline computation and anomaly detection (docs/PHASE0_PLAN.md §5.2, filling SPEC §5.2).

Plain statistics — mean, standard deviation, a 1.5 sigma threshold — over each user's own
history. Nothing here is machine learning or forecasting; the word is "your usual", never
"predicted" or "AI".

Units, so a baseline and the value being checked against it are always comparable:
  electricity : kWh per 30 days = kwh / billing_days * 30 (see app.models.readings.kwh_per_30d)
  water       : litres per day (one sample per logged day)
  lpg         : kg per day (closed cycles' daily_burn_rate)

Windows (services/pipeline.py passes these): last 6 bills, last 90 daily water samples
(though alerts only fire from the last 14 — see alerts_svc), last 6 closed LPG cycles.

Walk-forward: a reading is checked against the baseline built from samples strictly before
it, so an anomaly can never be judged using its own value. ``baselines`` in the database is a
display/next-check cache, refreshed after every reading and on the 1st of each month.
"""

from __future__ import annotations

import statistics
from typing import Any, Literal, TypedDict

MIN_SAMPLES = 3
ANOMALY_SIGMA = 1.5
STD_DEV_FLOOR_PCT = 0.10  # a std dev floor of 10% of the mean so a flat history still detects


class Baseline(TypedDict):
    mean: float
    std_dev: float
    upper_threshold: float
    lower_threshold: float
    sample_count: int


Severity = Literal["none", "medium", "high"]
Direction = Literal["over", "under", "normal"]


class AnomalyResult(TypedDict):
    is_anomaly: bool
    pct_over: float
    z_score: float
    severity: Severity
    direction: Direction


def compute_baseline(values: list[float]) -> Baseline | None:
    """A user's "usual" for one resource, or None when there is not enough history yet.

    Needs at least 3 samples (``MIN_SAMPLES``) — the schema itself enforces this
    (``baselines.sample_count >= 3``), so a computed baseline is always insertable.
    """
    if len(values) < MIN_SAMPLES:
        return None
    mean = statistics.fmean(values)
    raw_std = statistics.stdev(values)
    std_dev = max(raw_std, STD_DEV_FLOOR_PCT * mean)
    upper = mean + ANOMALY_SIGMA * std_dev
    lower = max(0.0, mean - ANOMALY_SIGMA * std_dev)
    return {
        "mean": mean,
        "std_dev": std_dev,
        "upper_threshold": upper,
        "lower_threshold": lower,
        "sample_count": len(values),
    }


def _baseline_field(baseline: Any, name: str) -> float:
    if isinstance(baseline, dict):
        return float(baseline[name])
    return float(baseline[name])  # asyncpg.Record supports the same __getitem__


def check_anomaly(current: float, baseline: Baseline | Any) -> AnomalyResult:
    """Is `current` unusual against `baseline`? Severity and direction, not just a flag.

    ``is_anomaly`` fires only above the upper threshold — a quiet month is celebrated
    (see green_score / the ``milestone`` alert), never flagged as a problem.
    """
    mean = _baseline_field(baseline, "mean")
    std_dev = _baseline_field(baseline, "std_dev")
    upper = _baseline_field(baseline, "upper_threshold")
    lower = _baseline_field(baseline, "lower_threshold")

    pct_over = (current - mean) / mean * 100 if mean else 0.0
    z_score = (current - mean) / std_dev if std_dev else 0.0
    is_anomaly = current > upper

    severity: Severity = "none"
    if is_anomaly:
        severity = "high" if (z_score >= 3 or pct_over >= 30) else "medium"

    if current > mean:
        direction: Direction = "over"
    elif current < lower:
        direction = "under"
    else:
        direction = "normal"

    return {
        "is_anomaly": is_anomaly,
        "pct_over": round(pct_over, 2),
        "z_score": round(z_score, 2),
        "severity": severity,
        "direction": direction,
    }
