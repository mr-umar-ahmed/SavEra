"""Rule-based conservation tips (SPEC §5.6, implemented verbatim). No ML, ever.

Tips are chosen by resource type, the top appliance driving an electricity bill, and how far
over baseline a reading is. Every tip is phrased as "verb + number" (the UI enforces this
with a banned-words test), so it is something a person can actually go and do today.
"""

from __future__ import annotations

from collections.abc import Mapping

TIPS: dict[str, dict[str, list[str]]] = {
    "electricity": {
        "ac_heavy": [  # triggers when ac_* appliances > 35% of the estimated total
            "Set AC to 24°C — each degree lower adds ~6% to your bill.",
            "Run AC with a ceiling fan: it feels 3°C cooler, so you can raise the thermostat.",
            "Clean your AC filter monthly — a clogged filter uses 10–15% more power.",
        ],
        "geyser_heavy": [  # triggers when geyser > 15% of the estimated total
            "Set geyser thermostat to 50°C — Indian households often keep it at 65°C.",
            "Turn geyser off 5 minutes before bathing — stored heat is enough.",
        ],
        "general": [
            "Unplug chargers when not in use — standby draw adds 5–8% to bills.",
            "Switch remaining incandescent bulbs to LED — 80% less power for the same light.",
            "Wash clothes in cold water — heating water is 90% of washing machine energy.",
        ],
    },
    "water": {
        "high_usage": [
            "A dripping tap wastes ~40 litres/day — check all taps.",
            "A running toilet wastes 500–700 litres/day silently — drop food colouring in the tank to check.",
            "Swap a 10-minute shower for a 5-minute one: saves ~100 litres per session.",
            "Water your garden before 7am or after 7pm — midday evaporation wastes 30–50% of water.",
        ],
    },
    "lpg": {
        "fast_burn": [
            "Use a pressure cooker — cuts cooking time and gas use by 50–75%.",
            "Keep lids on pots while cooking — retains heat, reduces gas by 15–20%.",
            "Match burner size to pot size — a small pot on a large burner wastes 40% gas.",
            "Thaw frozen food in the fridge overnight instead of on the stove.",
        ],
    },
}

AC_HEAVY_THRESHOLD = 0.35
GEYSER_HEAVY_THRESHOLD = 0.15
MAX_TIPS = 2


def get_tips(
    resource: str,
    context: Mapping[str, object] | None = None,
    appliance_breakdown: Mapping[str, float] | None = None,
) -> list[str]:
    """Top ``MAX_TIPS`` relevant tips for a resource, no duplicates.

    ``context`` is accepted for forward compatibility (e.g. severity-driven ordering) but
    unused today — every branch below is a straightforward rule over the appliance mix.
    """
    del context  # not yet used; kept in the signature per SPEC §5.6
    pool: list[str] = []

    if resource == "electricity" and appliance_breakdown:
        total = sum(appliance_breakdown.values()) or 1
        ac_kwh = sum(v for k, v in appliance_breakdown.items() if k.startswith("ac"))
        if ac_kwh / total > AC_HEAVY_THRESHOLD:
            pool += TIPS["electricity"]["ac_heavy"]
        geyser_kwh = appliance_breakdown.get("geyser", 0.0)
        if geyser_kwh / total > GEYSER_HEAVY_THRESHOLD:
            pool += TIPS["electricity"]["geyser_heavy"]
        pool += TIPS["electricity"]["general"]
    elif resource == "water":
        pool += TIPS["water"]["high_usage"]
    elif resource == "lpg":
        pool += TIPS["lpg"]["fast_burn"]

    seen: set[str] = set()
    result: list[str] = []
    for tip in pool:
        if tip not in seen:
            seen.add(tip)
            result.append(tip)
        if len(result) == MAX_TIPS:
            break
    return result
