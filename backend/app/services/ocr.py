"""Electricity-bill OCR: image -> words -> rows -> parsed fields (PHASE0_PLAN.md section 7).

This is plain pattern matching over OCR output. Nothing here is machine learning, and the
result is always shown to the user for confirmation before it becomes a reading.

Three layers, each usable on its own:

1. ``preprocess_image`` — Pillow-only clean-up; the JPEG it returns is what gets stored.
2. ``extract_words`` (Google Cloud Vision REST, Tesseract fallback) -> ``Word`` boxes ->
   ``rows_from_words`` — turns column-major OCR output back into human reading order, which
   is what breaks naive "label then nearest number" parsing on MSEDCL bills.
3. ``parse_bill`` — a **pure** function over rows. Every parser test drives this directly,
   with no network and no Tesseract binary.

Row pipeline order is fixed and each step exists because it fixed a real misread:
digit-confusion repair -> pull dates out -> mask date spans -> mask ID numbers
(RR No / Consumer No ...) -> drop slab and tariff rows -> search numbers near labels.
"""

from __future__ import annotations

import io
import logging
import re
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Literal

import httpx

from app.config import get_settings
from app.models.readings import ist_today

logger = logging.getLogger("savera.ocr")

Engine = Literal["gcv", "tesseract", "none"]

#: A row is a list of horizontally separated segments ("Units Consumed" | "342" | "kWh").
Row = list[str]

# --------------------------------------------------------------------------- bounds

MIN_KWH, MAX_KWH = 1.0, 5000.0
MIN_AMOUNT, MAX_AMOUNT = 10.0, 100_000.0
MIN_PERIOD_DAYS, MAX_PERIOD_DAYS = 20, 70
MAX_BILL_AGE_DAYS = 3 * 365
MAX_BILL_FUTURE_DAYS = 60
CROSS_CHECK_TOLERANCE = 2.0  # kWh; the spec's accuracy target
REVIEW_THRESHOLD = 70

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_EDGE = 2000
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


@dataclass(slots=True)
class Word:
    """One OCR token with its bounding box in pixel space."""

    text: str
    left: float
    top: float
    right: float
    bottom: float
    confidence: float | None = None

    @property
    def center_y(self) -> float:
        return (self.top + self.bottom) / 2

    @property
    def height(self) -> float:
        return max(1.0, self.bottom - self.top)


@dataclass(slots=True)
class BillExtraction:
    """What we think the bill says. Every field may be None — the user confirms it."""

    kwh: float | None = None
    billing_period_start: date | None = None
    billing_period_end: date | None = None
    billed_amount: float | None = None
    utility: str | None = None
    field_confidence: dict[str, int] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "kwh": self.kwh,
            "billing_period_start": (
                self.billing_period_start.isoformat() if self.billing_period_start else None
            ),
            "billing_period_end": (
                self.billing_period_end.isoformat() if self.billing_period_end else None
            ),
            "billed_amount": self.billed_amount,
            "utility": self.utility,
            "field_confidence": self.field_confidence,
            "warnings": self.warnings,
        }


@dataclass(slots=True)
class ParsedBill:
    extraction: BillExtraction
    confidence: int
    needs_review: bool


class OcrError(Exception):
    """Raised with a stable `code` so the job row can explain itself to the UI."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


# ------------------------------------------------------------------ image preprocessing


def preprocess_image(data: bytes) -> bytes:
    """EXIF-rotate, grayscale, cap the longest side, autocontrast, re-encode as JPEG q85.

    Phone photos of bills are usually rotated, huge and low-contrast; this is what lifts
    Tesseract from unusable to merely mediocre, and it halves the GCV upload.
    """
    from PIL import Image, ImageOps

    try:
        with Image.open(io.BytesIO(data)) as img:
            img = ImageOps.exif_transpose(img)
            img = img.convert("L")
            if max(img.size) > MAX_IMAGE_EDGE:
                img.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE), Image.LANCZOS)
            img = ImageOps.autocontrast(img)
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=85, optimize=True)
            return buffer.getvalue()
    except OcrError:
        raise
    except Exception as exc:  # unreadable / not an image / decompression bomb
        raise OcrError("invalid_image", f"Could not read that image: {exc}") from exc


# ------------------------------------------------------------------- words -> rows


def rows_from_words(words: Sequence[Word]) -> list[Row]:
    """Cluster words into visual rows, then split each row into column segments.

    Vertical clustering uses the median word height (a row break is half a line); the column
    break is a horizontal gap wider than 3x the median character width, which is what keeps a
    label in one segment and its value in the next instead of gluing a neighbouring column's
    number onto the label.
    """
    if not words:
        return []
    heights = sorted(w.height for w in words)
    median_height = heights[len(heights) // 2]
    row_tolerance = median_height * 0.6

    char_widths = [
        (w.right - w.left) / len(w.text) for w in words if w.text and (w.right - w.left) > 0
    ]
    char_widths.sort()
    median_char_width = char_widths[len(char_widths) // 2] if char_widths else median_height * 0.5
    column_gap = median_char_width * 3

    clusters: list[list[Word]] = []
    for word in sorted(words, key=lambda w: (w.center_y, w.left)):
        if clusters and abs(word.center_y - clusters[-1][-1].center_y) <= row_tolerance:
            clusters[-1].append(word)
        else:
            clusters.append([word])

    rows: list[Row] = []
    for cluster in clusters:
        ordered = sorted(cluster, key=lambda w: w.left)
        segments: list[list[str]] = [[ordered[0].text]]
        previous = ordered[0]
        for word in ordered[1:]:
            if word.left - previous.right > column_gap:
                segments.append([word.text])
            else:
                segments[-1].append(word.text)
            previous = word
        rows.append([" ".join(parts).strip() for parts in segments if " ".join(parts).strip()])
    return [row for row in rows if row]


def rows_from_text(text: str) -> list[Row]:
    """Fallback for plain OCR text (and for the parser fixtures): one segment per line."""
    return [[line.strip()] for line in text.splitlines() if line.strip()]


def rows_to_text(rows: Sequence[Row]) -> str:
    return "\n".join("   ".join(row) for row in rows)


# ------------------------------------------------------------------- row normalisation

_CONFUSIONS = str.maketrans({"O": "0", "o": "0", "l": "1", "I": "1", "|": "1", "S": "5", "B": "8"})
_SEPARATORS = ",.-/: "


def _fix_digit_confusions(token: str) -> str:
    """Repair O/l/I/S/B inside tokens that are *otherwise* numeric ("3O0" -> "300").

    Applied per token so that words like "Units" and "BESCOM" are never touched.
    """
    core = "".join(ch for ch in token if ch not in _SEPARATORS)
    if not core or not any(ch.isdigit() for ch in core):
        return token
    if all(ch.isdigit() or ch in "OolI|SB" for ch in core):
        return token.translate(_CONFUSIONS)
    return token


def normalise_rows(rows: Sequence[Row]) -> list[Row]:
    return [[" ".join(_fix_digit_confusions(t) for t in seg.split()) for seg in row] for row in rows]


# ------------------------------------------------------------------------------ dates

_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}  # fmt: skip
_MONTH_NAMES = (
    "january|february|march|april|may|june|july|august|september|october|november|december"
    "|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec"
)

# Ordered most specific first; every pattern is day-first (Indian bills never use MM/DD).
_DATE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b"), "iso"),
    (re.compile(rf"\b(\d{{1,2}})[-/. ]({_MONTH_NAMES})[-/. ](\d{{4}}|\d{{2}})\b", re.I), "dmy_name"),
    (re.compile(r"\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b"), "dmy_num"),
]
# Month-only ("MAR-2026", "March 2026", "03/2026") — used to derive a period when no range exists.
_MONTH_ONLY_PATTERNS: list[re.Pattern[str]] = [
    re.compile(rf"\b({_MONTH_NAMES})[-/, ]+(\d{{4}})\b", re.I),
    re.compile(r"\b(0?[1-9]|1[0-2])[-/](\d{4})\b"),
]


def _expand_year(value: int) -> int:
    return value + 2000 if value < 100 else value


def _safe_date(year: int, month: int, day: int) -> date | None:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def find_dates(text: str) -> list[tuple[date, int, int]]:
    """Every parseable date in `text` as (date, span_start, span_end), left to right."""
    found: list[tuple[date, int, int]] = []
    claimed: list[tuple[int, int]] = []
    for pattern, kind in _DATE_PATTERNS:
        for match in pattern.finditer(text):
            if any(match.start() < end and start < match.end() for start, end in claimed):
                continue
            a, b, c = match.group(1), match.group(2), match.group(3)
            if kind == "iso":
                parsed = _safe_date(int(a), int(b), int(c))
            elif kind == "dmy_name":
                month = _MONTHS.get(b.lower()[:4]) or _MONTHS.get(b.lower()[:3])
                parsed = _safe_date(_expand_year(int(c)), month, int(a)) if month else None
            else:
                parsed = _safe_date(_expand_year(int(c)), int(b), int(a))
            if parsed is not None:
                found.append((parsed, match.start(), match.end()))
                claimed.append((match.start(), match.end()))
    found.sort(key=lambda item: item[1])
    return found


def find_month(text: str) -> date | None:
    """First "March 2026" / "03/2026" style month reference, as its 1st."""
    for pattern in _MONTH_ONLY_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        a, year = match.group(1), int(match.group(2))
        month = _MONTHS.get(a.lower()[:4]) or _MONTHS.get(a.lower()[:3]) if a.isalpha() else int(a)
        if month and 1 <= month <= 12:
            return _safe_date(year, month, 1)
    return None


def month_end(day: date) -> date:
    return date(day.year + day.month // 12, day.month % 12 + 1, 1) - timedelta(days=1)


def _plausible_date(value: date, today: date) -> bool:
    return (
        today - timedelta(days=MAX_BILL_AGE_DAYS)
        <= value
        <= today + timedelta(days=MAX_BILL_FUTURE_DAYS)
    )


# ---------------------------------------------------------------------------- masking

_ID_LABELS = re.compile(
    r"(rr\s*(no|number)|consumer\s*(no|number|id)|account\s*(no|number)|meter\s*(no|number)|"
    r"bill\s*(no|number)|service\s*(no|number)|ca\s*no|k\s*number|invoice\s*(no|number))",
    re.I,
)
_LONG_NUMBER = re.compile(r"\b\d[\d\-/]{6,}\b")
_SLAB_ROW = re.compile(r"(@|per\s*unit|rs\.?\s*/\s*unit|slab|\d\s*x\s*[\d.]+\s*=)", re.I)


def _mask_spans(text: str, spans: Sequence[tuple[int, int]]) -> str:
    """Blank out spans so a later numeric search cannot see them (lengths are preserved)."""
    chars = list(text)
    for start, end in spans:
        for i in range(start, min(end, len(chars))):
            chars[i] = " "
    return "".join(chars)


def _mask_identifiers(segment: str) -> str:
    """Blank long digit runs and anything following an ID label — never a consumption value."""
    spans = [m.span() for m in _LONG_NUMBER.finditer(segment)]
    label = _ID_LABELS.search(segment)
    if label:
        spans.append((label.start(), len(segment)))
    return _mask_spans(segment, spans)


def prepare_rows(rows: Sequence[Row]) -> tuple[list[Row], list[Row]]:
    """Return (normalised rows for date/utility work, masked rows for numeric search)."""
    normalised = normalise_rows(rows)
    masked: list[Row] = []
    for row in normalised:
        joined = " ".join(row)
        if _SLAB_ROW.search(joined):
            masked.append([])  # index-aligned with `normalised`, but invisible to number search
            continue
        cleaned: Row = []
        for segment in row:
            without_dates = _mask_spans(segment, [(s, e) for _, s, e in find_dates(segment)])
            cleaned.append(_mask_identifiers(without_dates))
        masked.append(cleaned)
    return normalised, masked


# ------------------------------------------------------------------- numeric helpers

_NUMBER = re.compile(r"\b\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?\b|\b\d+(?:\.\d{1,2})?\b")


def _numbers_in(segment: str, *, start: int = 0) -> list[float]:
    values: list[float] = []
    for match in _NUMBER.finditer(segment, start):
        try:
            values.append(float(match.group(0).replace(",", "")))
        except ValueError:  # pragma: no cover - regex guarantees a number
            continue
    return values


def _numbers_near_label(
    masked: Sequence[Row], row_index: int, segment_index: int, label_end: int
) -> list[float]:
    """Numbers to the right of a label, then below it (column-major bills put them there)."""
    row = masked[row_index]
    values = _numbers_in(row[segment_index], start=label_end)
    for segment in row[segment_index + 1 :]:
        values.extend(_numbers_in(segment))
    if not values and row_index + 1 < len(masked):
        for segment in masked[row_index + 1]:
            values.extend(_numbers_in(segment))
    return values


# ------------------------------------------------------------------------ field rules

# (pattern, weight) — a higher weight wins when two labels both yield a number.
_KWH_LABELS: list[tuple[re.Pattern[str], int]] = [
    (re.compile(r"units?\s*consumed", re.I), 100),
    (re.compile(r"consumption\s*\(?\s*units?\s*\)?", re.I), 95),
    (re.compile(r"(total|net|billed)\s*units?", re.I), 90),
    (re.compile(r"energy\s*consumed", re.I), 85),
    (re.compile(r"assessment\s*(units?)?", re.I), 60),  # TNEB
    (re.compile(r"\bconsumption\b", re.I), 55),
    (re.compile(r"\bk\s?wh\b", re.I), 40),
    (re.compile(r"\bunits?\b", re.I), 30),
]
_AMOUNT_LABELS: list[tuple[re.Pattern[str], int]] = [
    (re.compile(r"net\s*amount\s*payable", re.I), 100),
    (re.compile(r"total\s*bill\s*amount", re.I), 95),
    (re.compile(r"rounded\s*bill\s*amount", re.I), 90),  # MSEDCL
    (re.compile(r"amount\s*payable", re.I), 85),
    (re.compile(r"net\s*payable", re.I), 85),
    (re.compile(r"(total|bill)\s*amount", re.I), 70),
    (re.compile(r"amount\s*due", re.I), 65),
]
_AMOUNT_EXCLUSIONS = re.compile(
    r"(after\s*due|arrear|energy\s*charge|fixed\s*charge|rebate|subsidy|tax|duty|deposit|"
    r"previous\s*balance|adjustment)",
    re.I,
)
_PERIOD_LABELS = re.compile(
    r"(billing\s*period|bill\s*period|period\s*(of\s*)?(supply|consumption)?|from\s*date|"
    r"reading\s*(date|period)|consumption\s*period|service\s*period)",
    re.I,
)
_PRESENT_LABEL = re.compile(r"(present|current|final)\s*reading", re.I)
_PREVIOUS_LABEL = re.compile(r"(previous|prev|initial|last)\s*reading", re.I)
_MF_LABEL = re.compile(r"(multiplying\s*factor|\bmf\b|meter\s*constant)", re.I)

_UTILITIES: list[tuple[str, re.Pattern[str]]] = [
    ("BESCOM", re.compile(r"(bescom|bangalore\s*electricity\s*supply)", re.I)),
    ("MSEDCL", re.compile(r"(msedcl|mahavitaran|maharashtra\s*state\s*electricity)", re.I)),
    ("TNEB", re.compile(r"(tneb|tangedco|tamil\s*nadu\s*(generation|electricity))", re.I)),
]


def _best_labelled_value(
    normalised: Sequence[Row],
    masked: Sequence[Row],
    labels: Sequence[tuple[re.Pattern[str], int]],
    *,
    low: float,
    high: float,
    exclude: re.Pattern[str] | None = None,
) -> tuple[float | None, int]:
    """Highest-weighted label whose nearby numbers fall inside the sanity bounds."""
    best: tuple[int, float] | None = None
    for row_index, row in enumerate(normalised):
        if not masked[row_index]:  # slab / tariff row
            continue
        for segment_index, segment in enumerate(row):
            if exclude is not None and exclude.search(segment):
                continue
            for pattern, weight in labels:
                match = pattern.search(segment)
                if match is None:
                    continue
                if segment_index >= len(masked[row_index]):
                    continue
                for value in _numbers_near_label(masked, row_index, segment_index, match.end()):
                    if low <= value <= high:  # the first *plausible* number after the label
                        if best is None or weight > best[0]:
                            best = (weight, value)
                        break
                break  # strongest matching label for this segment wins
    return (best[1], best[0]) if best else (None, 0)


def _derive_from_meter_readings(
    normalised: Sequence[Row], masked: Sequence[Row]
) -> float | None:
    """(present - previous) x multiplying factor, with meter rollover handled."""
    present, _ = _best_labelled_value(
        normalised, masked, [(_PRESENT_LABEL, 100)], low=0, high=10_000_000
    )
    previous, _ = _best_labelled_value(
        normalised, masked, [(_PREVIOUS_LABEL, 100)], low=0, high=10_000_000
    )
    if present is None or previous is None:
        return None
    if present >= previous:
        units = present - previous
    else:  # the mechanical counter wrapped past its highest digit
        units = present + 10 ** len(str(int(previous))) - previous
    factor, _ = _best_labelled_value(normalised, masked, [(_MF_LABEL, 100)], low=0.1, high=100)
    units *= factor or 1.0
    return round(units, 2) if MIN_KWH <= units <= MAX_KWH else None


def _find_period(
    normalised: Sequence[Row], today: date
) -> tuple[date | None, date | None, str]:
    """Billing period, best source first: explicit range > reading dates > bill month."""
    for row in normalised:
        joined = "   ".join(row)
        if not _PERIOD_LABELS.search(joined):
            continue
        dates = [d for d, _, _ in find_dates(joined) if _plausible_date(d, today)]
        if len(dates) >= 2:
            start, end = min(dates[:2]), max(dates[:2])
            if MIN_PERIOD_DAYS - 10 <= (end - start).days <= MAX_PERIOD_DAYS + 10:
                return start, end, "range"

    all_dates = sorted(
        {d for row in normalised for d, _, _ in find_dates("   ".join(row)) if _plausible_date(d, today)}
    )
    for i in range(len(all_dates) - 1):
        for j in range(i + 1, len(all_dates)):
            span = (all_dates[j] - all_dates[i]).days
            if MIN_PERIOD_DAYS <= span <= MAX_PERIOD_DAYS:
                return all_dates[i], all_dates[j], "dates"

    for row in normalised:
        month = find_month("   ".join(row))
        if month is not None and _plausible_date(month, today):
            return month, month_end(month), "month"
    return None, None, "none"


def _find_utility(normalised: Sequence[Row]) -> str | None:
    text = rows_to_text(normalised)
    for name, pattern in _UTILITIES:
        if pattern.search(text):
            return name
    return None


# ------------------------------------------------------------------------ the parser


def parse_bill(
    source: str | Sequence[Row],
    *,
    today: date | None = None,
    engine: Engine = "gcv",
    symbol_confidence: float | None = None,
) -> ParsedBill:
    """Parse an electricity bill. Pure: no I/O, no clock beyond the injectable `today`."""
    today = today or ist_today()
    rows: Sequence[Row] = rows_from_text(source) if isinstance(source, str) else source
    normalised, masked = prepare_rows(rows)

    extraction = BillExtraction(utility=_find_utility(normalised))
    warnings = extraction.warnings

    labelled_kwh, kwh_weight = _best_labelled_value(
        normalised, masked, _KWH_LABELS, low=MIN_KWH, high=MAX_KWH
    )
    derived_kwh = _derive_from_meter_readings(normalised, masked)

    agreement_bonus = 0
    if labelled_kwh is not None and derived_kwh is not None:
        if abs(labelled_kwh - derived_kwh) <= CROSS_CHECK_TOLERANCE:
            agreement_bonus = 10
        else:
            agreement_bonus = -20
            warnings.append(
                f"Labelled units ({labelled_kwh:g}) and meter difference ({derived_kwh:g}) disagree"
            )
    extraction.kwh = labelled_kwh if labelled_kwh is not None else derived_kwh
    if extraction.kwh is None and derived_kwh is None and labelled_kwh is None:
        warnings.append("No units-consumed figure found")

    start, end, period_source = _find_period(normalised, today)
    extraction.billing_period_start, extraction.billing_period_end = start, end
    if start is None:
        warnings.append("No billing period found")

    extraction.billed_amount, amount_weight = _best_labelled_value(
        normalised, masked, _AMOUNT_LABELS, low=MIN_AMOUNT, high=MAX_AMOUNT, exclude=_AMOUNT_EXCLUSIONS
    )

    # ---- confidence (additive, then penalties) ----
    confidence = 0
    if extraction.kwh is not None:
        confidence += 50
    if start is not None and end is not None:
        confidence += 25 if period_source in ("range", "dates") else 15
    if extraction.billed_amount is not None:
        confidence += 15
    if extraction.utility is not None:
        confidence += 10
    confidence += agreement_bonus

    if engine == "tesseract":
        confidence -= 10
    if symbol_confidence is not None and symbol_confidence < 0.80:
        confidence -= 10
        warnings.append("The photo is blurry or low-contrast — please check every figure")
    if start is not None and end is not None:
        days = (end - start).days + 1
        if not MIN_PERIOD_DAYS <= days <= MAX_PERIOD_DAYS:
            confidence -= 15
            warnings.append(f"Unusual billing period length ({days} days)")
    if labelled_kwh is not None and kwh_weight <= 40:
        confidence -= 10  # matched only a bare "kWh"/"units" label
    confidence = max(0, min(100, confidence))

    extraction.field_confidence = {
        "kwh": min(100, kwh_weight) if labelled_kwh is not None else (70 if derived_kwh else 0),
        "billing_period": {"range": 95, "dates": 75, "month": 50, "none": 0}[period_source],
        "billed_amount": min(100, amount_weight),
        "utility": 100 if extraction.utility else 0,
    }

    needs_review = (
        confidence < REVIEW_THRESHOLD
        or extraction.kwh is None
        or extraction.kwh == 0
        or start is None
        or end is None
    )
    return ParsedBill(extraction=extraction, confidence=confidence, needs_review=needs_review)


# --------------------------------------------------------------------- engine: GCV

_GCV_RETRYABLE_BODY_CODES = {7, 8, 13, 14}  # permission, quota, internal, unavailable


def _words_from_gcv(payload: dict[str, Any]) -> tuple[list[Word], str, float | None]:
    responses = payload.get("responses") or [{}]
    response = responses[0]
    if "error" in response:
        code = response["error"].get("code")
        message = response["error"].get("message", "Vision API error")
        if code in _GCV_RETRYABLE_BODY_CODES:
            raise OcrError("gcv_retryable", message)
        raise OcrError("invalid_image", message)

    annotations = response.get("textAnnotations") or []
    full_text = annotations[0]["description"] if annotations else (
        response.get("fullTextAnnotation", {}).get("text", "")
    )
    words: list[Word] = []
    for annotation in annotations[1:]:
        vertices = annotation.get("boundingPoly", {}).get("vertices") or []
        xs = [v.get("x", 0) for v in vertices]
        ys = [v.get("y", 0) for v in vertices]
        if not xs or not ys:
            continue
        words.append(
            Word(annotation.get("description", ""), min(xs), min(ys), max(xs), max(ys))
        )

    confidences = [
        word.get("confidence")
        for page in response.get("fullTextAnnotation", {}).get("pages", [])
        for block in page.get("blocks", [])
        for paragraph in block.get("paragraphs", [])
        for word in paragraph.get("words", [])
        if word.get("confidence") is not None
    ]
    mean_confidence = sum(confidences) / len(confidences) if confidences else None
    return words, full_text, mean_confidence


def _default_client() -> httpx.AsyncClient:
    """The HTTP client used for Vision calls. Tests swap this for a MockTransport client."""
    return httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0))


async def extract_with_gcv(
    image: bytes, *, client: httpx.AsyncClient | None = None
) -> tuple[list[Word], str, float | None]:
    """DOCUMENT_TEXT_DETECTION over the REST endpoint. Raises OcrError; never returns partial."""
    import base64

    settings = get_settings()
    if not settings.gcv_api_key:
        raise OcrError("gcv_unconfigured", "GCV_API_KEY is not set")

    body = {
        "requests": [
            {
                "image": {"content": base64.b64encode(image).decode("ascii")},
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                "imageContext": {"languageHints": ["en"]},
            }
        ]
    }
    owns_client = client is None
    client = client or _default_client()
    try:
        response = await client.post(
            settings.gcv_endpoint,
            json=body,
            headers={"x-goog-api-key": settings.gcv_api_key},
        )
    except httpx.HTTPError as exc:
        raise OcrError("gcv_retryable", f"Vision API unreachable: {exc}") from exc
    finally:
        if owns_client:
            await client.aclose()

    if response.status_code == 400:
        raise OcrError("invalid_image", "Vision API rejected the image")
    if response.status_code in (401, 403, 429) or response.status_code >= 500:
        raise OcrError("gcv_retryable", f"Vision API returned {response.status_code}")
    if response.status_code != 200:
        raise OcrError("gcv_failed", f"Vision API returned {response.status_code}")
    return _words_from_gcv(response.json())


# --------------------------------------------------------------- engine: Tesseract


def extract_with_tesseract(image: bytes) -> tuple[list[Word], str, float | None]:
    """Local fallback. A missing binary raises OcrError('tesseract_missing') — never a 500."""
    try:
        import pytesseract
        from PIL import Image
    except ImportError as exc:  # pragma: no cover - pytesseract is a pinned dependency
        raise OcrError("tesseract_missing", "pytesseract is not installed") from exc

    settings = get_settings()
    if settings.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
    try:
        with Image.open(io.BytesIO(image)) as img:
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    except (pytesseract.TesseractNotFoundError, OSError) as exc:
        raise OcrError("tesseract_missing", f"Tesseract is not available: {exc}") from exc
    except Exception as exc:
        raise OcrError("tesseract_failed", f"Tesseract failed: {exc}") from exc

    words: list[Word] = []
    confidences: list[float] = []
    for i, text in enumerate(data["text"]):
        text = (text or "").strip()
        if not text:
            continue
        confidence = float(data["conf"][i])
        if confidence >= 0:
            confidences.append(confidence / 100)
        left, top = float(data["left"][i]), float(data["top"][i])
        words.append(Word(text, left, top, left + float(data["width"][i]), top + float(data["height"][i]), confidence / 100))
    mean_confidence = sum(confidences) / len(confidences) if confidences else None
    return words, "\n".join(w.text for w in words), mean_confidence


# ------------------------------------------------------------------- orchestration


@dataclass(slots=True)
class OcrResult:
    engine: Engine
    parsed: ParsedBill
    raw_text: str
    error_code: str | None = None


async def run_ocr(
    image: bytes, *, today: date | None = None, client: httpx.AsyncClient | None = None
) -> OcrResult:
    """GCV first, Tesseract on any retryable failure, and an honest empty result if both fail.

    This never raises for anything but a genuinely unreadable image: a bill we cannot read is
    still a job the user can complete by typing the numbers in.
    """
    engine: Engine = "none"
    words: list[Word] = []
    raw_text = ""
    symbol_confidence: float | None = None
    error_code: str | None = None

    try:
        words, raw_text, symbol_confidence = await extract_with_gcv(image, client=client)
        engine = "gcv"
    except OcrError as gcv_error:
        if gcv_error.code == "invalid_image":
            raise
        logger.info("GCV unavailable (%s); falling back to Tesseract", gcv_error.code)
        try:
            words, raw_text, symbol_confidence = extract_with_tesseract(image)
            engine = "tesseract"
        except OcrError as tesseract_error:
            logger.warning("Tesseract unavailable (%s); manual entry only", tesseract_error.code)
            error_code = tesseract_error.code

    rows = rows_from_words(words) if words else rows_from_text(raw_text)
    parsed = parse_bill(rows, today=today, engine=engine, symbol_confidence=symbol_confidence)
    if engine == "none":
        parsed.confidence = 0
        parsed.needs_review = True
        parsed.extraction.warnings.append("Could not read the image — please enter the figures")
    return OcrResult(engine=engine, parsed=parsed, raw_text=raw_text or rows_to_text(rows), error_code=error_code)
