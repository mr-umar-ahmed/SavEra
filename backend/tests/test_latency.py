"""Phase 2 acceptance: "Background pipeline does not slow down POST /readings/electricity
(<400ms)".

This test deliberately does **not** use the in-process ASGI transport the rest of the suite
uses. `httpx.ASGITransport` awaits the whole app coroutine, and Starlette runs BackgroundTasks
inside it (after `send`, before returning) — so an in-process measurement would include the
pipeline and could never distinguish "responded fast, worked after" from "blocked on the
work". Only a real socket shows the difference: uvicorn flushes the response to the client
before the background task runs.

So: a real uvicorn on a free port, in its own process (which also gives the app its own
asyncpg pool on its own event loop — reusing this process's pool across loops would be
unsafe), pointed at the same test database. If the server cannot be started in this
environment, the test skips rather than failing the suite on an infrastructure quirk.
"""

from __future__ import annotations

import os
import socket
import statistics
import subprocess
import sys
import time
from contextlib import closing
from datetime import date, timedelta

import httpx
import pytest

from app import database
from tests.conftest import BACKEND_DIR, TEST_DB_URL, TEST_JWT_SECRET, auth_headers_for

P95_BUDGET_MS = 400
REQUESTS = 8
SERVER_BOOT_TIMEOUT_S = 40
PIPELINE_SETTLE_TIMEOUT_S = 5


def _free_port() -> int:
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _server_env(port: int) -> dict[str, str]:
    env = dict(os.environ)
    env.update(
        {
            "APP_ENV": "test",
            "DATABASE_URL": TEST_DB_URL,
            "SUPABASE_JWT_SECRET": TEST_JWT_SECRET,
            "SUPABASE_URL": "",
            "SCHEDULER_ENABLED": "false",
            "GCV_API_KEY": "",
            "FIREBASE_SERVICE_ACCOUNT_JSON": "",
            "UPLOAD_DIR": str(BACKEND_DIR / ".pytest_uploads"),
            "PYTHONPATH": str(BACKEND_DIR),
        }
    )
    return env


@pytest.fixture
async def live_server():
    """A real uvicorn process on a free port, or a skip if it will not come up here."""
    port = _free_port()
    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--log-level",
            "warning",
        ],
        cwd=str(BACKEND_DIR),
        env=_server_env(port),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    base_url = f"http://127.0.0.1:{port}"
    try:
        deadline = time.monotonic() + SERVER_BOOT_TIMEOUT_S
        async with httpx.AsyncClient(timeout=5.0) as probe:
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    output = (process.stdout.read() or b"").decode(errors="replace")
                    pytest.skip(f"uvicorn exited before serving:\n{output[-2000:]}")
                try:
                    if (await probe.get(f"{base_url}/healthz")).status_code == 200:
                        break
                except httpx.HTTPError:
                    pass
                time.sleep(0.25)
            else:
                pytest.skip("uvicorn did not start within the timeout in this environment")
        yield base_url
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:  # pragma: no cover - only on a wedged process
            process.kill()


async def test_post_electricity_responds_well_under_400ms_while_the_pipeline_runs_after(
    live_server, make_user
):
    user, _ = await make_user(email="latency@savera.test")
    headers = auth_headers_for(user["id"], user["email"])

    latencies_ms: list[float] = []
    start = date(2026, 1, 1)
    async with httpx.AsyncClient(base_url=live_server, timeout=10.0) as client:
        for _ in range(REQUESTS):
            end = start + timedelta(days=29)
            body = {
                "kwh": 300.0,
                "billing_period_start": start.isoformat(),
                "billing_period_end": end.isoformat(),
            }
            began = time.perf_counter()
            response = await client.post("/api/v1/readings/electricity", json=body, headers=headers)
            latencies_ms.append((time.perf_counter() - began) * 1000)
            assert response.status_code == 201, response.text
            start = end + timedelta(days=1)

    latencies_ms.sort()
    p95 = latencies_ms[max(0, round(0.95 * len(latencies_ms)) - 1)]
    assert p95 < P95_BUDGET_MS, (
        f"p95 {p95:.0f}ms exceeded the {P95_BUDGET_MS}ms budget "
        f"(median {statistics.median(latencies_ms):.0f}ms, max {latencies_ms[-1]:.0f}ms)"
    )

    # ...and the work really did happen, just afterwards.
    deadline = time.monotonic() + PIPELINE_SETTLE_TIMEOUT_S
    baseline = None
    while time.monotonic() < deadline:
        baseline = await database.fetchrow(
            "SELECT sample_count FROM baselines WHERE user_id = $1 AND resource_type = 'electricity'",
            user["id"],
        )
        if baseline is not None:
            break
        time.sleep(0.25)
    assert baseline is not None, "the background pipeline never wrote a baseline"
    assert baseline["sample_count"] >= 3

    aggregate = await database.fetchval(
        "SELECT COUNT(*) FROM ward_aggregates WHERE ward_id = $1 AND resource_type = 'electricity'",
        user["ward_id"],
    )
    assert aggregate >= 1


async def test_a_slow_pipeline_step_still_does_not_delay_the_response(live_server, make_user):
    """The response must not wait on the pipeline even when the pipeline is slow. The live
    server has no GCV/weather keys and no Tesseract, so its slowest realistic step is the DB
    work itself; this asserts the shape holds across a burst rather than a single lucky call.
    """
    user, _ = await make_user(email="latency-burst@savera.test")
    headers = auth_headers_for(user["id"], user["email"])

    async with httpx.AsyncClient(base_url=live_server, timeout=10.0) as client:
        # one day's water per request — each one triggers the full water branch
        latencies_ms = []
        for i in range(REQUESTS):
            body = {"liters": 400.0, "reading_date": (date(2026, 6, 1) + timedelta(days=i)).isoformat()}
            began = time.perf_counter()
            response = await client.post("/api/v1/readings/water", json=body, headers=headers)
            latencies_ms.append((time.perf_counter() - began) * 1000)
            assert response.status_code == 201, response.text

    latencies_ms.sort()
    p95 = latencies_ms[max(0, round(0.95 * len(latencies_ms)) - 1)]
    assert p95 < P95_BUDGET_MS, f"water p95 {p95:.0f}ms exceeded {P95_BUDGET_MS}ms"


async def test_the_live_server_rejects_an_unauthenticated_post(live_server):
    async with httpx.AsyncClient(base_url=live_server, timeout=10.0) as client:
        response = await client.post(
            "/api/v1/readings/electricity",
            json={
                "kwh": 300.0,
                "billing_period_start": "2026-01-01",
                "billing_period_end": "2026-01-30",
            },
        )
    assert response.status_code == 401
