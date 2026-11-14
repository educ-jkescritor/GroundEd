"""Source library tests. Offline: HTML is inline, fetch is mocked."""
import pytest

from app import library

PAGE = """<html><head><title>Backward incompatible changes</title></head><body>
<nav>Menu Home Downloads</nav>
<div id="layout-content">
  <h2>Removed functions</h2>
  <h3>All ext/mysql functions</h3>
  <p>All ext/mysql functions were removed. See <a href="#">Choosing a MySQL API</a>.</p>
  <h3>All ereg* functions</h3>
  <p>All ereg functions were removed. PCRE is a recommended alternative.</p>
  <div class="note"><p>Note: this official note stays.</p></div>
  <section id="usernotes"><h3>User Contributed Notes</h3><p>random comment from the public</p></section>
</div><footer>Copyright</footer></body></html>"""


def test_extract_splits_by_heading_and_keeps_only_official_text():
    title, passages = library.extract_passages(PAGE, "#layout-content")
    assert title == "Backward incompatible changes"
    by_heading = {p.heading: p.text for p in passages}
    assert by_heading["All ext/mysql functions"] == "All ext/mysql functions were removed. See Choosing a MySQL API."
    assert "official note stays" in by_heading["All ereg* functions"]
    text = " ".join(p.text for p in passages)
    assert "random comment" not in text and "Menu" not in text and "Copyright" not in text


def test_missing_selector_is_flagged_not_guessed():
    with pytest.raises(library.FetchError) as e:
        library.extract_passages(PAGE, "#does-not-exist")
    assert e.value.status == "needs_manual" and "selector" in str(e.value)


def test_long_sections_are_split_into_bounded_passages():
    html = "<main><h2>Long</h2><p>" + "word " * (library.PASSAGE_MAX_WORDS * 2 + 5) + "</p></main>"
    _, passages = library.extract_passages(html, "main")
    assert len(passages) == 3 and all(len(p.text.split()) <= library.PASSAGE_MAX_WORDS for p in passages)


def test_build_flags_failures_and_writes_excerpt_only_for_restricted_sources(tmp_path, monkeypatch):
    monkeypatch.setattr(library, "SNAPSHOT_DIR", tmp_path)
    monkeypatch.setattr(library, "INDEX_FILE", tmp_path / "_index.json")
    monkeypatch.setattr(library.time, "sleep", lambda s: None)
    library.load_documents.cache_clear()

    def fake_fetch(url, attempts=3):
        if "missing" in url:
            raise library.FetchError("failed", "HTTP 404: page not found (moved or removed)")
        return PAGE

    monkeypatch.setattr(library, "fetch", fake_fetch)
    common = dict(publisher="p", tier=2, selector="#layout-content", title="t")
    sources = [
        library.Source(id="full-doc", url="https://x/ok", license="CC-BY-3.0", store="full", **common),
        library.Source(id="restricted", url="https://x/ok2", license="all-rights-reserved", store="excerpt",
                       excerpt_terms=["ereg"], **common),
        library.Source(id="gone", url="https://x/missing", license="CC-BY-3.0", store="full", **common),
    ]
    st = {s.id: s for s in library.build(sources)}
    assert st["full-doc"].status == "ok" and st["gone"].status == "failed" and "404" in st["gone"].reason
    restricted = library.load_document("restricted")
    assert restricted and all("ereg" in p.text.lower() for p in restricted.passages)
    assert not (tmp_path / "gone.json").exists()
    library.load_documents.cache_clear()


def test_committed_snapshot_is_valid_and_versioned():
    docs = library.load_documents()
    assert len(docs) >= 10 and len(library.version()) == 12
    for d in docs:
        assert d.passages and d.url.startswith("https://")
        assert "user contributed notes" not in " ".join(p.text for p in d.passages).lower()


# ---------- search (runs on the committed snapshot; offline) ----------

@pytest.mark.parametrize("query, expected_doc", [
    ("mysql extension removed", "php-migration70-removed-exts"),
    ("replacement for ereg regular expressions", "php-pcre"),
    ("integer display width deprecated", "mysql-numeric-type-attributes"),
    ("center element deprecated alternative", "mdn-center"),
])
def test_search_finds_the_right_document(query, expected_doc):
    assert library.search(query, k=3)[0].doc_id == expected_doc


def test_search_can_be_restricted_to_documents_and_is_deterministic():
    hits = library.search("mysql functions removed", doc_ids=["php-migration70-incompatible"], k=5)
    assert hits and {h.doc_id for h in hits} == {"php-migration70-incompatible"}
    assert hits == library.search("mysql functions removed", doc_ids=["php-migration70-incompatible"], k=5)


def test_search_ignores_empty_or_symbol_only_queries():
    assert library.search("") == [] and library.search('"*) OR (') == []
