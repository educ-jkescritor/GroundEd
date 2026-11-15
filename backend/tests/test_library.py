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


def test_search_is_safe_with_empty_or_fts_syntax_queries():
    assert library.search("") == [] and library.search('"*)(:^') == []
    # FTS5 operators/quotes in user text must not break the query; real words in it still match.
    assert all(h.doc_id for h in library.search('mysql" NEAR(* OR "removed'))


# ---------- endoflife.date snapshot ----------

def test_eol_reads_committed_snapshot_without_network(monkeypatch):
    from app import eol

    def no_network(product):
        raise AssertionError("network must not be used in snapshot mode")

    monkeypatch.setattr(eol, "_fetch", no_network)
    php = eol.get_product("php")
    assert php.origin == "snapshot" and eol.find_release(php, "7.0").release_date == "2015-12-03"
    win = eol.get_product("windows")
    assert eol.find_release(win, "7").eol_from == "2020-01-14"
    assert eol.latest_label(win) == "11"  # no edition suffix like "26H2 (E)"


def test_eol_live_mode_falls_back_to_snapshot_when_api_is_down(monkeypatch, tmp_path):
    from app import eol

    def down(product):
        raise eol.EolError(f"endoflife.date unreachable for '{product}': ConnectError")

    monkeypatch.setattr(eol, "EOL_SOURCE", "live")
    monkeypatch.setattr(eol, "CACHE_DIR", tmp_path)
    monkeypatch.setattr(eol, "_fetch", down)
    assert eol.get_product("internet-explorer").origin == "snapshot"
    with pytest.raises(eol.EolError, match="unreachable"):
        eol.get_product("no-such-product")


def test_registry_products_are_all_snapshotted():
    from app import eol, registry
    for product in registry.eol_products():
        assert (eol.SNAPSHOT_DIR / f"{product}.json").exists(), f"run 'library build' to snapshot {product}"


# ---------- passages attached to findings ----------

def test_findings_carry_verified_fact_and_replacement_passages():
    from datetime import date
    from app import config
    from app.pipeline import analyze
    a = analyze(config.SAMPLES_DIR / "legacy-php-lab.pdf", "legacy.pdf", today=date(2026, 11, 14), use_cache=False)
    f = {x.id: x for x in a.findings}
    mysql = {p.role: p for p in f["php-ext-mysql"].passages}
    assert mysql["fact"].contains_fact_quote and mysql["fact"].doc_id == "php-migration70-incompatible"
    assert mysql["replacement"].doc_id == "php-mysqlinfo-api-choosing"
    assert f["windows-7"].passages is None  # lifecycle data, no library document: nothing unrelated is attached
    assert a.provenance.library_version == library.version()


def test_passages_only_come_from_documents_the_registry_names():
    ps = library.passages_for("anything", "php-tags", "no such sentence in this doc", None, None)
    assert all(p.doc_id == "php-tags" and not p.contains_fact_quote for p in ps)
    assert library.passages_for("x", None, None, "https://example.com/not-in-library", "y") == []


# ---------- curated "what to use instead" passages ----------

def test_every_passage_hint_exists_in_its_upgrade_document():
    """A curated phrase that no longer appears (page changed) must fail loudly, not attach nothing silently."""
    from app import registry
    for e in registry.load().entries:
        if e.upgrade and e.upgrade.passage_hint:
            doc = library.by_url(e.upgrade.source_url)
            assert doc, f"{e.id}: upgrade page not in the library"
            assert any(e.upgrade.passage_hint.lower() in p.text.lower() for p in doc.passages), \
                f"{e.id}: hint {e.upgrade.passage_hint!r} not found in {doc.id}"


def test_hint_selects_the_replacement_passage_on_the_same_page():
    from app import registry
    e = next(x for x in registry.load().entries if x.id == "html-center")
    ps = library.passages_for(e.technology, e.fact.doc, e.fact.quote, e.upgrade.source_url, e.upgrade.target,
                              e.upgrade.passage_hint)
    roles = {p.role: p for p in ps}
    assert "text-align: center" in roles["replacement"].text and roles["replacement"].text != roles["fact"].text


def test_same_page_without_hint_attaches_no_replacement():
    """Unguided matching on the fact's own page too often picks an unrelated section: attach nothing."""
    from app import registry
    e = next(x for x in registry.load().entries if x.id == "php-each")  # upgrade page == fact page, no hint
    ps = library.passages_for(e.technology, e.fact.doc, e.fact.quote, e.upgrade.source_url, e.upgrade.target, None)
    assert [p.role for p in ps] == ["fact"]
