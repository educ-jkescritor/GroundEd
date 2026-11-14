"""Core tests: registry validity, detection, scoring rules, PDF errors, and the API on public samples."""
from datetime import date
from pathlib import Path

import pymupdf
import pytest
from fastapi.testclient import TestClient

from app import config, registry
from app.detect import detect_registry, normalise
from app.pdf import Page, PdfError, extract_pages
from app.score import compute, status_for

TODAY = date(2026, 11, 14)


# ---------- registry ----------

def test_registry_loads_and_every_static_fact_has_a_quote():
    reg = registry.load()
    assert reg.entries
    for e in reg.entries:
        if e.fact:
            assert e.fact.source_url.startswith("https://") and len(e.fact.source_quote) > 20


def test_registry_rejects_entry_with_both_fact_and_eol():
    with pytest.raises(ValueError):
        registry.Entry(id="x", technology="x", patterns=["x"],
                       fact={"stage": "eol", "product": "p", "source_name": "s", "source_url": "u", "source_quote": "q"},
                       eol={"product": "p", "cycle": "1"})


# ---------- detection ----------

def _pages(*texts: str) -> list[Page]:
    return [Page(number=i + 1, text=t, raw_text=t) for i, t in enumerate(texts)]


def _ids(texts) -> set[str]:
    return {m.entry_id for m in detect_registry(_pages(*texts), registry.load().entries)}


def test_mysql_functions_detected_but_not_mysqli_or_pdo():
    assert "php-ext-mysql" in _ids(["$q = mysql_query(“SELECT 1”);"])
    assert "php-ext-mysql" not in _ids(["$q = mysqli_query($c, 'SELECT 1');", "$pdo = new PDO($dsn);"])


def test_windows_versions_are_not_confused():
    assert _ids(["Windows 11 or Linux"]) == set()
    assert _ids(["Windows 8.1"]) == set()
    assert {"windows-7", "windows-8"} <= _ids(["Windows 7 / Windows 8"])


def test_one_mention_per_page_and_snippet_is_on_page():
    ms = detect_registry(_pages("mysql_query(a); mysql_query(b);", "nothing", "mysql_result(x)"), registry.load().entries)
    mysql = [m for m in ms if m.entry_id == "php-ext-mysql"]
    assert [m.page for m in mysql] == [1, 3]


def test_normalise_handles_curly_quotes_and_whitespace():
    assert normalise("mysql_query(“SELECT\n  1”)") == normalise('mysql_query("SELECT 1")')


# ---------- scoring ----------

def test_status_rules():
    assert status_for("2015-12-03", False, TODAY) == "eol"
    assert status_for(None, True, TODAY) == "nearing_eol"
    assert status_for("2027-06-01", False, TODAY) == "nearing_eol"
    assert status_for("2030-01-01", False, TODAY) == "supported"
    assert status_for(None, False, TODAY) == "supported"


def test_score_is_deterministic_and_capped():
    s = compute("2015-12-03", False, None, 9, TODAY)
    parts = {p.key: p.points for p in s.breakdown}
    assert parts == {"lifecycle_status": 50, "time_past_eol": 20, "version_lag": 0, "prominence": 15}
    assert s.total == 85 and s == compute("2015-12-03", False, None, 9, TODAY)


def test_deprecated_score():
    s = compute(None, True, None, 1, TODAY)
    assert s.total == config.DEPRECATED_LIFECYCLE_POINTS + config.PROMINENCE_POINTS_PER_PAGE


# ---------- PDF ----------

def test_image_only_pdf_gives_clear_error(tmp_path: Path):
    p = tmp_path / "scan.pdf"
    doc = pymupdf.open()
    doc.new_page()
    doc.save(p)
    with pytest.raises(PdfError, match="scanned"):
        extract_pages(p)


def test_not_a_pdf_gives_clear_error(tmp_path: Path):
    p = tmp_path / "x.pdf"
    p.write_text("hello")
    with pytest.raises(PdfError):
        extract_pages(p)


# ---------- API (public samples only; endoflife.date lookups may hit the network or cache) ----------

@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DB_PATH", tmp_path / "test.db")
    from app.main import app
    with TestClient(app) as c:
        yield c


def test_samples_and_analyze_sample(client):
    ids = [s["id"] for s in client.get("/api/samples").json()]
    assert "legacy-php-lab" in ids
    a = client.post("/api/analyze", data={"sample_id": "modern-php-lab"}).json()
    assert a["findings"] == [] and a["provenance"]["detector"] == "registry"
    a = client.post("/api/analyze", data={"sample_id": "legacy-php-lab"}).json()
    ids = {f["id"] for f in a["findings"]}
    assert {"php-ext-mysql", "php-asp-script-tags", "php-ext-ereg", "mysql-int-display-width"} <= ids
    for f in a["findings"]:
        if f["score"]:
            assert f["lifecycle"]["source_url"] and f["citations"]
    assert client.get(f"/api/analysis/{a['id']}").json()["id"] == a["id"]


def test_upload_validation(client):
    r = client.post("/api/analyze", files={"file": ("a.txt", b"hello", "text/plain")})
    assert r.status_code == 415
    r = client.post("/api/analyze", files={"file": ("a.pdf", b"not a pdf", "application/pdf")})
    assert r.status_code == 415
    r = client.post("/api/analyze", data={"sample_id": "nope"})
    assert r.status_code == 404
