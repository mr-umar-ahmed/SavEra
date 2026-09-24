"""Bill photo upload -> background OCR -> confirmation (PHASE0_PLAN.md sections 6 and 7).

``POST /bills/upload`` stores a cleaned-up JPEG, answers **202** with a job id, and runs the
OCR in BackgroundTasks so the phone never waits on Google Cloud Vision. The client polls
``GET /bills/jobs/{id}``; when it is ``done`` the extraction is shown for the user to correct
and save through ``POST /readings/electricity``.

The job never fails loudly: an unreachable Vision API falls back to Tesseract, a missing
Tesseract binary gives ``engine='none'`` with ``needs_review=true``, and the form drops to
manual entry. Only a genuinely unreadable file ends as ``failed/invalid_image``.

Images live under ``UPLOAD_DIR/<user_id>/<job_id>.jpg`` and are served only through the
owner-checked route below, which answers 404 — not 403 — to anyone else, so the route cannot
be used to probe which job ids exist.
"""

from __future__ import annotations

import logging
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app import database
from app.config import get_settings
from app.deps import CurrentUser, get_current_user
from app.models.bills import OcrJobCreated, OcrJobOut
from app.services import ocr

logger = logging.getLogger("savera.bills")

router = APIRouter(prefix="/bills", tags=["bills"])

_JOB_COLUMNS = (
    "id, status, engine, confidence, needs_review, extraction, raw_text, error_code, "
    "reading_id, created_at, finished_at"
)

JOB_NOT_FOUND = "Bill upload not found"


def _image_path(user_id: UUID, job_id: UUID) -> Path:
    return Path(get_settings().upload_dir) / str(user_id) / f"{job_id}.jpg"


async def _process_job(job_id: UUID, user_id: UUID, image: bytes) -> None:
    """Run OCR and write the result back. Any failure lands in the row, never in a 500."""
    try:
        result = await ocr.run_ocr(image)
    except ocr.OcrError as exc:
        await database.execute(
            "UPDATE ocr_jobs SET status = 'failed', error_code = $2, finished_at = NOW() "
            "WHERE id = $1",
            job_id,
            exc.code,
        )
        return
    except Exception:
        logger.exception("OCR job %s crashed", job_id)
        await database.execute(
            "UPDATE ocr_jobs SET status = 'failed', error_code = 'internal', finished_at = NOW() "
            "WHERE id = $1",
            job_id,
        )
        return

    await database.execute(
        """
        UPDATE ocr_jobs
        SET status = 'done', engine = $2, confidence = $3, needs_review = $4,
            extraction = $5::jsonb, raw_text = $6, error_code = $7, finished_at = NOW()
        WHERE id = $1
        """,
        job_id,
        result.engine,
        result.parsed.confidence,
        result.parsed.needs_review,
        result.parsed.extraction.as_dict(),
        result.raw_text,
        result.error_code,
    )


@router.post("/upload", response_model=OcrJobCreated, status_code=status.HTTP_202_ACCEPTED)
async def upload_bill(
    background: BackgroundTasks,
    file: UploadFile = File(..., description="Photo of an electricity bill (jpeg/png/webp)"),
    user: CurrentUser = Depends(get_current_user),
) -> OcrJobCreated:
    """Accept a bill photo and start reading it. Returns immediately with a job id."""
    if file.content_type not in ocr.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Upload a JPEG, PNG or WebP photo (got {file.content_type or 'unknown'})",
        )
    raw = await file.read(ocr.MAX_IMAGE_BYTES + 1)
    if not raw:
        raise HTTPException(422, "The uploaded file is empty")
    if len(raw) > ocr.MAX_IMAGE_BYTES:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"That photo is larger than {ocr.MAX_IMAGE_BYTES // (1024 * 1024)} MB",
        )

    try:
        image = ocr.preprocess_image(raw)
    except ocr.OcrError as exc:
        raise HTTPException(422, str(exc)) from exc

    job_id = await database.fetchval(
        "INSERT INTO ocr_jobs (user_id, image_path) VALUES ($1, '') RETURNING id", user.id
    )
    path = _image_path(user.id, job_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(image)
    await database.execute("UPDATE ocr_jobs SET image_path = $2 WHERE id = $1", job_id, str(path))

    background.add_task(_process_job, job_id, user.id, image)
    return OcrJobCreated(id=job_id, status="pending")


@router.get("/jobs/{job_id}", response_model=OcrJobOut)
async def get_job(job_id: UUID, user: CurrentUser = Depends(get_current_user)) -> OcrJobOut:
    """Poll a bill upload. `status` stays 'pending' until the background task finishes."""
    row = await database.fetchrow(
        f"SELECT {_JOB_COLUMNS} FROM ocr_jobs WHERE id = $1 AND user_id = $2", job_id, user.id
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, JOB_NOT_FOUND)
    return OcrJobOut.from_row(row)


@router.get("/jobs/{job_id}/image")
async def get_job_image(
    job_id: UUID, user: CurrentUser = Depends(get_current_user)
) -> FileResponse:
    """The stored bill photo. 404 for everyone but its owner."""
    image_path = await database.fetchval(
        "SELECT image_path FROM ocr_jobs WHERE id = $1 AND user_id = $2", job_id, user.id
    )
    if not image_path or not Path(image_path).is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, JOB_NOT_FOUND)
    return FileResponse(image_path, media_type="image/jpeg")
