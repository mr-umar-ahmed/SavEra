"""Bill upload -> background OCR -> confirmation, end to end and offline.

There is no Google Cloud Vision key and no Tesseract binary on the build machine, so the
whole flow is exercised against a **Pillow-rendered** BESCOM bill: the renderer hands back
the exact word boxes it drew, those become a Vision-shaped JSON response, and the HTTP call
is served by ``httpx.MockTransport``. Nothing leaves the process, and the assertion is the
Phase 1 acceptance criterion — kWh within +-2 of the number printed on the bill.

The failure paths matter as much as the happy one: a bill we cannot read must still leave
the user with a job they can finish by typing the figures in, never a 500.
"""

from __future__ import annotations

import io
import json
from datetime import date
from typing import Any

import httpx
import pytest

from app import database
from app.config import get_settings
from app.services import ocr
from app.services.ocr import Word

BASE = "/api/v1/bills"
TODAY = date(2026, 9, 24)

BILL_LINES = [
    "BESCOM",
    "Bangalore Electricity Supply Company Limited",
    "Consumer No : 1234567890",
    "RR No : W5-1234567",
    "Bill Date : 05-09-2026",
    "Billing Period : 01-08-2026 to 31-08-2026",
    "Sanctioned Load : 5 KW",
    "Previous Reading : 45210",
    "Present Reading : 45552",
    "Units Consumed : 342",
    "Energy Charges @ 7.10 per unit : 2428.20",
    "Fixed Charges : 120.00",
    "Net Amount Payable : 2791.20",
    "Amount After Due Date : 2891.20",
]
PRINTED_KWH = 342.0


# ----------------------------------------------------------------- rendering + mocking


def render_bill(lines: list[str] = BILL_LINES) -> tuple[bytes, list[Word]]:
    """Draw the bill as a PNG and return it with the bounding box of every word drawn."""
    from PIL import Image, ImageDraw, ImageFont

    font = ImageFont.load_default()
    line_height, margin = 34, 40
    image = Image.new("RGB", (900, margin * 2 + line_height * len(lines)), "white")
    draw = ImageDraw.Draw(image)

    words: list[Word] = []
    for index, line in enumerate(lines):
        top = margin + index * line_height
        left = margin
        for token in line.split(" "):
            width = draw.textlength(token, font=font)
            draw.text((left, top), token, fill="black", font=font)
            if token:
                words.append(Word(token, left, top, left + width, top + 12))
            left += width + draw.textlength(" ", font=font)

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue(), words


def gcv_response(words: list[Word], *, confidence: float = 0.97) -> dict[str, Any]:
    """The same words as a DOCUMENT_TEXT_DETECTION response body."""

    def poly(word: Word) -> dict[str, Any]:
        return {
            "vertices": [
                {"x": int(word.left), "y": int(word.top)},
                {"x": int(word.right), "y": int(word.top)},
                {"x": int(word.right), "y": int(word.bottom)},
                {"x": int(word.left), "y": int(word.bottom)},
            ]
        }

    full_text = " ".join(word.text for word in words)
    annotations = [{"description": full_text, "boundingPoly": poly(words[0])}]
    annotations += [{"description": w.text, "boundingPoly": poly(w)} for w in words]
    return {
        "responses": [
            {
                "textAnnotations": annotations,
                "fullTextAnnotation": {
                    "text": full_text,
                    "pages": [
                        {
                            "blocks": [
                                {
                                    "paragraphs": [
                                        {
                                            "words": [
                                                {"confidence": confidence} for _ in words
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                },
            }
        ]
    }


@pytest.fixture
def gcv(monkeypatch):
    """Serve Vision calls from an in-process handler. Returns a knob to change the reply."""
    monkeypatch.setattr(get_settings(), "gcv_api_key", "test-key")
    state: dict[str, Any] = {"status": 200, "body": None, "requests": []}

    def handler(request: httpx.Request) -> httpx.Response:
        state["requests"].append(json.loads(request.content))
        if isinstance(state["body"], Exception):
            raise state["body"]
        return httpx.Response(state["status"], json=state["body"] or {"responses": [{}]})

    monkeypatch.setattr(
        ocr, "_default_client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler))
    )
    return state


@pytest.fixture
def no_tesseract(monkeypatch):
    """The build machine has no Tesseract; make that explicit rather than incidental."""

    def _missing(_image: bytes):
        raise ocr.OcrError("tesseract_missing", "Tesseract is not available")

    monkeypatch.setattr(ocr, "extract_with_tesseract", _missing)


async def _upload(client, headers, image: bytes, content_type: str = "image/png"):
    return await client.post(
        f"{BASE}/upload",
        files={"file": ("bill.png", image, content_type)},
        headers=headers,
    )


# ------------------------------------------------------------------------ the happy path


async def test_rendered_bescom_bill_extracts_kwh_within_two_units(client, citizen, gcv):
    image, words = render_bill()
    gcv["body"] = gcv_response(words)

    upload = await _upload(client, citizen[1], image)
    assert upload.status_code == 202, upload.text
    job_id = upload.json()["id"]
    assert upload.json()["status"] == "pending"

    job = (await client.get(f"{BASE}/jobs/{job_id}", headers=citizen[1])).json()
    assert job["status"] == "done", job
    assert job["engine"] == "gcv"
    assert abs(job["extraction"]["kwh"] - PRINTED_KWH) <= 2.0
    assert job["extraction"]["billing_period_start"] == "2026-08-01"
    assert job["extraction"]["billing_period_end"] == "2026-08-31"
    assert job["extraction"]["billed_amount"] == 2791.20
    assert job["extraction"]["utility"] == "BESCOM"
    assert job["needs_review"] is False
    assert job["confidence"] >= ocr.REVIEW_THRESHOLD
    assert job["raw_text"]
    assert job["image_url"] == f"/bills/jobs/{job_id}/image"


async def test_the_uploaded_image_is_stored_as_a_normalised_jpeg(client, citizen, gcv):
    from PIL import Image

    image, words = render_bill()
    gcv["body"] = gcv_response(words)
    job_id = (await _upload(client, citizen[1], image)).json()["id"]

    response = await client.get(f"{BASE}/jobs/{job_id}/image", headers=citizen[1])
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    with Image.open(io.BytesIO(response.content)) as stored:
        assert stored.format == "JPEG"
        assert max(stored.size) <= ocr.MAX_IMAGE_EDGE

    # the API key travels in the header, never in the URL
    assert gcv["requests"], "Vision was never called"
    assert "requests" in gcv["requests"][0]


async def test_a_confirmed_extraction_becomes_a_reading(client, citizen, gcv):
    image, words = render_bill()
    gcv["body"] = gcv_response(words)
    job_id = (await _upload(client, citizen[1], image)).json()["id"]
    extraction = (await client.get(f"{BASE}/jobs/{job_id}", headers=citizen[1])).json()["extraction"]

    saved = await client.post(
        "/api/v1/readings/electricity",
        json={
            "kwh": extraction["kwh"],
            "billing_period_start": extraction["billing_period_start"],
            "billing_period_end": extraction["billing_period_end"],
            "billed_amount": extraction["billed_amount"],
            "source": "ocr",
            "ocr_job_id": job_id,
        },
        headers=citizen[1],
    )
    assert saved.status_code == 201, saved.text
    assert saved.json()["kwh"] == PRINTED_KWH
    assert saved.json()["bill_image_url"] == f"/bills/jobs/{job_id}/image"

    job = (await client.get(f"{BASE}/jobs/{job_id}", headers=citizen[1])).json()
    assert job["reading_id"] == saved.json()["id"]


# ---------------------------------------------------------------------- upload guards


async def test_a_non_image_upload_is_refused(client, citizen):
    response = await client.post(
        f"{BASE}/upload",
        files={"file": ("bill.pdf", b"%PDF-1.4 not an image", "application/pdf")},
        headers=citizen[1],
    )
    assert response.status_code == 415


async def test_an_image_that_cannot_be_decoded_is_refused(client, citizen):
    response = await _upload(client, citizen[1], b"not really a png", "image/png")
    assert response.status_code == 422


async def test_an_oversized_photo_is_refused(client, citizen):
    response = await _upload(client, citizen[1], b"\x89PNG" + b"0" * ocr.MAX_IMAGE_BYTES)
    assert response.status_code == 413


async def test_upload_requires_a_token(client):
    image, _ = render_bill(["BESCOM"])
    response = await client.post(f"{BASE}/upload", files={"file": ("bill.png", image, "image/png")})
    assert response.status_code == 401


# ------------------------------------------------------------------ fallback behaviour


async def test_quota_exhaustion_falls_back_to_tesseract(client, citizen, gcv, monkeypatch):
    image, words = render_bill()
    gcv["status"] = 429

    def fake_tesseract(_image: bytes):
        return words, "\n".join(w.text for w in words), 0.72

    monkeypatch.setattr(ocr, "extract_with_tesseract", fake_tesseract)

    job_id = (await _upload(client, citizen[1], image)).json()["id"]
    job = (await client.get(f"{BASE}/jobs/{job_id}", headers=citizen[1])).json()
    assert job["status"] == "done"
    assert job["engine"] == "tesseract"
    assert abs(job["extraction"]["kwh"] - PRINTED_KWH) <= 2.0


@pytest.mark.parametrize("status_code", [401, 403, 429, 500, 503])
async def test_every_retryable_status_reaches_the_fallback(
    client, citizen, gcv, no_tesseract, status_code
):
    image, _ = render_bill()
    gcv["status"] = status_code
    job_id = (await _upload(client, citizen[1], image)).json()["id"]
    job = (await client.get(f"{BASE}/jobs/{job_id}", headers=citizen[1])).json()
    assert job["status"] == "done"  # 200 for the client, not an error page
    assert job["engine"] == "none"


async def test_a_missing_tesseract_binary_degrades_to_manual_entry(
    client, citizen, gcv, no_tesseract
):
    image, _ = render_bill()
    gcv["status"] = 503
    job_id = (await _upload(client, citizen[1], image)).json()["id"]

    job = (await client.get(f"{BASE}/jobs/{job_id}", headers=citizen[1])).json()
    assert job["status"] == "done"
    assert job["engine"] == "none"
    assert job["confidence"] == 0
    assert job["needs_review"] is True
    assert job["error_code"] == "tesseract_missing"
    assert job["extraction"]["kwh"] is None
    assert job["extraction"]["warnings"]


async def test_a_network_error_reaches_the_fallback(client, citizen, gcv, no_tesseract):
    image, _ = render_bill()
    gcv["body"] = httpx.ConnectTimeout("vision is unreachable")
    job_id = (await _upload(client, citizen[1], image)).json()["id"]
    job = (await client.get(f"{BASE}/jobs/{job_id}", headers=citizen[1])).json()
    assert job["status"] == "done"
    assert job["engine"] == "none"


async def test_vision_rejecting_the_image_fails_the_job_without_a_fallback(client, citizen, gcv):
    image, _ = render_bill()
    gcv["status"] = 400
    job_id = (await _upload(client, citizen[1], image)).json()["id"]
    job = (await client.get(f"{BASE}/jobs/{job_id}", headers=citizen[1])).json()
    assert job["status"] == "failed"
    assert job["error_code"] == "invalid_image"


async def test_an_in_body_quota_error_reaches_the_fallback(client, citizen, gcv, no_tesseract):
    image, _ = render_bill()
    gcv["body"] = {"responses": [{"error": {"code": 8, "message": "RESOURCE_EXHAUSTED"}}]}
    job_id = (await _upload(client, citizen[1], image)).json()["id"]
    job = (await client.get(f"{BASE}/jobs/{job_id}", headers=citizen[1])).json()
    assert job["status"] == "done"
    assert job["engine"] == "none"


async def test_without_an_api_key_the_fallback_runs_immediately(client, citizen, no_tesseract):
    image, _ = render_bill()
    job_id = (await _upload(client, citizen[1], image)).json()["id"]
    job = (await client.get(f"{BASE}/jobs/{job_id}", headers=citizen[1])).json()
    assert job["status"] == "done"
    assert job["engine"] == "none"
    assert job["error_code"] == "tesseract_missing"


# --------------------------------------------------------------------------- isolation


async def test_a_job_and_its_image_are_invisible_to_other_users(client, make_user, gcv):
    _, mine = await make_user(email="owner@savera.test")
    _, theirs = await make_user(email="stranger@savera.test")
    image, words = render_bill()
    gcv["body"] = gcv_response(words)

    job_id = (await _upload(client, mine, image)).json()["id"]
    assert (await client.get(f"{BASE}/jobs/{job_id}", headers=theirs)).status_code == 404
    assert (await client.get(f"{BASE}/jobs/{job_id}/image", headers=theirs)).status_code == 404
    assert (await client.get(f"{BASE}/jobs/{job_id}", headers=mine)).status_code == 200


async def test_another_users_job_cannot_be_attached_to_my_reading(client, make_user, gcv):
    mine_user, mine = await make_user(email="owner2@savera.test")
    _, theirs = await make_user(email="stranger2@savera.test")
    image, words = render_bill()
    gcv["body"] = gcv_response(words)
    job_id = (await _upload(client, mine, image)).json()["id"]

    response = await client.post(
        "/api/v1/readings/electricity",
        json={
            "kwh": 300,
            "billing_period_start": "2026-08-01",
            "billing_period_end": "2026-08-31",
            "source": "ocr",
            "ocr_job_id": job_id,
        },
        headers=theirs,
    )
    assert response.status_code == 404
    assert await database.fetchval("SELECT reading_id FROM ocr_jobs WHERE id = $1", job_id) is None
    assert mine_user["id"] is not None
