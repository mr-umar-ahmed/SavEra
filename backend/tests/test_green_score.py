"""Green Score gate (Phase 2 acceptance): household_size normalisation works; 100% score for
consumption at the mean. Covers the adopted continuous formula's invariants
(docs/PHASE0_PLAN.md §5.4) as well as the brief's own tests."""

from __future__ import annotations

import pytest

from app.services.green_score import compute_total_score, resource_score, ward_percentile

BASELINE = {"mean": 300.0, "upper_threshold": 375.0}  # a 1-person household's baseline


def test_no_baseline_or_no_reading_yields_none():
    assert resource_score(320.0, None, household_size=1) is None
    assert resource_score(None, BASELINE, household_size=1) is None


def test_at_or_below_the_mean_scores_100():
    assert resource_score(300.0, BASELINE, household_size=1) == 100.0
    assert resource_score(250.0, BASELINE, household_size=1) == 100.0


def test_household_size_normalisation_a_family_of_five_is_not_penalised():
    """A family of 5 using 5x a 1-person baseline is, per person, exactly at that baseline —
    and should score 100 just like the 1-person household at its own mean."""
    family_baseline = {"mean": 300.0 * 5, "upper_threshold": 375.0 * 5}
    assert resource_score(300.0 * 5, family_baseline, household_size=5) == 100.0
    # the same total consumption for a *1-person* household is a real anomaly, not free
    assert resource_score(300.0 * 5, BASELINE, household_size=1) < 100.0


def test_falls_continuously_from_100_to_40_at_the_upper_threshold():
    at_upper = resource_score(375.0, BASELINE, household_size=1)
    assert at_upper == pytest.approx(40.0)
    halfway = resource_score(337.5, BASELINE, household_size=1)  # halfway to upper
    assert 40.0 < halfway < 100.0
    assert halfway == pytest.approx(70.0)  # 100 - 60 * 0.5


def test_continues_falling_but_never_below_zero_far_above_upper():
    just_above = resource_score(376.0, BASELINE, household_size=1)
    assert just_above == pytest.approx(40.0, abs=0.5)  # continuous at the threshold
    way_above = resource_score(3000.0, BASELINE, household_size=1)
    assert way_above == 0.0


def test_no_single_point_jump_at_the_upper_threshold():
    """The brief's literal formula jumps 100 -> 80 just above the mean; the adopted formula
    must never jump anywhere, including exactly at the upper threshold."""
    just_below = resource_score(374.9, BASELINE, household_size=1)
    just_above = resource_score(375.1, BASELINE, household_size=1)
    assert abs(just_below - just_above) < 1.0


def test_improvement_bonus_is_capped_at_100():
    score = resource_score(300.0, BASELINE, household_size=1, previous_score=99.0)
    assert score == 100.0  # 100 + 5 capped, not 105


def test_improvement_bonus_only_applies_when_the_score_actually_improved():
    worse = resource_score(340.0, BASELINE, household_size=1, previous_score=95.0)
    assert worse < 95.0  # no bonus on a drop


def test_compute_total_score_averages_available_resources_and_ignores_none():
    assert compute_total_score([100.0, 80.0, None]) == 90.0
    assert compute_total_score([None, None, None]) is None
    assert compute_total_score([70.0]) == 70.0


def test_ward_percentile_none_with_no_peers():
    assert ward_percentile(80.0, []) is None


def test_ward_percentile_is_the_share_at_or_below():
    assert ward_percentile(80.0, [60.0, 70.0, 90.0]) == pytest.approx(200 / 3, abs=0.1)
    assert ward_percentile(100.0, [50.0, 60.0, 70.0]) == 100.0
