"""services/lpg.py: pure unit tests (no DB). Spec 5.3 vector plus the PHASE0_PLAN guards."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

import pytest

from app.services.lpg import (
    DEFAULT_BURN_RATE,
    PREDICTION_KEYS,
    REFILL_BUFFER_DAYS,
    burn_rate_from_history,
    close_cycle,
    predict_finish,
    today_ist,
)

TODAY = date(2026, 9, 24)
ALLOWED_EXTRAS = {"pct_remaining", "days_elapsed"}


@dataclass
class Cycle:
    cylinder_kg: float = 14.2
    start_date: date = TODAY - timedelta(days=20)
    end_date: date | None = None
    daily_burn_rate: float | None = None


def _history(*rates: float | None) -> list[Cycle]:
    """Closed cycles, newest first, carrying the given burn rates."""
    return [
        Cycle(
            start_date=TODAY - timedelta(days=60 + 30 * i),
            end_date=TODAY - timedelta(days=30 + 30 * i),
            daily_burn_rate=rate,
        )
        for i, rate in enumerate(rates)
    ]


# --- constants -----------------------------------------------------------------------------


def test_constants_match_spec():
    assert DEFAULT_BURN_RATE == pytest.approx(0.568)
    assert REFILL_BUFFER_DAYS == 3


# --- close_cycle ---------------------------------------------------------------------------


def test_close_cycle_14_2_kg_over_25_days():
    cycle = Cycle(start_date=date(2026, 8, 1), end_date=date(2026, 8, 26))
    assert close_cycle(cycle) == pytest.approx(0.568)


def test_close_cycle_rounds_to_4_places():
    cycle = Cycle(start_date=date(2026, 8, 1), end_date=date(2026, 8, 31))  # 30 days
    assert close_cycle(cycle) == 0.4733


def test_close_cycle_end_equals_start_uses_default():
    cycle = Cycle(start_date=date(2026, 8, 1), end_date=date(2026, 8, 1))
    assert close_cycle(cycle) == DEFAULT_BURN_RATE


def test_close_cycle_end_before_start_uses_default():
    cycle = Cycle(start_date=date(2026, 8, 10), end_date=date(2026, 8, 1))
    assert close_cycle(cycle) == DEFAULT_BURN_RATE


def test_close_cycle_accepts_dict():
    cycle = {"cylinder_kg": 14.2, "start_date": date(2026, 8, 1), "end_date": date(2026, 8, 26)}
    assert close_cycle(cycle) == pytest.approx(0.568)


# --- predict_finish: the spec vector ---------------------------------------------------------


def test_spec_vector_started_20_days_ago_no_history():
    result = predict_finish(Cycle(), [], today=TODAY)

    assert result["burn_rate_kg_per_day"] == pytest.approx(0.568)
    assert 14.2 - result["kg_remaining"] == pytest.approx(11.36)  # kg consumed
    assert result["kg_remaining"] == pytest.approx(2.84)
    assert result["days_to_empty"] == 5
    assert result["estimated_finish_date"] == (TODAY + timedelta(days=5)).isoformat()
    assert result["refill_alert_date"] == (TODAY + timedelta(days=2)).isoformat()
    assert result["should_alert_now"] is False
    # extras
    assert result["days_elapsed"] == 20
    assert result["pct_remaining"] == pytest.approx(20.0)


def test_spec_vector_pinned_dates():
    """Same vector as the Phase 0 lens: today 2026-09-24 -> finish 09-29, alert 09-26."""
    result = predict_finish(Cycle(start_date=date(2026, 9, 4)), [], today=date(2026, 9, 24))
    assert result["estimated_finish_date"] == "2026-09-29"
    assert result["refill_alert_date"] == "2026-09-26"


def test_prediction_keys_are_exactly_the_spec_keys_plus_allowed_extras():
    result = predict_finish(Cycle(), [], today=TODAY)
    assert set(PREDICTION_KEYS) <= set(result)
    assert set(result) - set(PREDICTION_KEYS) <= ALLOWED_EXTRAS
    assert isinstance(result["estimated_finish_date"], str)
    assert isinstance(result["refill_alert_date"], str)
    assert isinstance(result["days_to_empty"], int)
    assert isinstance(result["should_alert_now"], bool)


# --- predict_finish: history handling --------------------------------------------------------


def test_history_uses_mean_of_newest_three_only():
    result = predict_finish(Cycle(), _history(0.5, 0.6, 0.7, 0.9), today=TODAY)
    assert result["burn_rate_kg_per_day"] == pytest.approx(0.6)  # (0.5+0.6+0.7)/3; 0.9 ignored
    assert result["kg_remaining"] == pytest.approx(14.2 - 0.6 * 20)


def test_history_skips_cycles_without_a_burn_rate():
    result = predict_finish(Cycle(), _history(None, 0.5, 0.0, 0.7), today=TODAY)
    assert result["burn_rate_kg_per_day"] == pytest.approx(0.6)


def test_first_ever_cycle_still_returns_a_result():
    result = predict_finish(Cycle(start_date=TODAY), [], today=TODAY)
    assert set(PREDICTION_KEYS) <= set(result)
    assert result["burn_rate_kg_per_day"] == pytest.approx(DEFAULT_BURN_RATE)
    assert result["kg_remaining"] == pytest.approx(14.2)
    assert result["days_to_empty"] == 25
    assert result["should_alert_now"] is False


def test_non_positive_burn_rate_history_falls_back_to_default():
    assert burn_rate_from_history(_history(0.0, None)) == DEFAULT_BURN_RATE
    assert burn_rate_from_history(_history(-0.5)) == DEFAULT_BURN_RATE
    assert burn_rate_from_history([]) == DEFAULT_BURN_RATE


def test_accepts_dict_cycles():
    current = {"cylinder_kg": 14.2, "start_date": TODAY - timedelta(days=20)}
    history = [{"daily_burn_rate": 0.71, "end_date": TODAY - timedelta(days=21)}]
    result = predict_finish(current, history, today=TODAY)
    assert result["burn_rate_kg_per_day"] == pytest.approx(0.71)


# --- predict_finish: alert timing ------------------------------------------------------------


def test_should_alert_now_when_finish_is_within_buffer():
    # 23 days at 0.568 -> 1.136 kg left -> 2 days -> alert date was yesterday
    result = predict_finish(Cycle(start_date=TODAY - timedelta(days=23)), [], today=TODAY)
    assert result["days_to_empty"] == 2
    assert result["should_alert_now"] is True


def test_should_alert_now_exactly_on_alert_date():
    # 22 days -> 1.704 kg left -> 3 days -> alert date == today
    result = predict_finish(Cycle(start_date=TODAY - timedelta(days=22)), [], today=TODAY)
    assert result["days_to_empty"] == 3
    assert result["refill_alert_date"] == TODAY.isoformat()
    assert result["should_alert_now"] is True


def test_not_alerting_one_day_before_alert_date():
    # 21 days -> 2.272 kg left -> 4 days -> alert date is tomorrow
    result = predict_finish(Cycle(start_date=TODAY - timedelta(days=21)), [], today=TODAY)
    assert result["days_to_empty"] == 4
    assert result["should_alert_now"] is False


def test_overrun_cycle_clamps_to_zero_and_alerts():
    result = predict_finish(Cycle(start_date=TODAY - timedelta(days=40)), [], today=TODAY)
    assert result["kg_remaining"] == 0.0
    assert result["pct_remaining"] == 0.0
    assert result["days_to_empty"] == 0
    assert result["estimated_finish_date"] == TODAY.isoformat()
    assert result["should_alert_now"] is True


# --- guards ----------------------------------------------------------------------------------


def test_future_start_date_clamps_days_elapsed_to_zero():
    result = predict_finish(Cycle(start_date=TODAY + timedelta(days=1)), [], today=TODAY)
    assert result["days_elapsed"] == 0
    assert result["kg_remaining"] == pytest.approx(14.2)


def test_today_defaults_to_ist_date():
    start = today_ist() - timedelta(days=10)
    result = predict_finish(Cycle(start_date=start), [])
    assert result["days_elapsed"] == 10
    assert isinstance(today_ist(), date)


def test_smaller_cylinder_scales():
    cycle = Cycle(cylinder_kg=5.0, start_date=TODAY - timedelta(days=5))
    result = predict_finish(cycle, [], today=TODAY)
    assert result["kg_remaining"] == pytest.approx(5.0 - 0.568 * 5)
    assert result["pct_remaining"] == pytest.approx(43.2)
