"""Conservation tips gate (Phase 2 acceptance): AC-heavy breakdown -> AC tips;
water high -> water tips. Rule-based only — no ranking model, no ML."""

from __future__ import annotations

from app.services.tips import MAX_TIPS, TIPS, get_tips

BANNED_WORDS = ("nilm", "machine learning", "ai-powered", "predict", "algorithm detects")


def test_ac_heavy_breakdown_returns_ac_tips():
    breakdown = {"ac_1.5ton": 200.0, "refrigerator": 50.0, "ceiling_fan": 20.0}  # AC > 35%
    tips = get_tips("electricity", appliance_breakdown=breakdown)
    assert any(tip in TIPS["electricity"]["ac_heavy"] for tip in tips)


def test_geyser_heavy_breakdown_returns_geyser_tips():
    breakdown = {"geyser": 60.0, "refrigerator": 100.0, "ceiling_fan": 50.0}  # geyser > 15%
    tips = get_tips("electricity", appliance_breakdown=breakdown)
    assert any(tip in TIPS["electricity"]["geyser_heavy"] for tip in tips)


def test_low_ac_share_does_not_trigger_ac_tips():
    breakdown = {"ac_1ton": 10.0, "refrigerator": 100.0, "ceiling_fan": 50.0}  # AC well under 35%
    tips = get_tips("electricity", appliance_breakdown=breakdown)
    assert not any(tip in TIPS["electricity"]["ac_heavy"] for tip in tips)


def test_water_high_usage_returns_water_tips():
    tips = get_tips("water")
    assert tips == TIPS["water"]["high_usage"][:MAX_TIPS]


def test_lpg_returns_fast_burn_tips():
    tips = get_tips("lpg")
    assert tips == TIPS["lpg"]["fast_burn"][:MAX_TIPS]


def test_never_returns_more_than_two_tips():
    breakdown = {"ac_2ton": 300.0, "geyser": 100.0, "refrigerator": 50.0}  # both AC and geyser heavy
    tips = get_tips("electricity", appliance_breakdown=breakdown)
    assert len(tips) == MAX_TIPS


def test_no_duplicate_tips_in_one_result():
    tips = get_tips("water")
    assert len(tips) == len(set(tips))


def test_electricity_without_a_breakdown_returns_nothing_to_act_on():
    assert get_tips("electricity") == []


def test_unknown_resource_returns_no_tips():
    assert get_tips("gas_mains") == []


def test_tips_never_claim_to_be_ai_or_predictive():
    """Honest-labels rule: tips are rule-based, and must never claim to be AI or predictive."""
    for pool in TIPS.values():
        for tips in pool.values():
            for tip in tips:
                lowered = tip.lower()
                assert not any(banned in lowered for banned in BANNED_WORDS), tip


def test_most_tips_are_phrased_as_verb_plus_a_concrete_number():
    """Most (not literally every) tip gives a concrete figure — "24C", "50%" — rather than
    vague advice, so a person can tell whether following it is worth the trouble."""
    all_tips = [tip for pool in TIPS.values() for tips in pool.values() for tip in tips]
    with_numbers = [tip for tip in all_tips if any(ch.isdigit() for ch in tip)]
    assert len(with_numbers) / len(all_tips) >= 0.8
