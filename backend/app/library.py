"""Source library: trusted documents saved as dated, versioned snapshots (backend/library/).

build():  sources.yaml -> fetch -> keep main text -> split by heading into passages -> snapshot/<id>.json
          Failures are flagged with the reason (failed / needs_manual) and never guessed.
The snapshot is committed to git: everyone (and the demo) uses the same library, offline. Its hash is the
library version recorded in every report's provenance.
"""
from __future__ import annotations

import hashlib
import json
import re
import time
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

import httpx
import yaml
from pydantic import BaseModel

from .config import BASE_DIR

LIBRARY_DIR = BASE_DIR / "library"
SOURCES_FILE = LIBRARY_DIR / "sources.yaml"
SNAPSHOT_DIR = LIBRARY_DIR / "snapshot"
INDEX_FILE = SNAPSHOT_DIR / "_index.json"
USER_AGENT = "GroundEd-library-builder/0.1 (curriculum review research)"
PASSAGE_MAX_WORDS = 220
DROP_TAGS = ["script", "style", "nav", "footer", "aside", "form", "button", "svg", "noscript"]
# Parts of official pages that are NOT official content (e.g. php.net "User Contributed Notes" are public comments).
DROP_SELECTORS = ["#usernotes", ".contributors", ".edit-bug"]
BLOCK_TAGS = ["h1", "h2", "h3", "h4", "p", "li", "pre", "dt", "dd", "td", "th", "blockquote", "caption"]


class Source(BaseModel):
    id: str
    title: str
    url: str
    publisher: str
    tier: int
    license: str
    store: Literal["full", "excerpt"]
    selector: str
    tags: list[str] = []
    excerpt_terms: list[str] = []


class Passage(BaseModel):
    n: int
    heading: str
    text: str


class Document(BaseModel):
    id: str
    title: str
    url: str
    publisher: str
    tier: int
    license: str
    store: str
    tags: list[str]
    fetched_at: str
    content_sha256: str
    passages: list[Passage]


class SourceStatus(BaseModel):
    id: str
    status: Literal["ok", "failed", "needs_manual"]
    reason: str = ""
    tried_at: str
    passages: int = 0


def load_sources(path: Path = SOURCES_FILE) -> list[Source]:
    sources = [Source.model_validate(s) for s in yaml.safe_load(path.read_text())]
    ids = [s.id for s in sources]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate source ids in sources.yaml")
    return sources


# ---------------------------------------------------------------- fetch + extract

class FetchError(RuntimeError):
    def __init__(self, status: str, reason: str):
        super().__init__(reason)
        self.status = status  # "failed" or "needs_manual"


def fetch(url: str, attempts: int = 3) -> str:
    last = ""
    for i in range(attempts):
        try:
            r = httpx.get(url, headers={"User-Agent": USER_AGENT}, follow_redirects=True, timeout=20)
        except httpx.HTTPError as e:
            last = f"network error: {e.__class__.__name__}"
            time.sleep(2 * (i + 1))
            continue
        if r.status_code == 200:
            return r.text
        if r.status_code in (401, 403):
            raise FetchError("needs_manual", f"HTTP {r.status_code}: access denied (login or bot protection)")
        if r.status_code == 404:
            raise FetchError("failed", "HTTP 404: page not found (moved or removed)")
        last = f"HTTP {r.status_code}"
        time.sleep(2 * (i + 1))
    raise FetchError("failed", f"{last} after {attempts} attempts")


_SPACE_BEFORE_PUNCT = re.compile(r"\s+([.,;:!?)\]])")


def _clean(text: str) -> str:
    """Collapse whitespace; drop the space HTML inline elements leave before punctuation ("API ." -> "API.")."""
    return _SPACE_BEFORE_PUNCT.sub(r"\1", " ".join(text.split()))


def extract_passages(html: str, selector: str) -> tuple[str, list[Passage]]:
    """Main content -> passages split at headings, each at most PASSAGE_MAX_WORDS words."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    root = soup.select_one(selector)
    if root is None:
        raise FetchError("needs_manual", f"main content not found with selector '{selector}' (page layout changed or "
                                         "content is rendered by JavaScript)")
    for tag in root.find_all(DROP_TAGS):
        tag.decompose()
    for sel in DROP_SELECTORS:
        for tag in root.select(sel):
            tag.decompose()
    title = _clean(soup.title.get_text()) if soup.title else ""

    passages: list[Passage] = []
    heading, buf = title, []

    def flush() -> None:
        words = " ".join(buf).split()
        for i in range(0, len(words), PASSAGE_MAX_WORDS):
            chunk = " ".join(words[i:i + PASSAGE_MAX_WORDS])
            if chunk:
                passages.append(Passage(n=len(passages), heading=heading, text=chunk))
        buf.clear()

    for el in root.find_all(BLOCK_TAGS):
        if el.find(BLOCK_TAGS):  # container of other blocks: its children are visited separately
            continue
        text = _clean(el.get_text(" "))
        if not text:
            continue
        if el.name in ("h1", "h2", "h3", "h4"):
            flush()
            heading = text
        else:
            buf.append(text)
    flush()
    return title, passages


def _excerpt(passages: list[Passage], terms: list[str]) -> list[Passage]:
    rx = re.compile("|".join(re.escape(t) for t in terms), re.IGNORECASE)
    kept = [p for p in passages if rx.search(p.text)]
    return [Passage(n=i, heading=p.heading, text=p.text) for i, p in enumerate(kept)]


# ---------------------------------------------------------------- build + load

def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def build(sources: Optional[list[Source]] = None, only: Optional[set[str]] = None) -> list[SourceStatus]:
    """Fetch every source and write snapshot/<id>.json. A source that fails keeps its previous snapshot."""
    sources = sources or load_sources()
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    statuses: list[SourceStatus] = []
    for s in sources:
        if only and s.id not in only:
            continue
        try:
            _, passages = extract_passages(fetch(s.url), s.selector)
            if s.store == "excerpt":
                passages = _excerpt(passages, s.excerpt_terms)
            if not passages:
                raise FetchError("needs_manual", "no text passages extracted (empty page or wrong selector)")
            body = "\n".join(p.text for p in passages)
            doc = Document(id=s.id, title=s.title, url=s.url, publisher=s.publisher, tier=s.tier, license=s.license,
                           store=s.store, tags=s.tags, fetched_at=_now(),
                           content_sha256=hashlib.sha256(body.encode()).hexdigest(), passages=passages)
            old = load_document(s.id)
            if old and old.content_sha256 == doc.content_sha256:
                doc.fetched_at = old.fetched_at  # unchanged content: keep the snapshot byte-identical
            (SNAPSHOT_DIR / f"{s.id}.json").write_text(doc.model_dump_json(indent=1) + "\n")
            statuses.append(SourceStatus(id=s.id, status="ok", tried_at=_now(), passages=len(passages),
                                         reason="" if not old or old.content_sha256 == doc.content_sha256
                                         else "content changed since last snapshot: review registry entries using it"))
        except FetchError as e:
            statuses.append(SourceStatus(id=s.id, status=e.status, reason=str(e), tried_at=_now()))
        time.sleep(1)  # be polite to documentation sites
    _write_index(statuses)
    load_documents.cache_clear()
    _index.cache_clear()
    return statuses


def _write_index(new: list[SourceStatus]) -> None:
    index = {}
    if INDEX_FILE.exists():
        index = {s["id"]: s for s in json.loads(INDEX_FILE.read_text())["sources"]}
    for s in new:
        index[s.id] = s.model_dump()
    INDEX_FILE.write_text(json.dumps({"sources": sorted(index.values(), key=lambda x: x["id"])}, indent=1) + "\n")


def status() -> list[SourceStatus]:
    """Status of every source in sources.yaml (never built => needs a build)."""
    seen = {}
    if INDEX_FILE.exists():
        seen = {s["id"]: SourceStatus.model_validate(s) for s in json.loads(INDEX_FILE.read_text())["sources"]}
    return [seen.get(s.id) or SourceStatus(id=s.id, status="failed", reason="never built", tried_at="")
            for s in load_sources()]


def load_document(doc_id: str) -> Optional[Document]:
    p = SNAPSHOT_DIR / f"{doc_id}.json"
    return Document.model_validate_json(p.read_text()) if p.exists() else None


@lru_cache(maxsize=1)
def load_documents() -> tuple[Document, ...]:
    return tuple(Document.model_validate_json(p.read_text()) for p in sorted(SNAPSHOT_DIR.glob("*.json"))
                 if not p.name.startswith("_"))


def version() -> str:
    """Hash of every document's content: changes whenever the library content changes."""
    h = hashlib.sha256()
    for d in load_documents():
        h.update(f"{d.id}:{d.content_sha256}\n".encode())
    for p in sorted((SNAPSHOT_DIR / "eol").glob("*.json")):  # lifecycle data is part of the library too
        h.update(p.name.encode() + b":" + hashlib.sha256(p.read_bytes()).digest())
    return h.hexdigest()[:12]


def contains_quote(doc_id: str, quote: str) -> bool:
    """True if the quote appears in the saved document text (whitespace, quote marks and case normalised)."""
    from .detect import normalise

    doc = next((d for d in load_documents() if d.id == doc_id), None)
    return bool(doc) and normalise(quote) in normalise(" ".join(p.text for p in doc.passages))


def by_url(url: str) -> Optional[Document]:
    norm = lambda u: u.rstrip("/").lower()
    return next((d for d in load_documents() if norm(d.url) == norm(url)), None)


# ---------------------------------------------------------------- search (keyword, BM25)

class Hit(BaseModel):
    doc_id: str
    title: str
    url: str
    publisher: str
    tier: int
    license: str
    fetched_at: str
    heading: str
    text: str
    n: int
    rank: float  # BM25 from SQLite FTS5: lower is more relevant


_TOKEN = re.compile(r"[A-Za-z0-9_]{2,}")


@lru_cache(maxsize=1)
def _index():
    """In-memory SQLite FTS5 index over every snapshot passage. Built once per process (~90 passages: instant)."""
    import sqlite3

    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.execute("CREATE VIRTUAL TABLE passages USING fts5(doc_id UNINDEXED, n UNINDEXED, heading, text, "
                 "tokenize='porter unicode61')")
    conn.executemany("INSERT INTO passages (doc_id, n, heading, text) VALUES (?, ?, ?, ?)",
                     [(d.id, p.n, p.heading, p.text) for d in load_documents() for p in d.passages])
    return conn


def search(query: str, doc_ids: Optional[list[str]] = None, k: int = 3) -> list[Hit]:
    """Keyword search over the library. Any query word may match (OR); BM25 ranks passages with more and rarer
    matching words higher. `doc_ids` restricts the search to those documents."""
    terms = sorted({t.lower() for t in _TOKEN.findall(query)})
    if not terms:
        return []
    match = " OR ".join(f'"{t}"' for t in terms)
    sql = "SELECT doc_id, n, heading, text, bm25(passages) AS r FROM passages WHERE passages MATCH ?"
    args: list = [match]
    if doc_ids:
        sql += f" AND doc_id IN ({','.join('?' * len(doc_ids))})"
        args += list(doc_ids)
    sql += " ORDER BY r, doc_id, n LIMIT ?"  # ties broken deterministically
    rows = _index().execute(sql, args + [k]).fetchall()
    docs = {d.id: d for d in load_documents()}
    return [Hit(doc_id=did, title=docs[did].title, url=docs[did].url, publisher=docs[did].publisher,
                tier=docs[did].tier, license=docs[did].license, fetched_at=docs[did].fetched_at,
                heading=h, text=t, n=int(n), rank=round(r, 4)) for did, n, h, t, r in rows]
