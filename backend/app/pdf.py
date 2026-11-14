"""PDF -> per-page text with word positions (PyMuPDF). Page numbers are 1-based for citations."""
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Page:
    number: int  # 1-based
    text: str
    words: list[tuple[float, float, float, float, str]] = field(default_factory=list)  # x0, y0, x1, y1, word


def extract_pages(path: Path) -> list[Page]:
    """TODO: open with fitz (PyMuPDF), return page.get_text() and page.get_text("words") per page.
    If total text is ~empty, raise ValueError("scanned PDF not supported") so the API can show a clear message."""
    raise NotImplementedError


def find_snippet_bbox(page: Page, snippet: str) -> list[float] | None:
    """TODO: locate the snippet on the page (e.g. fitz page.search_for) and return [x0, y0, x1, y1]."""
    raise NotImplementedError
