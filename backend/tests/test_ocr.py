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


# ---------- OCR x context rules (stress-tested 2026-11-15) ----------

def _ctx_pdf(tmp_path, pages):
    p = tmp_path / "ctx.pdf"
    doc = pymupdf.open()
    for text, img in pages:
        pg = doc.new_page(width=960, height=540)
        pg.insert_textbox(pymupdf.Rect(40, 20, 920, 75), text, fontsize=16)
        if img:
            pg.insert_image(pymupdf.Rect(60, 90, 900, 300), stream=img)
    doc.save(p)
    return p


def _claims(tmp_path, pages):
    a = analyze(_ctx_pdf(tmp_path, pages), "ctx.pdf", today=TODAY, use_cache=False)
    return {f.id: f for f in a.findings if f.status != "supported"}


def _hands_on(f):
    return next(p.points for p in f.score.breakdown if p.key == "hands_on") > 0


@pytest.mark.parametrize("prev_page, expected", [
    (("Laboratory Exercise 3", None), True),                                            # lab title as text
    (("Slide 1", "image"), True),                                                         # lab title inside an image
    (("Lab Setup: install XAMPP", None), False),                                          # only names the lab
])
def test_look_back_one_page_works_with_screenshots(tmp_path, prev_page, expected):
    text, img = prev_page
    prev = (text, _code_png(["Laboratory Exercise 3", "Connect to MySQL"]) if img else None)
    f = _claims(tmp_path, [prev, ("Example", _code_png(CODE))])["php-ext-mysql"]
    assert f.citations[0].from_ocr and _hands_on(f) is expected


def test_context_rules_for_text_and_screenshot_matches(tmp_path):
    each_img = _code_png(["while (list($k, $v) = each($arr))"])
    # text match: context only from the slide text -> an EJS slide beside a PHP screenshot is not a PHP finding
    ejs = _claims(tmp_path, [("EJS: <% if (user) { %> Hi <% } %>", _code_png(["PHP arrays:", "echo $x;"]))])
    assert "php-asp-script-tags" not in ejs
    # screenshot match: context from the screenshot itself ...
    assert "php-each" in _claims(tmp_path, [("Example", _code_png(["PHP arrays:", "while (list($k, $v) = each($arr))"]))])
    # ... or from the slide text around it (title "PHP Arrays", code image without the word PHP)
    assert "php-each" in _claims(tmp_path, [("PHP Arrays", each_img)])
    # ... but no context anywhere -> no claim (could be another language)
    assert "php-each" not in _claims(tmp_path, [("Arrays", each_img)])


def test_history_inside_a_screenshot_is_still_history(tmp_path):
    assert _claims(tmp_path, [("History", _code_png(["PHP 5 (July 13, 2004)", "Improved OOP support"]))]) == {}


def test_short_wide_and_reused_screenshots_are_read(tmp_path):
    # a 1-line snippet is not "too small"; a code screenshot reused on every page is not a "background"
    one_line = _claims(tmp_path, [("Output", _code_png(["Windows Internet Explorer"]))])
    assert "internet-explorer" in one_line
    reused = _claims(tmp_path, [(f"Example {i}", _code_png(CODE)) for i in range(3)])
    assert [c.page for c in reused["php-ext-mysql"].citations] == [1, 2, 3]


def test_one_misread_symbol_does_not_discard_the_line():
    raw = [('$r = mysql_query("SELECT', [24, 77, 414, 110], 0.95), ("￥", [428, 84, 442, 94], 0.40),
           ('FROM t");', [455, 79, 597, 104], 0.93)]
    confident = [f for f in raw if f[2] >= ocr.rules().min_confidence]
    assert [t for t, _, _ in ocr.merge_lines(confident, ocr.rules().same_line_overlap)] == \
        ['$r = mysql_query("SELECT FROM t");']
