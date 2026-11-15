"""Detection. Step 1 is deterministic: registry patterns matched in code. Step 2 (optional) asks Gemini for
technologies the registry does not know; those can only ever become "unverified" findings.

Every mention's snippet must appear (after whitespace/quote normalisation) on its page, else it is dropped.
LLM calls live in llm.py, not here.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from .pdf import Page
from .registry import Entry

SNIPPET_MAX = 160
_QUOTES = str.maketrans({"“": '"', "”": '"', "‘": "'", "’": "'", "…": "..."})


@dataclass
class Mention:
    technology: str  # as written, e.g. "Python"
    version: str | None  # e.g. "2.7"
    page: int
    snippet: str  # MUST appear (normalised) in the page text; otherwise the mention is dropped
    entry_id: str | None = None  # registry entry that matched, None for LLM-proposed mentions
    from_ocr: bool = False  # matched in text read from an image on the page (OCR)


def normalise(text: str) -> str:
    """For comparing quotes: NFKC unfolds ligatures and compatibility forms (ﬁ -> fi), curly quotes become
    straight, whitespace collapses, case is ignored. Stored quotes and snippets keep their original text."""
    return " ".join(unicodedata.normalize("NFKC", text).translate(_QUOTES).split()).lower()


def snippet_on_page(snippet: str, page: Page, from_ocr: bool = False) -> bool:
    return normalise(snippet) in normalise(page.ocr_text if from_ocr else page.text)


def _snippet(text: str, start: int, end: int) -> str:
    """The full line(s) around a match, whitespace-collapsed, capped at SNIPPET_MAX chars around the match."""
    ls = text.rfind("\n", 0, start) + 1
    le = text.find("\n", end)
    le = len(text) if le == -1 else le
    if le - ls > SNIPPET_MAX:
        ls = max(ls, start - SNIPPET_MAX // 3)
        le = min(le, ls + SNIPPET_MAX)
    return " ".join(text[ls:le].split())


def _line_at(text: str, pos: int) -> str:
    ls = text.rfind("\n", 0, pos) + 1
    le = text.find("\n", pos)
    return text[ls:len(text) if le == -1 else le]


def detect_registry(pages: list[Page], entries: list[Entry]) -> list[Mention]:
    """One mention per (entry, page, version as written): the first such match on that page.
    Product-version entries (endoflife.date) skip historical mentions ("PHP 5 (July 13, 2004)")."""
    from .signals import is_historical

    out: list[Mention] = []
    for entry in entries:
        pats, ctx = entry.compiled(), entry.compiled_context()
        for page in pages:
            seen: set[str | None] = set()
            # Page text first, then text read from the page's images (OCR); a mention found in the text wins.
            for source, from_ocr in ((page.text, False), (page.ocr_text, True)):
                if not source:
                    continue
                # Context: a match in the slide TEXT needs context in the slide text (a PHP screenshot must not make
                # an EJS slide's "<% %>" look like PHP); a match in a SCREENSHOT may take context from the screenshot
                # or from the slide text around it (a slide titled "PHP Arrays" describes its code image).
                where = page.text + "\n" + page.ocr_text if from_ocr else page.text
                if ctx and not any(c.search(where) for c in ctx):
                    continue
                hits = sorted((m for p in pats for m in p.finditer(source)), key=lambda m: m.start())
                for m in hits:
                    version = m.groupdict().get("v")
                    if version is not None:
                        version = " ".join(version.split())
                    if version in seen:
                        continue
                    if entry.eol and is_historical(_line_at(source, m.start()), page.text):
                        continue
                    mention = Mention(technology=entry.technology, version=version, page=page.number,
                                      snippet=_snippet(source, m.start(), m.end()), entry_id=entry.id,
                                      from_ocr=from_ocr)
                    if snippet_on_page(mention.snippet, page, from_ocr):
                        seen.add(version)
                        out.append(mention)
    return out


def detect_technologies(pages: list[Page]) -> list[Mention]:
    """Gemini-proposed mentions the registry missed. Not wired yet (no API key in dev) -> returns []."""
    return []
