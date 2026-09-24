"""Weather context gate (docs/PHASE0_PLAN.md §5.5). Entirely offline: every call is served by
an httpx.MockTransport, never the real Open-Meteo API."""

from __future__ import annotations

from datetime import date, timedelta

import httpx
import pytest

from app.services import weather

TODAY = date(2026, 9, 24)
START = date(2026, 8, 1)
END = date(2026, 8, 31)  # 31 days; the previous window is 01-31 Jul
PREV_START, PREV_END = date(2026, 7, 1), date(2026, 7, 31)


def _daily_response(day_temps: dict[str, float]) -> dict:
    return {"daily": {"time": list(day_temps), "temperature_2m_max": list(day_temps.values())}}


def _client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def _all_days(start: date, end: date, value: float) -> dict[str, float]:
    days: dict[str, float] = {}
    day = start
    while day <= end:
        days[day.isoformat()] = value
        day += timedelta(days=1)
    return days


@pytest.fixture(autouse=True)
def clear_cache():
    weather._cache.clear()
    yield
    weather._cache.clear()


async def test_significant_hotter_period_returns_a_sentence_and_hot_days():
    # August (current) averages 34C, July (previous) averages 28C -> +6C, well over the bar.
    combined = {**_all_days(PREV_START, PREV_END, 28.0), **_all_days(START, END, 34.0)}

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_daily_response(combined))

    result = await weather.get_weather_context(START, END, 12.97, 77.59, today=TODAY, client=_client(handler))
    assert result is not None
    assert result["delta_c"] == pytest.approx(6.0, abs=0.1)
    assert result["hot_days"] == 31  # every August day was >= 32C
    assert "hotter" in result["sentence"]
    assert "cooling likely ran longer" in result["sentence"]


async def test_cooler_period_says_cooler_not_hotter():
    combined = {**_all_days(PREV_START, PREV_END, 34.0), **_all_days(START, END, 28.0)}

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_daily_response(combined))

    result = await weather.get_weather_context(START, END, 12.97, 77.59, today=TODAY, client=_client(handler))
    assert result is not None
    assert "cooler" in result["sentence"]
    assert result["delta_c"] < 0


async def test_insignificant_delta_returns_none():
    combined = {**_all_days(PREV_START, PREV_END, 30.0), **_all_days(START, END, 30.8)}  # under 1.5C

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_daily_response(combined))

    result = await weather.get_weather_context(START, END, 12.97, 77.59, today=TODAY, client=_client(handler))
    assert result is None


async def test_thin_coverage_returns_none_rather_than_a_shaky_number():
    # Only ~1/3 of days present in each window -> under the 70% coverage floor.
    sparse = {(START + timedelta(days=i)).isoformat(): 34.0 for i in range(0, 31, 3)}
    sparse.update({(PREV_START + timedelta(days=i)).isoformat(): 28.0 for i in range(0, 31, 3)})

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_daily_response(sparse))

    result = await weather.get_weather_context(START, END, 12.97, 77.59, today=TODAY, client=_client(handler))
    assert result is None


async def test_network_failure_returns_none_never_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("weather is unreachable")

    result = await weather.get_weather_context(START, END, 12.97, 77.59, today=TODAY, client=_client(handler))
    assert result is None


async def test_http_error_status_returns_none():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="internal error")

    result = await weather.get_weather_context(START, END, 12.97, 77.59, today=TODAY, client=_client(handler))
    assert result is None


async def test_missing_coordinates_default_to_bengaluru():
    calls: list[httpx.Request] = []
    combined = {**_all_days(PREV_START, PREV_END, 28.0), **_all_days(START, END, 34.0)}

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json=_daily_response(combined))

    await weather.get_weather_context(START, END, None, None, today=TODAY, client=_client(handler))
    assert calls, "weather was never called"
    query = dict(httpx.QueryParams(calls[0].url.query))
    assert float(query["latitude"]) == pytest.approx(weather.DEFAULT_LAT)
    assert float(query["longitude"]) == pytest.approx(weather.DEFAULT_LNG)


async def test_recent_period_uses_the_forecast_endpoint():
    calls: list[httpx.Request] = []
    recent_start, recent_end = TODAY - timedelta(days=6), TODAY

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"daily": {"time": [], "temperature_2m_max": []}})

    await weather.get_weather_context(recent_start, recent_end, 12.97, 77.59, today=TODAY, client=_client(handler))
    assert str(calls[0].url).startswith(weather.FORECAST_URL)


async def test_old_period_uses_the_archive_endpoint():
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"daily": {"time": [], "temperature_2m_max": []}})

    await weather.get_weather_context(START, END, 12.97, 77.59, today=TODAY, client=_client(handler))
    assert str(calls[0].url).startswith(weather.ARCHIVE_URL)


async def test_result_is_cached_for_the_same_key():
    calls = {"n": 0}
    combined = {**_all_days(PREV_START, PREV_END, 28.0), **_all_days(START, END, 34.0)}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(200, json=_daily_response(combined))

    first = await weather.get_weather_context(START, END, 12.97, 77.59, today=TODAY, client=_client(handler))
    second = await weather.get_weather_context(START, END, 12.97, 77.59, today=TODAY, client=_client(handler))
    assert calls["n"] == 1  # the second call was served from cache
    assert first == second
