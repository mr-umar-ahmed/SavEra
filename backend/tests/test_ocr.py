"""Bill parser gate (Phase 1): "given a BESCOM bill image, extraction returns kWh +- 2".

These tests drive ``parse_bill`` directly — no network, no Tesseract binary, no database —
because the parser is a pure function over OCR rows. The fixtures are written the way real
Google Cloud Vision output reads, including the things that actually break naive parsers:

* distractor numbers (sanctioned load, meter rent, amount after due date, free units),
* OCR digit confusions (``3O5``, ``8l240``, ``I5-07-2026``),
* consumer/RR/meter numbers that look like large consumption figures,
* column-major word order, where a label and its value arrive far apart in the stream.

``ACCEPTANCE_TOLERANCE`` is the spec's +-2 kWh.
"""

from __future__ import annotations

from datetime import date

import pytest

from app.services import ocr
from app.services.ocr import Word, find_dates, parse_bill, rows_from_words

TODAY = date(2026, 9, 24)
ACCEPTANCE_TOLERANCE = 2.0


# --------------------------------------------------------------------------- fixtures

BESCOM_CLEAN = """BESCOM
Bangalore Electricity Supply Company Limited
Consumer No : 1234567890
RR No       : W5-1234567
Bill No     : BL/2026/0034512
Bill Date   : 05-09-2026
Billing Period : 01-08-2026 to 31-08-2026
Sanctioned Load : 5 KW
Previous Reading : 45210
Present Reading  : 45552
Multiplying Factor : 1
Units Consumed   : 342
Energy Charges @ 7.10 per unit : 2428.20
Fixed Charges : 120.00
Tax & Duty : 243.00
Net Amount Payable : 2791.20
Amount After Due Date : 2891.20
Due Date : 20-09-2026
"""

BESCOM_NOISY = """BESC0M
Bangalore Electricity Supply Company Ltd
RR No: N4-8876543
Bill Date: I5-07-2026
Period of Supply: 01-06-2026 To 30-06-2026
Sanctioned Load: 5 KW
Previous Reading: 8l240
Present Reading: 81545
Units Consumed: 3O5
Energy Charges @ 6.95 per unit: 2119.75
Meter Rent: 25.00
Net Amount Payable: 2489.00
"""

MSEDCL_ROW_MAJOR = """MAHAVITARAN
Maharashtra State Electricity Distribution Co. Ltd.
Consumer No. 010203040506
Meter No 9876543
Bill Month MAR-2026
Bill Date 07-APR-2026
Previous Reading 12450
Present Reading 12712
Units Consumed 262
Energy Charges 1834.00
Fixed Charge 128.00
Rounded Bill Amount 2190.00
Bill Amount After Due Date 2290.00
"""

TNEB_FREE_UNITS = """TANGEDCO
Tamil Nadu Generation and Distribution Corporation Ltd
Service No: 1234567890
Assessment Period: 01/07/2026 - 31/08/2026
Free Units: 100
Units Consumed: 486
Net Amount Payable: 1842.00
Amount After Due Date: 1942.00
"""


def _parse(text: str):
    return parse_bill(text, today=TODAY)


# ------------------------------------------------------------- the acceptance criterion


@pytest.mark.parametrize(
    ("name", "text", "expected_kwh"),
    [
        ("bescom_clean", BESCOM_CLEAN, 342),
        ("bescom_noisy", BESCOM_NOISY, 305),
        ("msedcl_row_major", MSEDCL_ROW_MAJOR, 262),
        ("tneb_free_units", TNEB_FREE_UNITS, 486),
    ],
)
def test_kwh_within_two_units(name: str, text: str, expected_kwh: int):
    result = _parse(text)
    assert result.extraction.kwh is not None, f"{name}: no kWh found"
    assert abs(result.extraction.kwh - expected_kwh) <= ACCEPTANCE_TOLERANCE, name


def test_bescom_clean_reads_every_field():
    result = _parse(BESCOM_CLEAN)
    extraction = result.extraction
    assert extraction.kwh == 342
    assert extraction.billing_period_start == date(2026, 8, 1)
    assert extraction.billing_period_end == date(2026, 8, 31)
    assert extraction.billed_amount == 2791.20  # not the 2891.20 after-due-date figure
    assert extraction.utility == "BESCOM"
    assert result.confidence >= ocr.REVIEW_THRESHOLD
    assert result.needs_review is False
    assert extraction.warnings == []


def test_noisy_bill_survives_digit_confusions():
    result = _parse(BESCOM_NOISY)
    assert result.extraction.kwh == 305  # "3O5" and the "8l240" meter reading both repaired
    assert result.extraction.billing_period_start == date(2026, 6, 1)
    assert result.extraction.billing_period_end == date(2026, 6, 30)
    assert result.extraction.billed_amount == 2489.00
    assert result.extraction.utility == "BESCOM"  # matched on the expanded company name


def test_msedcl_falls_back_to_the_bill_month_for_its_period():
    result = _parse(MSEDCL_ROW_MAJOR)
    assert result.extraction.kwh == 262
    assert result.extraction.billing_period_start == date(2026, 3, 1)
    assert result.extraction.billing_period_end == date(2026, 3, 31)
    assert result.extraction.billed_amount == 2190.00
    assert result.extraction.utility == "MSEDCL"
    assert result.extraction.field_confidence["billing_period"] < 95  # derived, not read


def test_tneb_ignores_the_free_units_line():
    result = _parse(TNEB_FREE_UNITS)
    assert result.extraction.kwh == 486
    assert result.extraction.billed_amount == 1842.00
    assert result.extraction.utility == "TNEB"
    # bimonthly assessment period
    assert result.extraction.billing_period_start == date(2026, 7, 1)
    assert result.extraction.billing_period_end == date(2026, 8, 31)


# --------------------------------------------------------- distractors and identifiers


def test_consumer_and_meter_numbers_are_never_read_as_consumption():
    result = _parse(BESCOM_CLEAN)
    assert result.extraction.kwh != 1234567890
    assert result.extraction.billed_amount != 1234567890


def test_slab_rows_cannot_supply_the_amount():
    text = "BESCOM\nUnits Consumed: 300\nTotal Amount @ 7.10 per unit: 2130.00\n"
    result = parse_bill(text, today=TODAY)
    assert result.extraction.billed_amount is None


def test_arrears_and_after_due_date_are_excluded():
    text = (
        "BESCOM\nBilling Period: 01-08-2026 to 31-08-2026\nUnits Consumed: 300\n"
        "Arrears Amount: 5000.00\nNet Amount Payable: 2200.00\nAmount After Due Date: 2300.00\n"
    )
    assert parse_bill(text, today=TODAY).extraction.billed_amount == 2200.00


def test_out_of_range_units_are_rejected():
    text = "BESCOM\nUnits Consumed: 99999\nBilling Period: 01-08-2026 to 31-08-2026\n"
    result = parse_bill(text, today=TODAY)
    assert result.extraction.kwh is None
    assert result.needs_review is True


def test_meter_rollover_is_handled():
    text = (
        "BESCOM\nBilling Period: 01-08-2026 to 31-08-2026\n"
        "Previous Reading: 99880\nPresent Reading: 00190\n"
    )
    # 99880 -> 00190 wraps the five-digit counter: 190 + 100000 - 99880 = 310
    assert parse_bill(text, today=TODAY).extraction.kwh == 310


def test_multiplying_factor_is_applied():
    text = (
        "BESCOM\nBilling Period: 01-08-2026 to 31-08-2026\n"
        "Previous Reading: 1200\nPresent Reading: 1250\nMultiplying Factor: 10\n"
    )
    assert parse_bill(text, today=TODAY).extraction.kwh == 500


def test_disagreement_between_label_and_meter_difference_is_flagged():
    text = (
        "BESCOM\nBilling Period: 01-08-2026 to 31-08-2026\n"
        "Previous Reading: 45210\nPresent Reading: 45552\nUnits Consumed: 500\n"
    )
    result = parse_bill(text, today=TODAY)
    assert result.extraction.kwh == 500  # the printed label still wins
    assert any("disagree" in w for w in result.extraction.warnings)
    assert result.needs_review is True  # the -20 penalty drops it under the threshold


# ------------------------------------------------------------------------ date parsing


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Bill Date 05-03-2026", date(2026, 3, 5)),
        ("Bill Date 05/03/2026", date(2026, 3, 5)),
        ("Bill Date 05.03.2026", date(2026, 3, 5)),
        ("Bill Date 05-03-26", date(2026, 3, 5)),
        ("Bill Date 05-MAR-2026", date(2026, 3, 5)),
        ("Bill Date 05-Mar-26", date(2026, 3, 5)),
        ("Bill Date 5 March 2026", date(2026, 3, 5)),
        ("Reading Date 2026-03-05", date(2026, 3, 5)),
    ],
)
def test_day_first_date_formats(text: str, expected: date):
    dates = find_dates(text)
    assert dates and dates[0][0] == expected


def test_impossible_dates_are_skipped():
    assert find_dates("32-13-2026") == []


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Bill Month MAR-2026", date(2026, 3, 1)),
        ("Bill Month March 2026", date(2026, 3, 1)),
        ("Bill Month 03/2026", date(2026, 3, 1)),
    ],
)
def test_month_only_references(text: str, expected: date):
    assert ocr.find_month(text) == expected


def test_a_bill_from_the_distant_past_does_not_set_the_period():
    text = "BESCOM\nBilling Period: 01-08-1999 to 31-08-1999\nUnits Consumed: 300\n"
    result = parse_bill(text, today=TODAY)
    assert result.extraction.billing_period_start is None
    assert result.needs_review is True


# -------------------------------------------------------------- column-major recovery


def _grid_words(rows: list[list[tuple[str, int]]], *, line_height: int = 40) -> list[Word]:
    """Lay text out as (word, x) pairs per visual row and return GCV-style word boxes."""
    words: list[Word] = []
    for row_index, row in enumerate(rows):
        top = 100 + row_index * line_height
        for text, left in row:
            words.append(Word(text, left, top, left + 11 * len(text), top + 24))
    return words


MSEDCL_COLUMN_GRID: list[list[tuple[str, int]]] = [
    [("MAHAVITARAN", 40)],
    [("Consumer", 40), ("No", 130), ("010203040506", 175), ("Bill", 700), ("Month", 750), ("MAR-2026", 830)],
    [("Previous", 40), ("Reading", 140), ("12450", 700)],
    [("Present", 40), ("Reading", 130), ("12712", 700)],
    [("Units", 40), ("Consumed", 110), ("262", 700)],
    [("Rounded", 40), ("Bill", 140), ("Amount", 200), ("2190.00", 700)],
]


def test_rows_from_words_rebuilds_reading_order_and_columns():
    rows = rows_from_words(_grid_words(MSEDCL_COLUMN_GRID))
    assert len(rows) == len(MSEDCL_COLUMN_GRID)
    assert rows[4] == ["Units Consumed", "262"]  # label and value kept in separate segments
    assert rows[0] == ["MAHAVITARAN"]


def test_column_major_word_stream_still_parses():
    """GCV often emits a whole column before the next one; the row rebuild must undo that."""
    words = _grid_words(MSEDCL_COLUMN_GRID)
    column_major = sorted(words, key=lambda w: (w.left, w.top))  # deliberately scrambled
    result = parse_bill(rows_from_words(column_major), today=TODAY)
    assert result.extraction.kwh == 262
    assert result.extraction.billed_amount == 2190.00
    assert result.extraction.utility == "MSEDCL"


def test_value_below_a_label_is_found():
    """Some layouts print the heading on one line and the figure on the next."""
    rows = [["Units Consumed"], ["418"], ["Billing Period"], ["01-08-2026 to 31-08-2026"]]
    result = parse_bill(rows, today=TODAY)
    assert result.extraction.kwh == 418


# ------------------------------------------------------------- confidence and review


def test_unreadable_text_needs_review_and_scores_zero():
    result = parse_bill("....\n???\n", today=TODAY)
    assert result.extraction.kwh is None
    assert result.confidence == 0
    assert result.needs_review is True
    assert result.extraction.warnings


def test_tesseract_and_blur_penalties_push_a_thin_bill_into_review():
    text = "BESCOM\nBilling Period: 01-08-2026 to 31-08-2026\nUnits Consumed: 342\n"
    clean = parse_bill(text, today=TODAY, engine="gcv")
    blurry = parse_bill(text, today=TODAY, engine="tesseract", symbol_confidence=0.55)
    assert clean.confidence > blurry.confidence
    assert blurry.needs_review is True
    assert any("blurry" in w for w in blurry.extraction.warnings)


def test_unusual_period_length_is_penalised_and_warned():
    text = "BESCOM\nBilling Period: 01-08-2026 to 14-08-2026\nUnits Consumed: 342\n"
    result = parse_bill(text, today=TODAY)
    assert result.extraction.billing_period_end == date(2026, 8, 14)
    assert any("Unusual billing period" in w for w in result.extraction.warnings)


def test_an_implausibly_short_range_falls_back_to_the_bill_month():
    """A 9-day "period" is a misread, so the month the dates sit in is the better answer."""
    text = "BESCOM\nBilling Period: 01-08-2026 to 10-08-2026\nUnits Consumed: 342\n"
    result = parse_bill(text, today=TODAY)
    assert result.extraction.billing_period_start == date(2026, 8, 1)
    assert result.extraction.billing_period_end == date(2026, 8, 31)


def test_field_confidence_is_reported_per_field():
    result = _parse(BESCOM_CLEAN)
    assert set(result.extraction.field_confidence) == {
        "kwh",
        "billing_period",
        "billed_amount",
        "utility",
    }
    assert all(0 <= v <= 100 for v in result.extraction.field_confidence.values())


def test_extraction_serialises_dates_as_iso_strings():
    payload = _parse(BESCOM_CLEAN).extraction.as_dict()
    assert payload["billing_period_start"] == "2026-08-01"
    assert payload["billing_period_end"] == "2026-08-31"


# --------------------------------------------------------------------- preprocessing


def _png_bytes(width: int = 3000, height: int = 1800) -> bytes:
    import io

    from PIL import Image

    image = Image.new("RGB", (width, height), "white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_preprocess_image_normalises_and_shrinks():
    import io

    from PIL import Image

    result = ocr.preprocess_image(_png_bytes())
    with Image.open(io.BytesIO(result)) as image:
        assert image.format == "JPEG"
        assert max(image.size) <= ocr.MAX_IMAGE_EDGE
    assert len(result) < len(_png_bytes())


def test_preprocess_image_rejects_a_non_image():
    with pytest.raises(ocr.OcrError) as excinfo:
        ocr.preprocess_image(b"this is definitely not a photo")
    assert excinfo.value.code == "invalid_image"
