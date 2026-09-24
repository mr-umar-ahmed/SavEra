"""Weather context for electricity anomaly alerts (docs/PHASE0_PLAN.md §5.5, filling SPEC §5.5).

Answers one question: was the billing period unusually hot, which is a far more useful
explanation for a high bill than "you used more electricity than usual". Called only from
inside BackgroundTasks (see services/pipeline.py) — a slow or unreachable weather API must
never hold up the reading-save response, and every failure degrades to "no weather context"
rather than raising.

    Endpoint : archive-api.open-meteo.com/v1/archive when the period ended > 7 days ago,
               else api.open-meteo.com/v1/forecast (its start_date/end_date + past_days
               cover the last few days archive-api has not ingested yet).
    Compute  : mean daily max over the billing period vs the equal-length window immediately
               before it; hot_days = count(tmax >= 32C) in the billing period; require 70%
               coverage of both windows or give up.
    Sentence : |delta| >= 1.5C -> "It was {delta}C hotter/cooler than the previous period
               ({hot_days} days above 32C), so cooling likely ran longer/less." else nothing
               worth saying, so the whole result is None.
"""

from __future__ import annotations

import logging
import time
from datetime import date, timedelta
from typing import Any, TypedDict

import httpx

logger = logging.getLogger("savera.weather")

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
RECENT_CUTOFF_DAYS = 7  # archive-api lags real time by roughly this much

HOT_DAY_THRESHOLD_C = 32.0
SIGNIFICANT_DELTA_C = 1.5
MIN_COVERAGE = 0.70

DEFAULT_LAT, DEFAULT_LNG = 12.97, 77.59  # Bengaluru, used when a ward has no coordinates

REQUEST_TIMEOUT = httpx.Timeout(3.0, connect=1.5)
CACHE_TTL_SECONDS = 24 * 3600


class WeatherContext(TypedDict):
    delta_c: float
    hot_days: int
    sentence: str


# (lat_rounded, lng_rounded, start_iso, end_iso) -> (fetched_at_monotonic, result)
_cache: dict[tuple[float, float, str, str], tuple[float, WeatherContext | None]] = {}


def _cache_key(lat: float, lng: float, start: date, end: date) -> tuple[float, float, str, str]:
    return (round(lat, 1), round(lng, 1), start.isoformat(), end.isoformat())


def _pick_endpoint(end: date, today: date) -> str:
    return FORECAST_URL if (today - end).days <= RECENT_CUTOFF_DAYS else ARCHIVE_URL


def _daily_maxes(payload: dict[str, Any]) -> dict[date, float]:
    daily = payload.get("daily") or {}
    times = daily.get("time") or []
    temps = daily.get("temperature_2m_max") or []
    result: dict[date, float] = {}
    for day_str, temp in zip(times, temps, strict=False):
        if temp is None:
            continue
        try:
            result[date.fromisoformat(day_str)] = float(temp)
        except ValueError:
            continue
    return result


def _window_mean(by_day: dict[date, float], start: date, end: date) -> tuple[float, int] | None:
    """Mean tmax and sample count over [start, end], or None if coverage is too thin."""
    expected = (end - start).days + 1
    values = [by_day[d] for d in (start + timedelta(days=i) for i in range(expected)) if d in by_day]
    if expected == 0 or len(values) / expected < MIN_COVERAGE:
        return None
    return sum(values) / len(values), len(values)


async def get_weather_context(
    billing_period_start: date,
    billing_period_end: date,
    lat: float | None,
    lng: float | None,
    *,
    today: date | None = None,
    client: httpx.AsyncClient | None = None,
) -> WeatherContext | None:
    """Weather-explains-the-bill sentence, or None when there is nothing worth saying.

    None covers every failure mode alike (network error, bad response, thin data coverage,
    an insignificant delta) — the caller writes ``weather_context = null`` in all of them.
    """
    today = today or date.today()
    lat = DEFAULT_LAT if lat is None else lat
    lng = DEFAULT_LNG if lng is None else lng

    key = _cache_key(lat, lng, billing_period_start, billing_period_end)
    cached = _cache.get(key)
    if cached is not None and time.monotonic() - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    result = await _fetch(billing_period_start, billing_period_end, lat, lng, today, client)
    _cache[key] = (time.monotonic(), result)
    return result


async def _fetch(
    start: date,
    end: date,
    lat: float,
    lng: float,
    today: date,
    client: httpx.AsyncClient | None,
) -> WeatherContext | None:
    days = (end - start).days + 1
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)

    params = {
        "latitude": lat,
        "longitude": lng,
        "start_date": prev_start.isoformat(),
        "end_date": end.isoformat(),
        "daily": "temperature_2m_max",
        "timezone": "Asia/Kolkata",
    }
    url = _pick_endpoint(end, today)

    owns_client = client is None
    client = client or httpx.AsyncClient(timeout=REQUEST_TIMEOUT)
    try:
        try:
            response = await client.get(url, params=params, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.info("weather lookup failed (%s); alert will have no weather context", exc)
            return None
    finally:
        if owns_client:
            await client.aclose()

    by_day = _daily_maxes(payload)
    current = _window_mean(by_day, start, end)
    previous = _window_mean(by_day, prev_start, prev_end)
    if current is None or previous is None:
        return None

    current_mean, _ = current
    previous_mean, _ = previous
    delta = current_mean - previous_mean
    if abs(delta) < SIGNIFICANT_DELTA_C:
        return None

    hot_days = sum(1 for d in (start + timedelta(days=i) for i in range(days)) if by_day.get(d, -999) >= HOT_DAY_THRESHOLD_C)
    direction = "hotter" if delta > 0 else "cooler"
    consequence = "cooling likely ran longer" if delta > 0 else "cooling likely ran less"
    sentence = (
        f"It was {abs(delta):.0f}°C {direction} than the previous period "
        f"({hot_days} days above {HOT_DAY_THRESHOLD_C:.0f}°C), so {consequence}."
    )
    return {"delta_c": round(delta, 1), "hot_days": hot_days, "sentence": sentence}
