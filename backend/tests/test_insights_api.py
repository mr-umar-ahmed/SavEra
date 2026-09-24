"""Insights API: the dashboard and the three resource pages.

Covers the Phase 3 chart edge cases the spec calls out (1, 3 and 6 readings) and the
privacy floor on peer comparison, which is a Phase 4 non-negotiable enforced here in SQL.
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from app import database
from app.routers import insights as insights_router

BASE = "/api/v1/insights"


@pytest.fixture(autouse=True)
def frozen_today(monkeypatch):
    """Pin the clock the router reads so water windows are deterministic."""
    monkeypatch.setattr(insights_router, "today_ist", lambda: date(2026, 9, 24))
    return date(2026, 9, 24)


async def _add_bills(user_id, values: list[float], first_start=date(2026, 4, 1)):
    start = first_start
    for kwh in values:
        end = start + timedelta(days=29)
        await database.execute(
            "INSERT INTO electricity_readings (user_id, kwh, billing_period_start, billing_period_end) "
            "VALUES ($1, $2, $3, $4)",
            user_id,
            kwh,
            start,
            end,
        )
        start = end + timedelta(days=1)


async def _add_water(user_id, values: list[float], first_day=date(2026, 9, 1)):
    for i, liters in enumerate(values):
        await database.execute(
            "INSERT INTO water_readings (user_id, liters, reading_date) VALUES ($1, $2, $3)",
            user_id,
            liters,
            first_day + timedelta(days=i),
        )


async def _add_baseline(user_id, resource, mean, std=30.0, samples=3):
    await database.execute(
        """
        INSERT INTO baselines (user_id, resource_type, mean, std_dev, upper_threshold,
                               lower_threshold, sample_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, resource_type) DO UPDATE SET mean = EXCLUDED.mean
        """,
        user_id,
        resource,
        mean,
        std,
        mean + 1.5 * std,
        max(0.0, mean - 1.5 * std),
        samples,
    )


async def _add_ward_aggregate(ward_id, resource, avg, households, period_start=date(2026, 9, 1)):
    await database.execute(
        """
        INSERT INTO ward_aggregates (ward_id, resource_type, period_start, period_end,
                                     avg_consumption, total_consumption, household_count,
                                     avg_household_size)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 4.0)
        ON CONFLICT (ward_id, resource_type, period_start) DO UPDATE
        SET avg_consumption = EXCLUDED.avg_consumption, household_count = EXCLUDED.household_count
        """,
        ward_id,
        resource,
        period_start,
        period_start + timedelta(days=29),
        avg,
        avg * households,
        households,
    )


# ----------------------------------------------------------------------------- dashboard


async def test_dashboard_on_a_brand_new_account_is_empty_but_valid(client, citizen):
    response = await client.get(f"{BASE}/dashboard", headers=citizen[1])
    assert response.status_code == 200
    body = response.json()
    assert body["electricity"]["current"] is None
    assert body["electricity"]["status"] == "unknown"
    assert body["lpg"]["cycle"] is None
    assert body["green_score"] is None
    assert body["unread_alerts"] == 0
    assert body["ward_rank"]["available"] is False
    assert body["normalisation_note"]


async def test_dashboard_status_is_colour_coded_against_the_baseline(client, citizen):
    user, headers = citizen
    await _add_bills(user["id"], [300.0])
    await _add_baseline(user["id"], "electricity", mean=400.0)

    body = (await client.get(f"{BASE}/dashboard", headers=headers)).json()
    assert body["electricity"]["current"] == pytest.approx(300.0)
    assert body["electricity"]["status"] == "good"  # under the mean
    assert body["electricity"]["pct_vs_baseline"] == pytest.approx(-25.0)


@pytest.mark.parametrize(
    ("current", "mean", "expected"),
    [(300.0, 400.0, "good"), (420.0, 400.0, "warn"), (500.0, 400.0, "bad")],
)
async def test_dashboard_traffic_light_thresholds(client, citizen, current, mean, expected):
    user, headers = citizen
    await _add_bills(user["id"], [current])
    await _add_baseline(user["id"], "electricity", mean=mean, std=30.0)  # upper = mean + 45
    body = (await client.get(f"{BASE}/dashboard", headers=headers)).json()
    assert body["electricity"]["status"] == expected


async def test_dashboard_counts_unread_alerts(client, citizen):
    user, headers = citizen
    for key in ("a", "b"):
        await database.execute(
            "INSERT INTO alerts (user_id, resource_type, alert_type, title, message, dedupe_key) "
            "VALUES ($1, 'water', 'high_consumption', 'T', 'M', $2)",
            user["id"],
            key,
        )
    body = (await client.get(f"{BASE}/dashboard", headers=headers)).json()
    assert body["unread_alerts"] == 2


async def test_dashboard_ward_rank_line_reads_naturally(client, citizen):
    user, headers = citizen
    await _add_bills(user["id"], [300.0])
    await _add_ward_aggregate(user["ward_id"], "electricity", avg=400.0, households=12)

    rank = (await client.get(f"{BASE}/dashboard", headers=headers)).json()["ward_rank"]
    assert rank["available"] is True
    assert "less electricity" in rank["line"]
    assert rank["pct_diff"] == pytest.approx(-25.0)


# --------------------------------------------------------------------------- electricity


@pytest.mark.parametrize("count", [1, 3, 6])
async def test_electricity_history_renders_for_one_three_and_six_readings(client, citizen, count):
    """The spec's chart edge cases: charts must be correct with 1, 3 and 6 readings."""
    user, headers = citizen
    await _add_bills(user["id"], [300.0] * count)
    body = (await client.get(f"{BASE}/electricity", headers=headers)).json()
    assert len(body["history"]) == count
    starts = [point["period_start"] for point in body["history"]]
    assert starts == sorted(starts)  # oldest first, the order a chart draws in


async def test_electricity_normalises_each_bill_to_30_days(client, citizen):
    user, headers = citizen
    await database.execute(
        "INSERT INTO electricity_readings (user_id, kwh, billing_period_start, billing_period_end) "
        "VALUES ($1, 310, DATE '2026-05-01', DATE '2026-05-31')",  # 31 days
        user["id"],
    )
    point = (await client.get(f"{BASE}/electricity", headers=headers)).json()["history"][0]
    assert point["kwh"] == pytest.approx(310.0)
    assert point["kwh_per_30d"] == pytest.approx(300.0)


async def test_appliance_breakdown_and_unknown_load(client, citizen):
    user, headers = citizen
    await _add_bills(user["id"], [500.0])
    await database.execute(
        "INSERT INTO appliances (user_id, type, count, daily_hours, star_rating) "
        "VALUES ($1, 'ac_1.5ton', 1, 6, 3)",
        user["id"],
    )
    body = (await client.get(f"{BASE}/electricity", headers=headers)).json()

    assert body["appliance_breakdown"][0]["type"] == "ac_1.5ton"
    assert body["appliance_breakdown"][0]["label"] == "AC 1.5 ton"
    assert body["appliance_breakdown"][0]["pct"] == pytest.approx(100.0)
    assert body["unknown_load"] >= 0
    assert "not measured" in body["estimate_note"]
    assert "NILM" not in body["estimate_note"]


async def test_saving_an_appliance_changes_the_next_breakdown(client, citizen):
    """Phase 3 acceptance: appliance profile save -> breakdown updates on next fetch."""
    user, headers = citizen
    await _add_bills(user["id"], [500.0])
    before = (await client.get(f"{BASE}/electricity", headers=headers)).json()
    assert before["appliance_breakdown"] == []

    saved = await client.put(
        "/api/v1/profile/appliances",
        json={"appliances": [{"type": "geyser", "count": 1, "daily_hours": 0.5}]},
        headers=headers,
    )
    assert saved.status_code == 200, saved.text

    after = (await client.get(f"{BASE}/electricity", headers=headers)).json()
    assert [a["type"] for a in after["appliance_breakdown"]] == ["geyser"]
    assert after["unknown_load"] < 500.0


async def test_tips_appear_only_when_over_baseline(client, citizen):
    user, headers = citizen
    await _add_bills(user["id"], [300.0])
    await database.execute(
        "INSERT INTO appliances (user_id, type, count, daily_hours, star_rating) "
        "VALUES ($1, 'ac_1.5ton', 1, 6, 3)",
        user["id"],
    )

    await _add_baseline(user["id"], "electricity", mean=400.0)  # under usual
    under = (await client.get(f"{BASE}/electricity", headers=headers)).json()
    assert under["over_baseline"] is False and under["tips"] == []

    await _add_baseline(user["id"], "electricity", mean=200.0)  # over usual
    over = (await client.get(f"{BASE}/electricity", headers=headers)).json()
    assert over["over_baseline"] is True and len(over["tips"]) == 2


# --------------------------------------------------------------------------------- water


async def test_water_history_and_monthly_rollup(client, citizen):
    user, headers = citizen
    await _add_water(user["id"], [400.0, 420.0, 380.0], first_day=date(2026, 8, 30))
    body = (await client.get(f"{BASE}/water", headers=headers)).json()

    assert len(body["history"]) == 3
    assert [m["month"] for m in body["monthly"]] == ["2026-08-01", "2026-09-01"]
    august = body["monthly"][0]
    assert august["days_logged"] == 2
    assert august["avg_liters"] == pytest.approx(410.0)


async def test_water_respects_the_days_window(client, citizen):
    user, headers = citizen
    await _add_water(user["id"], [400.0], first_day=date(2026, 9, 20))
    await _add_water(user["id"], [400.0], first_day=date(2026, 1, 1))
    assert len((await client.get(f"{BASE}/water?days=30", headers=headers)).json()["history"]) == 1
    assert len((await client.get(f"{BASE}/water?days=365", headers=headers)).json()["history"]) == 2


# ----------------------------------------------------------------------------------- lpg


async def test_lpg_timeline_and_prediction_match_the_lpg_api(client, citizen):
    """Phase 3 acceptance: the tracker's finish date must match what the API returns."""
    user, headers = citizen
    await database.execute(
        "INSERT INTO lpg_cycles (user_id, cylinder_kg, start_date, end_date, daily_burn_rate) "
        "VALUES ($1, 14.2, DATE '2026-06-01', DATE '2026-07-01', 0.4733)",
        user["id"],
    )
    await database.execute(
        "INSERT INTO lpg_cycles (user_id, cylinder_kg, start_date) VALUES ($1, 14.2, DATE '2026-09-10')",
        user["id"],
    )

    insights = (await client.get(f"{BASE}/lpg", headers=headers)).json()
    current = (await client.get("/api/v1/lpg/current", headers=headers)).json()

    assert len(insights["cycles"]) == 2
    assert insights["cycles"][0]["is_open"] is True  # newest first
    assert (
        insights["current"]["prediction"]["estimated_finish_date"]
        == current["prediction"]["estimated_finish_date"]
    )


# -------------------------------------------------------------------------- green score


async def test_green_score_history_is_oldest_first_with_the_normalisation_note(client, citizen):
    user, headers = citizen
    for month, total in ((date(2026, 7, 1), 70.0), (date(2026, 8, 1), 80.0), (date(2026, 9, 1), 90.0)):
        await database.execute(
            "INSERT INTO green_scores (user_id, month, electricity_score, total_score) "
            "VALUES ($1, $2, $3, $3)",
            user["id"],
            month,
            total,
        )
    body = (await client.get(f"{BASE}/green-score", headers=headers)).json()
    assert [row["month"] for row in body["history"]] == ["2026-07-01", "2026-08-01", "2026-09-01"]
    assert body["current"]["total_score"] == pytest.approx(90.0)
    assert "never penalised" in body["normalisation_note"]


# ---------------------------------------------------------------- peer comparison (privacy)


async def test_peer_comparison_is_withheld_below_ten_households(client, citizen):
    user, headers = citizen
    await _add_bills(user["id"], [300.0])
    await _add_ward_aggregate(user["ward_id"], "electricity", avg=400.0, households=9)

    body = (await client.get(f"{BASE}/peer-comparison?resource=electricity", headers=headers)).json()
    assert body["available"] is False
    assert "10 households" in body["reason"]
    assert body["avg_per_household"] is None


async def test_peer_comparison_opens_up_at_ten_households(client, citizen):
    user, headers = citizen
    await _add_bills(user["id"], [300.0])
    await _add_ward_aggregate(user["ward_id"], "electricity", avg=400.0, households=10)

    body = (await client.get(f"{BASE}/peer-comparison?resource=electricity", headers=headers)).json()
    assert body["available"] is True
    assert body["household_count"] == 10
    assert body["avg_per_household"] == pytest.approx(400.0)
    assert body["avg_per_person"] == pytest.approx(100.0)  # avg_household_size 4.0
    assert body["yours"] == pytest.approx(300.0)
    assert body["pct_diff"] == pytest.approx(-25.0)


async def test_peer_comparison_never_leaks_an_individual_figure(client, citizen, make_user):
    """Spot-check for the Phase 4 privacy rule: no user_id, email or name in the response."""
    user, headers = citizen
    await _add_bills(user["id"], [300.0])
    await _add_ward_aggregate(user["ward_id"], "electricity", avg=400.0, households=12)

    raw = (await client.get(f"{BASE}/peer-comparison?resource=electricity", headers=headers)).text
    assert "user_id" not in raw
    assert user["email"] not in raw
    assert str(user["id"]) not in raw


async def test_peer_comparison_without_a_ward_explains_itself(client, make_user):
    _, headers = await make_user(email="wardless@savera.test", ward_id=None)
    body = (await client.get(f"{BASE}/peer-comparison", headers=headers)).json()
    assert body["available"] is False
    assert "ward" in body["reason"].lower()


@pytest.mark.parametrize(
    "path", ["/dashboard", "/electricity", "/water", "/lpg", "/green-score", "/peer-comparison"]
)
async def test_every_insight_route_requires_a_token(client, path):
    assert (await client.get(f"{BASE}{path}")).status_code == 401
