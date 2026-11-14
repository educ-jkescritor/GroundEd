"""PDF -> per-page text with word positions (PyMuPDF). Page numbers are 1-based for citations.

Repeated header/footer lines (same text on many pages, e.g. course title or "Page 3 of 20") are removed from
`Page.text` so they do not inflate prominence counts. `Page.raw_text` keeps the original for bbox lookup.
"""
from __future__ import annotations

import hashlib
import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf


class PdfError(ValueError):
    """A PDF that cannot be analysed; the message is shown to the user as-is."""


@dataclass
class Page:
    number: int  # 1-based
    text: str  # cleaned text (repeated headers/footers removed)
    raw_text: str = ""
    words: list[tuple[float, float, float, float, str]] = field(default_factory=list)  # x0, y0, x1, y1, word


MIN_CHARS_PER_PAGE = 20  # below this on average, treat the PDF as scanned/image-only
_DIGITS = re.compile(r"\d+")


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _line_key(line: str) -> str:
    """Normalise a line for header/footer detection: digits ignored so 'Page 3' == 'Page 4'."""
    return _DIGITS.sub("#", " ".join(line.split()).lower())


def _strip_repeated_lines(texts: list[str]) -> list[str]:
    """Drop lines that appear on at least half of the pages (min 3 pages) — headers, footers, page numbers."""
    if len(texts) < 3:
        return texts
    counts: Counter[str] = Counter()
    for t in texts:
        counts.update({_line_key(l) for l in t.splitlines() if l.strip()})
    threshold = max(3, len(texts) // 2)
    repeated = {k for k, n in counts.items() if n >= threshold}
    return ["\n".join(l for l in t.splitlines() if _line_key(l) not in repeated) for t in texts]


def extract_pages(path: Path) -> list[Page]:
    try:
        doc = pymupdf.open(path)
    except Exception as e:  # corrupt / not a PDF
        raise PdfError(f"Could not open the PDF: {e}") from e
    with doc:
        if doc.needs_pass:
            raise PdfError("The PDF is password-protected. Please upload an unlocked copy.")
        raw = [p.get_text() for p in doc]
        words = [[w[:5] for w in p.get_text("words")] for p in doc]
    if not raw:
        raise PdfError("The PDF has no pages.")
    if sum(len(t.strip()) for t in raw) < MIN_CHARS_PER_PAGE * len(raw):
        raise PdfError("This PDF appears to be scanned (no selectable text). Scanned PDFs are not supported yet.")
    cleaned = _strip_repeated_lines(raw)
    return [Page(number=i + 1, text=c, raw_text=r, words=w) for i, (c, r, w) in enumerate(zip(cleaned, raw, words))]


def find_snippet_bbox(pdf_path: Path, page_number: int, snippet: str) -> list[float] | None:
    """Bounding box of the snippet on the page (union of all hit rectangles), or None if not found."""
    with pymupdf.open(pdf_path) as doc:
        if not 1 <= page_number <= len(doc):
            return None
        hits = doc[page_number - 1].search_for(snippet)
    if not hits:
        return None
    return [min(r.x0 for r in hits), min(r.y0 for r in hits), max(r.x1 for r in hits), max(r.y1 for r in hits)]
