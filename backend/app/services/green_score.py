"""Green Score: 0-100 per resource, then averaged (SPEC §5.4, adopted deviation in
docs/PHASE0_PLAN.md §5.4).

The brief's literal formula jumps from 100 at the mean straight to 80 just above it, so a
perfectly stable household oscillates ~20 points on pure noise. The adopted continuous
variant below fixes that while keeping every one of the brief's invariants: 100 at or below
the mean, a 0 floor, per-household-member normalisation, and a capped +5 improvement bonus.
Swapping back to the brief's literal piecewise formula is a one-function change; both are
covered by this module's tests.

    between mean and upper : score = 100 - 60 * (current - mean) / (upper - mean)   # 100 -> 40
    above upper            : score = max(0, 40 - (pct_over - pct_upper))            # continuous at upper

Normalisation divides consumption by household_size before comparing, so a family of five
is never penalised next to a single person living alone.
"""

from __future__ import annotations

from typing import Any

IMPROVEMENT_BONUS = 5.0
SCORE_AT_UPPER = 40.0


def _field(baseline: Any, name: str) -> float:
    if isinstance(baseline, dict):
        return float(baseline[name])
    return float(baseline[name])


def resource_score(
    current: float | None,
    baseline: dict[str, Any] | None,
    household_size: int,
    *,
    previous_score: float | None = None,
) -> float | None:
    """0-100 for one resource, or None when there is nothing to compare against yet.

    100 at or below the household's usual; falls to ``SCORE_AT_UPPER`` exactly at the
    anomaly threshold, then keeps falling (never below 0) the further over it goes. A
    score that improved on last month gets +5, capped at 100.
    """
    if baseline is None or current is None:
        return None

    size = max(1, household_size)
    normalised = current / size
    norm_mean = _field(baseline, "mean") / size
    norm_upper = _field(baseline, "upper_threshold") / size

    if normalised <= norm_mean:
        score = 100.0
    elif normalised <= norm_upper:
        span = norm_upper - norm_mean
        score = 100.0 - 60.0 * (normalised - norm_mean) / span if span > 0 else SCORE_AT_UPPER
    else:
        pct_over = (normalised - norm_mean) / norm_mean * 100 if norm_mean else 0.0
        pct_upper = (norm_upper - norm_mean) / norm_mean * 100 if norm_mean else 0.0
        score = max(0.0, SCORE_AT_UPPER - (pct_over - pct_upper))

    score = max(0.0, min(100.0, score))
    if previous_score is not None and score > previous_score:
        score = min(100.0, score + IMPROVEMENT_BONUS)
    return round(score, 1)


def compute_total_score(scores: list[float | None]) -> float | None:
    """Average of whichever resource scores are available; None only when none are."""
    valid = [s for s in scores if s is not None]
    return round(sum(valid) / len(valid), 1) if valid else None


def ward_percentile(score: float, ward_scores: list[float]) -> float | None:
    """Percentage of the ward's other scores this one is at or above (higher green score,
    higher percentile). None when the ward has no other scored households yet.
    """
    if not ward_scores:
        return None
    at_or_below = sum(1 for other in ward_scores if other <= score)
    return round(at_or_below / len(ward_scores) * 100, 1)
