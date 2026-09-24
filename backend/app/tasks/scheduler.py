"""APScheduler wiring (jobs are registered in Phase 2).

Runs inside the uvicorn process. Run uvicorn with a single worker (the default) so jobs
fire once; with --reload the reloader parent never starts the app, so no double firing.
"""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import get_settings

logger = logging.getLogger("savera.scheduler")
_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone=get_settings().scheduler_timezone)
    return _scheduler


def register_jobs(sched: AsyncIOScheduler) -> None:
    """Phase 2 adds: monthly baseline refresh (1st, 02:00), LPG refill check (daily 07:00),
    weekly digest (Monday 08:00)."""


def start() -> None:
    sched = get_scheduler()
    if not sched.running:
        register_jobs(sched)
        sched.start()
        logger.info("scheduler started with %d jobs", len(sched.get_jobs()))


def shutdown() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
    _scheduler = None
