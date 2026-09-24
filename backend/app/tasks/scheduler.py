"""APScheduler wiring: the three jobs from SPEC §Phase 2, registered on the process's single
AsyncIOScheduler.

Runs inside the uvicorn process. Run uvicorn with a single worker (the default) so jobs fire
once; with --reload the reloader parent never starts the app, so no double firing. Every job
function is idempotent (deduped alerts, recompute-from-scratch baselines), so an overlapping
run or a restart mid-cycle can never duplicate work.
"""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import get_settings
from app.services import jobs

logger = logging.getLogger("savera.scheduler")
_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone=get_settings().scheduler_timezone)
    return _scheduler


async def _run(name: str, coro_fn) -> None:
    """Log-wrapped job runner: one job failing must never take the scheduler down."""
    try:
        result = await coro_fn()
        logger.info("job %s finished (%r)", name, result)
    except Exception:
        logger.exception("job %s failed", name)


def register_jobs(sched: AsyncIOScheduler) -> None:
    """Monthly baseline refresh (1st, 02:00), LPG refill check (daily 07:00), weekly digest
    (Monday 08:00) — all in the scheduler's configured timezone (Asia/Kolkata)."""
    sched.add_job(
        _run,
        CronTrigger(day=1, hour=2, minute=0),
        args=["recompute_all_baselines", jobs.recompute_all_baselines],
        id="recompute_all_baselines",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    sched.add_job(
        _run,
        CronTrigger(hour=7, minute=0),
        args=["check_lpg_refills", jobs.check_lpg_refills],
        id="check_lpg_refills",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    sched.add_job(
        _run,
        CronTrigger(day_of_week="mon", hour=8, minute=0),
        args=["send_weekly_digest", jobs.send_weekly_digest],
        id="send_weekly_digest",
        replace_existing=True,
        misfire_grace_time=3600,
    )


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
