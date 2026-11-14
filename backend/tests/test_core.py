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

def test_every_registry_quote_is_found_in_its_library_document():
    """No source, no claim: each fact's quote must appear verbatim in the saved document."""
    from app import library
    reg = registry.load()
    assert reg.entries
    for e in reg.entries:
        if e.fact:
            assert library.load_document(e.fact.doc), f"{e.id}: unknown library doc {e.fact.doc}"
            assert library.contains_quote(e.fact.doc, e.fact.quote), f"{e.id}: quote not in {e.fact.doc}"


def test_removed_facts_must_name_the_release_that_removed_them():
    with pytest.raises(ValueError, match="removed_in"):
        registry.StaticFact(stage="eol", product="php", doc="d", quote="q")


def test_registry_rejects_entry_with_both_fact_and_eol():
    with pytest.raises(ValueError):
        registry.Entry(id="x", technology="x", patterns=["x"],
                       fact={"stage": "deprecated", "product": "p", "doc": "d", "quote": "q"},
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
    assert _ids(["Windows 8.1"]) == {"windows-8-1"}  # 8.1 is its own release, never reported as Windows 8
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


def test_option_c_ranks_by_impact_not_age():
    """Stress-test finding: removed code taught on many pages must outrank an old tool that is only listed."""
    from app.score import compute
    code_heavy = compute("2015-12-03", False, "code", 9, False, TODAY)
    listed_once = compute("2020-01-14", False, "listed", 1, False, TODAY)
    assert code_heavy.total == 40 + 30 + 20 + 0 == 90 and code_heavy.priority == "high"
    assert listed_once.total == 40 + 5 + 4 + 0 == 49 and listed_once.priority == "low"


def test_option_c_parts_sum_and_are_deterministic():
    from app.score import compute
    s = compute("2015-12-03", False, "explained", 2, True, TODAY)
    assert {p.key: p.points for p in s.breakdown} == {"lifecycle": 40, "teaching": 15, "frequency": 8, "hands_on": 10}
    assert s.total == sum(p.points for p in s.breakdown) == 73 and s.priority == "medium"
    assert s == compute("2015-12-03", False, "explained", 2, True, TODAY)


def test_ended_without_published_date_counts_as_eol():
    from app.score import compute
    s = compute(None, False, "code", 1, False, TODAY, ended=True)
    assert s.breakdown[0].points == 40 and "no end date published" in s.breakdown[0].reason
    assert status_for(None, False, TODAY, ended=True) == "eol"


def test_supported_items_are_not_scored():
    from app.score import compute
    assert compute("2031-01-01", False, "code", 10, True, TODAY) is None
    assert compute(None, False, "code", 10, True, TODAY) is None


def test_deprecated_and_ending_soon():
    from app.score import compute
    assert compute(None, True, "code", 1, False, TODAY).total == 25 + 30 + 4
    assert compute("2027-06-01", False, "code", 1, False, TODAY).breakdown[0].points == 20


def test_teaching_signals():
    from app.signals import is_hands_on, teaching_depth
    assert teaching_depth(['$q = mysql_query("SELECT 1");']) == "code"
    assert teaching_depth(["mysql> CREATE TABLE t(id int(5));"]) == "code"
    assert teaching_depth(["mysql_result() retrieves the contents of one cell from a MySQL result set"]) == "explained"
    assert teaching_depth(["Windows 7 / Windows 8"]) == "listed"
    assert is_hands_on("Laboratory Exercise 3: connect to MySQL")
    assert not is_hands_on("Assignment Operator: $a = 5;")  # 'assignment' operator is not an activity


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


# ---------- drafts (Gemini mocked: tests never spend credits) ----------

def test_draft_is_cached_and_labelled(client, monkeypatch):
    from app import llm
    calls = []

    def fake(technology, snippets, fact, hint):
        calls.append(technology)
        assert snippets and "removed" in fact  # only verified evidence is sent
        return "Use PDO.", "fake-model"

    monkeypatch.setattr(llm, "draft_section", fake)
    a = client.post("/api/analyze", data={"sample_id": "legacy-php-lab"}).json()
    url = f"/api/analysis/{a['id']}/findings/php-ext-mysql/draft"
    d1, d2 = client.post(url).json(), client.post(url).json()
    assert d1 == d2 and d1["label"] == "ai_suggestion" and d1["model"] == "fake-model"
    assert len(calls) == 1  # second click served from cache


def test_draft_errors_are_specific(client, monkeypatch):
    from app import llm

    def busy(*_):
        raise llm.LlmError(503, "m1: HTTP 503 UNAVAILABLE busy | m2: HTTP 503 UNAVAILABLE busy")

    monkeypatch.setattr(llm, "draft_section", busy)
    a = client.post("/api/analyze", data={"sample_id": "legacy-php-lab"}).json()
    r = client.post(f"/api/analysis/{a['id']}/findings/windows-7/draft")
    assert r.status_code == 503 and "m1" in r.json()["detail"] and "m2" in r.json()["detail"]
    assert client.post(f"/api/analysis/{a['id']}/findings/nope/draft").status_code == 404


# ---------- audit fixes ----------

def test_asp_tags_not_flagged_in_ejs_or_jsp():
    """Fix 2: `<% %>` is current syntax in EJS (Node.js) and JSP (Java); only outdated in PHP."""
    assert _ids(["<% if (user) { %> Hello <%= user.name %> <% } %>"]) == set()
    assert _ids(['<%@ page language="java" %>']) == set()
    assert "php-asp-script-tags" in _ids(["PHP tags: <?php ... ?> or <% ... %> (asp style tag)"])


def test_draft_cache_key_changes_when_fact_changes(client, monkeypatch):
    """Fix 3: a corrected registry fact must produce a fresh draft, not the cached old one."""
    from app import db, llm
    calls = []
    monkeypatch.setattr(llm, "draft_section", lambda t, s, fact, h: (calls.append(fact) or f"draft for {fact}", "fake"))
    a = client.post("/api/analyze", data={"sample_id": "legacy-php-lab"}).json()
    url = f"/api/analysis/{a['id']}/findings/php-ext-mysql/draft"
    client.post(url)
    stored = db.get_analysis(a["id"])
    f = next(x for x in stored.findings if x.id == "php-ext-mysql")
    f.lifecycle.source_quote = "Corrected fact."
    db.save_analysis(stored)
    assert client.post(url).json()["text"] == "draft for Corrected fact."
    assert len(calls) == 2


def test_old_reports_are_purged(client):
    """Fix 6: reports contain module quotes, so they are deleted after the retention period."""
    from app import cache, db
    a = client.post("/api/analyze", data={"sample_id": "legacy-php-lab"}).json()
    assert cache.purge_expired(hours=0) >= 1
    assert db.get_analysis(a["id"]) is None
    assert client.get(f"/api/analysis/{a['id']}").status_code == 404


def test_removal_date_comes_from_the_lifecycle_snapshot_not_the_registry(tmp_path):
    from app.pipeline import analyze
    a = analyze(config.SAMPLES_DIR / "legacy-php-lab.pdf", "legacy.pdf", today=TODAY, use_cache=False)
    f = next(x for x in a.findings if x.id == "php-ext-mysql")
    assert f.lifecycle.eol_date == "2015-12-03"  # PHP 7.0 release date, from library/snapshot/eol/php.json
    assert f.lifecycle.source_url == "https://www.php.net/manual/en/migration70.incompatible.php"
    assert "php" in a.provenance.eol_data


def test_tampered_quote_makes_the_finding_unverified(monkeypatch):
    from app import registry as reg_mod
    from app.pipeline import analyze
    real = reg_mod.load()
    bad = real.model_copy(deep=True)
    next(e for e in bad.entries if e.id == "php-ext-mysql").fact.quote = "mysql_* functions are fine to use."
    monkeypatch.setattr(reg_mod, "get", lambda: bad)
    a = analyze(config.SAMPLES_DIR / "legacy-php-lab.pdf", "legacy.pdf", today=TODAY, use_cache=False)
    f = next(x for x in a.findings if x.id == "php-ext-mysql")
    assert f.status == "unverified" and f.score is None and f.lifecycle is None


# ---------- hardening ----------

def test_too_many_pages_is_rejected_with_a_clear_message(tmp_path, monkeypatch):
    from app import pdf as pdf_mod
    monkeypatch.setattr(pdf_mod, "MAX_PAGES", 3)
    p = tmp_path / "long.pdf"
    doc = pymupdf.open()
    for _ in range(4):
        doc.new_page().insert_text((72, 72), "some text on this page " * 3)
    doc.save(p)
    with pytest.raises(PdfError, match="4 pages; the limit is 3"):
        extract_pages(p)


def test_slow_analysis_times_out_with_504(client, monkeypatch):
    import time as _time
    from app import main as main_mod
    monkeypatch.setattr(config, "ANALYSIS_TIMEOUT_SECONDS", 1)
    monkeypatch.setattr(main_mod, "run_pipeline", lambda *a, **k: _time.sleep(3))
    r = client.post("/api/analyze", data={"sample_id": "legacy-php-lab"})
    assert r.status_code == 504 and "longer than 1 seconds" in r.json()["detail"]


def test_upload_is_judged_by_content_not_label(client):
    pdf_bytes = (config.SAMPLES_DIR / "modern-php-lab.pdf").read_bytes()
    r = client.post("/api/analyze", files={"file": ("lab", pdf_bytes, "application/octet-stream")})
    assert r.status_code == 200
    r = client.post("/api/analyze", files={"file": ("x.pdf", b"MZ\x90 not a pdf", "application/octet-stream")})
    assert r.status_code == 415


def test_health_reports_versions(client):
    v = client.get("/api/health").json()["versions"]
    assert set(v) == {"pipeline", "registry", "library", "rules"} and all(v.values())
