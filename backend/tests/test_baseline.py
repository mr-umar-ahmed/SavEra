"""compute_baseline gate (Phase 2 acceptance): None for 2 readings, a valid dict for 3+,
correct thresholds."""

from __future__ import annotations

import statistics

import pytest

from app.services.baseline import ANOMALY_SIGMA, STD_DEV_FLOOR_PCT, compute_baseline


def test_none_below_minimum_samples():
    assert compute_baseline([]) is None
    assert compute_baseline([300.0]) is None
    assert compute_baseline([300.0, 310.0]) is None  # exactly 2 — still not enough


def test_valid_dict_at_three_samples():
    baseline = compute_baseline([300.0, 310.0, 290.0])
    assert baseline is not None
    assert baseline["sample_count"] == 3
    assert baseline["mean"] == pytest.approx(300.0)


def test_thresholds_are_mean_plus_minus_sigma_times_std_dev():
    values = [300.0, 330.0, 270.0, 315.0, 285.0]
    baseline = compute_baseline(values)
    mean = statistics.fmean(values)
    std_dev = max(statistics.stdev(values), STD_DEV_FLOOR_PCT * mean)
    assert baseline["mean"] == pytest.approx(mean)
    assert baseline["std_dev"] == pytest.approx(std_dev)
    assert baseline["upper_threshold"] == pytest.approx(mean + ANOMALY_SIGMA * std_dev)
    assert baseline["lower_threshold"] == pytest.approx(max(0.0, mean - ANOMALY_SIGMA * std_dev))


def test_std_dev_floor_keeps_a_flat_history_detecting_anomalies():
    """Three identical readings have a real std dev of 0, which would make *any* deviation
    "infinitely" anomalous; the 10%-of-mean floor keeps the threshold sane instead."""
    baseline = compute_baseline([300.0, 300.0, 300.0])
    assert baseline["std_dev"] == pytest.approx(30.0)  # 10% of 300, not 0
    assert baseline["upper_threshold"] == pytest.approx(345.0)


def test_lower_threshold_never_goes_negative():
    baseline = compute_baseline([10.0, 10.0, 10.0, 100.0])  # a big outlier drags std dev up
    assert baseline["lower_threshold"] >= 0.0


def test_more_samples_than_the_window_still_computes():
    baseline = compute_baseline([300.0] * 12)
    assert baseline["sample_count"] == 12
