"""SAVERA API — FastAPI application factory, routers, CORS, lifespan."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import database
from app.config import get_settings
from app.routers import alerts, bills, insights, lpg, profile, readings, supervisor
from app.tasks import scheduler

logger = logging.getLogger("savera")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    await database.connect()
    if settings.scheduler_enabled and not settings.is_test:
        scheduler.start()
    try:
        yield
    finally:
        scheduler.shutdown()
        await database.disconnect()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="SAVERA API",
        version="0.1.0",
        description=(
            "Household electricity, water and LPG tracking with baseline anomaly alerts, "
            "rule-based appliance estimation (not NILM) and anonymised ward comparison."
        ),
        lifespan=lifespan,
        docs_url="/docs",
        openapi_url="/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    prefix = settings.api_prefix
    app.include_router(profile.router, prefix=prefix)
    app.include_router(readings.router, prefix=prefix)
    app.include_router(bills.router, prefix=prefix)
    app.include_router(lpg.router, prefix=prefix)
    app.include_router(insights.router, prefix=prefix)
    app.include_router(alerts.router, prefix=prefix)
    app.include_router(supervisor.router, prefix=prefix)

    @app.get("/healthz", tags=["meta"])
    async def healthz() -> dict:
        db_ok = False
        if database.is_connected():
            try:
                db_ok = (await database.fetchval("SELECT 1")) == 1
            except Exception:  # pragma: no cover - only on DB outage
                db_ok = False
        return {"status": "ok" if db_ok else "degraded", "db": db_ok, "env": settings.app_env}

    return app


app = create_app()
