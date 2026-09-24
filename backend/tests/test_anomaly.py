"""check_anomaly gate (Phase 2 acceptance test vector, PHASE0_PLAN.md §5.2):
480 kWh vs a baseline of mean 330 -> is_anomaly=True, pct_over ~45%, severity high."""

from __future__ import annotations

import pytest

from app.services.baseline import check_anomaly, compute_baseline

# Mean 330, stdev 10 -> the 10%-of-mean floor (33) wins, matching the plan's "std floor 33".
BASELINE_VALUES = [320.0, 330.0, 340.0]


def test_the_spec_vector_480_over_330():
    baseline = compute_baseline(BASELINE_VALUES)
    assert baseline["mean"] == pytest.approx(330.0)
    assert baseline["std_dev"] == pytest.approx(33.0)

    result = check_anomaly(480.0, baseline)
    assert result["is_anomaly"] is True
    assert result["pct_over"] == pytest.approx(45.45, abs=0.01)
    assert result["severity"] == "high"
    assert result["direction"] == "over"


def test_a_reading_at_the_mean_is_not_anomalous():
    baseline = compute_baseline(BASELINE_VALUES)
    result = check_anomaly(330.0, baseline)
    assert result["is_anomaly"] is False
    assert result["severity"] == "none"
    assert result["direction"] == "normal"


def test_medium_severity_between_upper_and_the_high_cutoffs():
    baseline = compute_baseline(BASELINE_VALUES)  # upper = 330 + 1.5*33 = 379.5
    result = check_anomaly(385.0, baseline)  # just over upper, but well under 30% or z>=3
    assert result["is_anomaly"] is True
    assert result["severity"] == "medium"


def test_severity_is_high_when_z_score_crosses_three_even_if_pct_is_under_30():
    baseline = compute_baseline([100.0, 100.0, 100.0])  # std dev floor = 10
    # 30% over the mean (130) is comfortably under the 30% cutoff on its own,
    # but z = (130-100)/10 = 3.0 -> high anyway.
    result = check_anomaly(130.0, baseline)
    assert result["pct_over"] == pytest.approx(30.0)
    assert result["z_score"] == pytest.approx(3.0)
    assert result["severity"] == "high"


def test_direction_under_below_the_lower_threshold():
    baseline = compute_baseline(BASELINE_VALUES)  # lower = 330 - 1.5*33 = 280.5
    result = check_anomaly(250.0, baseline)
    assert result["is_anomaly"] is False  # only ever True above the upper threshold
    assert result["direction"] == "under"


def test_accepts_a_mapping_style_baseline_not_just_the_typed_dict():
    baseline = {
        "mean": 330.0,
        "std_dev": 33.0,
        "upper_threshold": 379.5,
        "lower_threshold": 280.5,
        "sample_count": 3,
    }
    result = check_anomaly(480.0, baseline)
    assert result["is_anomaly"] is True
