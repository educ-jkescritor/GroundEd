"""OCR of code screenshots (multimodal input). Builds PDFs whose code exists ONLY as an image."""
from datetime import date

import pymupdf
import pytest

from app import config, ocr
from app.pipeline import analyze

TODAY = date(2026, 11, 15)
CODE = ['<?php', '$query = mysql_query("SELECT * FROM tblstudent");', '$row = mysql_fetch_array($query);', '?>']

pytestmark = pytest.mark.skipif(ocr._engine()[0] is None, reason="OCR engine not installed")


def _code_png(lines, width=900):
    """Render code to a PNG, like a screenshot of an editor."""
    d = pymupdf.open()
    pg = d.new_page(width=width, height=40 + 34 * len(lines))
    for i, line in enumerate(lines):
        pg.insert_text((20, 40 + 34 * i), line, fontname="cour", fontsize=20)
    return pg.get_pixmap(dpi=96).tobytes("png")


def _pdf(tmp_path, pages, name="m.pdf"):
    """pages: list of dicts {text, image: png bytes, rect: (x0,y0,x1,y1)}"""
    p = tmp_path / name
    doc = pymupdf.open()
    for spec in pages:
        page = doc.new_page(width=960, height=540)
        page.insert_textbox(pymupdf.Rect(40, 20, 920, 75 if "image" in spec else 520), spec.get("text", "Example"),
                            fontsize=9 if len(spec.get("text", "")) > 200 else 16)
        if "image" in spec:
            page.insert_image(pymupdf.Rect(*spec.get("rect", (60, 80, 900, 500))), stream=spec["image"])
    doc.save(p)
    return p


@pytest.fixture(autouse=True)
def _tmp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DB_PATH", tmp_path / "ocr.db")
    monkeypatch.setattr(config, "OCR_ENABLED", True)


def test_finding_inside_a_code_screenshot_is_detected_marked_and_highlighted(tmp_path):
    a = analyze(_pdf(tmp_path, [{"text": "Example", "image": _code_png(CODE)}]), "m.pdf", today=TODAY)
    f = next(x for x in a.findings if x.id == "php-ext-mysql")
    c = f.citations[0]
    assert c.from_ocr is True and "mysql_query" in c.snippet
    x0, y0, x1, y1 = c.bbox
    assert 60 <= x0 < x1 <= 900 and 80 <= y0 < y1 <= 500           # highlight lies inside the screenshot
    assert f.score and f.lifecycle.source_quote                      # same grounding as text findings
    assert a.source.ocr.images_read == 1 and a.provenance.detector.startswith("registry+ocr(")


def test_ocr_results_are_remembered_by_image_fingerprint(tmp_path):
    png = _code_png(CODE)
    analyze(_pdf(tmp_path, [{"image": png}], "a.pdf"), "a.pdf", today=TODAY, use_cache=False)
    again = analyze(_pdf(tmp_path, [{"text": "Same screenshot, other file", "image": png}], "b.pdf"), "b.pdf",
                    today=TODAY, use_cache=False)
    assert again.source.ocr.images_read == 0 and again.source.ocr.images_from_cache == 1
    assert "php-ext-mysql" in {f.id for f in again.findings}


def test_noise_images_are_skipped(tmp_path):
    code = _code_png(CODE)
    logo = _code_png(["LOGO"], width=200)
    pages = [{"text": "Slide", "image": logo, "rect": (800, 10, 950, 60)} for _ in range(4)]   # repeated logo
    pages.append({"text": "Icon", "image": _code_png(["x"], width=100), "rect": (10, 10, 40, 40)})  # tiny
    pages.append({"text": " ".join(["Plenty of real text on this slide."] * 20), "image": code,
                  "rect": (60, 300, 900, 520)})                                                # text-rich page
    a = analyze(_pdf(tmp_path, pages), "m.pdf", today=TODAY, use_cache=False)
    assert a.source.ocr.images_found == 6 and a.source.ocr.images_candidates == 0 and a.source.ocr.images_read == 0
    assert "php-ext-mysql" not in {f.id for f in a.findings}


def test_budget_is_reported_not_silent(tmp_path, monkeypatch):
    original = ocr.rules()
    monkeypatch.setattr(ocr, "rules", lambda: ocr.ImageRules(**{**vars(original), "max_images": 1}))
    pages = [{"image": _code_png(CODE + [f"// page {i}"])} for i in range(3)]
    a = analyze(_pdf(tmp_path, pages), "m.pdf", today=TODAY, use_cache=False)
    assert a.source.ocr.images_read == 1 and a.source.ocr.images_over_budget == 2


def test_line_cleaning():
    assert ocr.clean_line("12") is None                     # editor line number
    assert ocr.clean_line("白<center>") == "<center>"         # fold marker misread as a symbol
    assert ocr.clean_line("$x = 1;") == "$x = 1;"


LONG = "Lecture notes on databases. " * 10


def test_analysis_works_without_the_ocr_engine(tmp_path, monkeypatch):
    from app.pdf import PdfError
    monkeypatch.setattr(ocr, "_engine", lambda: (None, "unavailable (ImportError)"))
    a = analyze(_pdf(tmp_path, [{"text": LONG, "image": _code_png(CODE), "rect": (60, 300, 900, 520)}]), "m.pdf",
                today=TODAY, use_cache=False)
    assert a.source.ocr.engine.startswith("unavailable") and a.source.ocr.images_read == 0
    with pytest.raises(PdfError, match="OCR"):   # image-only PDF: clear message instead of empty results
        analyze(_pdf(tmp_path, [{"image": _code_png(CODE)}], "img.pdf"), "img.pdf", today=TODAY, use_cache=False)


def test_ocr_can_be_switched_off(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "OCR_ENABLED", False)
    a = analyze(_pdf(tmp_path, [{"text": LONG, "image": _code_png(CODE), "rect": (60, 300, 900, 520)}]), "m.pdf",
                today=TODAY, use_cache=False)
    assert a.source.ocr is None and a.provenance.detector == "registry"
    assert "php-ext-mysql" not in {f.id for f in a.findings}


def test_ocr_text_is_purged_with_reports(tmp_path):
    from app import cache
    analyze(_pdf(tmp_path, [{"image": _code_png(CODE)}]), "m.pdf", today=TODAY)
    assert cache.purge_expired(hours=0) >= 2   # report + OCR lines (module content)
    import sqlite3
    with sqlite3.connect(config.DB_PATH) as c:
        assert c.execute("SELECT COUNT(*) FROM ocr_cache").fetchone()[0] == 0


def test_same_pdf_reads_the_same_images_whatever_is_cached(tmp_path, monkeypatch):
    """Determinism: selection by position, not time or cache. A warm cache must not change the findings."""
    original = ocr.rules()
    monkeypatch.setattr(ocr, "rules", lambda: ocr.ImageRules(**{**vars(original), "max_images": 2}))
    pages = [{"image": _code_png(["<?php", f"// helper {i}", "?>"])} for i in range(3)]
    pages.append({"image": _code_png(CODE)})       # 4 unique screenshots, limit 2: the 3rd and 4th are not read
    pdf = _pdf(tmp_path, pages)
    first = analyze(pdf, "m.pdf", today=TODAY, use_cache=False)
    # warm the cache with the 4th image through another file, then analyse the same PDF again
    analyze(_pdf(tmp_path, [{"image": _code_png(CODE)}], "other.pdf"), "other.pdf", today=TODAY, use_cache=False)
    second = analyze(pdf, "m.pdf", today=TODAY, use_cache=False)
    assert [f.id for f in first.findings] == [f.id for f in second.findings]
    assert "php-ext-mysql" not in {f.id for f in second.findings}  # still beyond the limit, cached or not
    assert first.source.ocr.images_over_budget == second.source.ocr.images_over_budget == 2


def test_onnx_runtime_telemetry_is_switched_off_before_the_engine_starts(monkeypatch):
    import onnxruntime
    calls = []
    monkeypatch.setattr(onnxruntime, "disable_telemetry_events", lambda: calls.append("off"))
    ocr._engine.cache_clear()
    try:
        assert ocr._engine()[0] is not None and calls == ["off"]
    finally:
        ocr._engine.cache_clear()


def test_telemetry_switch_is_set_before_onnxruntime_loads():
    import os
    assert os.environ.get("ORT_DISABLE_TELEMETRY") == "1"   # set by app.ocr at import time
    from pathlib import Path
    assert "ORT_DISABLE_TELEMETRY=1" in (Path(__file__).parents[1] / "Dockerfile").read_text()
