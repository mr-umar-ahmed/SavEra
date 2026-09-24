"""services/appliance.py — BEE-wattage estimation (SPEC §5.1). Pure functions, no DB."""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from app.services.appliance import (
    ALWAYS_ON,
    APPLIANCE_CATALOG,
    BEE_WATTAGE,
    GEYSER_DAILY_H,
    VALID_TYPES,
    effective_watts,
    estimate_breakdown,
    find_unknown_load,
)


@dataclass
class Appliance:
    type: str
    count: int = 1
    daily_hours: float = 4.0
    star_rating: int | None = None
    wattage_override: float | None = None


def _known_profile() -> list[Appliance]:
    return [
        Appliance("ac_1.5ton", daily_hours=6, star_rating=3),
        Appliance("refrigerator", daily_hours=4, star_rating=3),  # hours ignored: always on
        Appliance("ceiling_fan", count=2, daily_hours=8),
        Appliance("geyser", daily_hours=2),  # hours ignored: fixed 0.5 h
        Appliance("tv_led_40", daily_hours=4),
    ]


EXPECTED_30_DAYS = {
    "ac_1.5ton": 288.0,  # 1600 W * 6 h * 30 d
    "refrigerator": 39.6,  # 55 W * 24 h * 30 d
    "ceiling_fan": 36.0,  # 75 W * 8 h * 30 d * 2
    "geyser": 30.0,  # 2000 W * 0.5 h * 30 d
    "tv_led_40": 6.0,  # 50 W * 4 h * 30 d
}


def test_breakdown_known_profile_over_30_days():
    assert estimate_breakdown(_known_profile(), 30) == EXPECTED_30_DAYS


def test_breakdown_accepts_dicts_and_objects_alike():
    as_dicts = [vars(a) for a in _known_profile()]
    assert estimate_breakdown(as_dicts, 30) == estimate_breakdown(_known_profile(), 30)


def test_breakdown_dict_rows_with_missing_optional_keys():
    rows = [{"type": "ceiling_fan", "count": 1, "daily_hours": 8}]  # no star/override keys
    assert estimate_breakdown(rows, 30) == {"ceiling_fan": 18.0}


def test_wattage_override_wins_over_bee_table():
    a = Appliance("ac_1.5ton", daily_hours=6, star_rating=3, wattage_override=1000)
    assert effective_watts(a) == 1000.0
    assert estimate_breakdown([a], 30) == {"ac_1.5ton": 180.0}


def test_unknown_type_falls_back_to_100_watts():
    a = Appliance("microwave", daily_hours=1)
    assert effective_watts(a) == 100.0
    assert estimate_breakdown([a], 30) == {"microwave": 3.0}


def test_star_rated_type_without_star_uses_conservative_100_watts():
    # Verbatim spec behaviour: BEE_WATTAGE[type].get(None) is absent for star-rated types.
    assert effective_watts(Appliance("refrigerator")) == 100.0


def test_star_rating_ignored_for_flat_types():
    assert effective_watts(Appliance("ceiling_fan", star_rating=5)) == 75.0
    assert effective_watts(Appliance("geyser", star_rating=1)) == 2000.0


@pytest.mark.parametrize("star,watts", [(1, 2200), (2, 1900), (3, 1600), (4, 1400), (5, 1200)])
def test_star_lookup_matches_bee_table(star, watts):
    assert effective_watts({"type": "ac_1.5ton", "star_rating": star}) == float(watts)


def test_geyser_uses_half_hour_regardless_of_input():
    assert GEYSER_DAILY_H == 0.5
    for hours in (0, 2, 24):
        assert estimate_breakdown([Appliance("geyser", daily_hours=hours)], 30) == {"geyser": 30.0}


def test_always_on_ignores_daily_hours():
    assert ALWAYS_ON == {"refrigerator"}
    for hours in (0, 1, 24):
        a = Appliance("refrigerator", daily_hours=hours, star_rating=5)
        assert estimate_breakdown([a], 30) == {"refrigerator": 25.2}  # 35 W * 24 * 30


def test_count_multiplies():
    one = estimate_breakdown([Appliance("tv_led_55", count=1, daily_hours=5)], 30)
    three = estimate_breakdown([Appliance("tv_led_55", count=3, daily_hours=5)], 30)
    assert one == {"tv_led_55": 13.5} and three == {"tv_led_55": 40.5}


def test_billing_days_scale_linearly():
    a = Appliance("ac_1ton", daily_hours=5, star_rating=5)  # 900 W -> 4.5 kWh/day
    assert estimate_breakdown([a], 1) == {"ac_1ton": 4.5}
    assert estimate_breakdown([a], 31) == {"ac_1ton": 139.5}


def test_zero_hours_and_empty_profile():
    assert estimate_breakdown([Appliance("ceiling_fan", daily_hours=0)], 30) == {"ceiling_fan": 0.0}
    assert estimate_breakdown([], 30) == {}


def test_unknown_load_never_negative():
    breakdown = estimate_breakdown(_known_profile(), 30)  # sums to 399.6
    assert find_unknown_load(100, breakdown) == 0.0
    assert find_unknown_load(399.6, breakdown) == 0.0
    assert find_unknown_load(500, breakdown) == pytest.approx(100.4)
    assert find_unknown_load(250, {}) == 250.0


def test_unknown_load_is_rounded_to_one_decimal():
    assert find_unknown_load(300.123, {"other": 12.34}) == 287.8


# --- catalog ----------------------------------------------------------------------------


def test_valid_types_match_schema_enum_and_bee_table():
    assert VALID_TYPES == (
        "ac_1ton",
        "ac_1.5ton",
        "ac_2ton",
        "refrigerator",
        "ceiling_fan",
        "geyser",
        "washing_machine",
        "tv_led_40",
        "tv_led_55",
        "other",
    )
    assert set(VALID_TYPES) == set(BEE_WATTAGE)


def test_catalog_shape_and_labels():
    assert [c["type"] for c in APPLIANCE_CATALOG] == list(VALID_TYPES)
    assert [c["label"] for c in APPLIANCE_CATALOG] == [
        "AC 1 ton",
        "AC 1.5 ton",
        "AC 2 ton",
        "Refrigerator",
        "Ceiling fan",
        "Geyser",
        "Washing machine",
        "TV LED 40 inch",
        "TV LED 55 inch",
        "Other",
    ]
    by_type = {c["type"]: c for c in APPLIANCE_CATALOG}
    for c in APPLIANCE_CATALOG:
        assert set(c) == {
            "type", "label", "has_star_rating", "default_hours", "always_on",
            "watts_by_star", "default_watts",
        }
        assert c["has_star_rating"] == (None not in BEE_WATTAGE[c["type"]])
        assert all(isinstance(k, str) for k in c["watts_by_star"])  # JSON-safe keys
    assert by_type["ac_1.5ton"]["watts_by_star"] == {
        "1": 2200.0, "2": 1900.0, "3": 1600.0, "4": 1400.0, "5": 1200.0,
    }
    assert by_type["ceiling_fan"]["watts_by_star"] == {}
    assert by_type["ceiling_fan"]["default_watts"] == 75.0
    assert by_type["refrigerator"]["always_on"] is True
    assert by_type["refrigerator"]["default_hours"] == 24.0
    assert by_type["geyser"]["default_hours"] == GEYSER_DAILY_H
    assert sum(1 for c in APPLIANCE_CATALOG if c["always_on"]) == 1


def test_honest_labels_in_service_source():
    import inspect

    from app.services import appliance

    source = inspect.getsource(appliance).lower()
    assert "nilm" not in source
    assert " ai " not in source and "ai-" not in source
