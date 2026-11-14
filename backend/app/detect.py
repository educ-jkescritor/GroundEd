"""Detection. Step 1 is deterministic: registry patterns matched in code. Step 2 (optional) asks Gemini for
technologies the registry does not know; those can only ever become "unverified" findings.

Every mention's snippet must appear (after whitespace/quote normalisation) on its page, else it is dropped.
LLM calls live in llm.py, not here.
"""
from __future__ import annotations

import re
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


def normalise(text: str) -> str:
    return " ".join(text.translate(_QUOTES).split()).lower()


def snippet_on_page(snippet: str, page: Page) -> bool:
    return normalise(snippet) in normalise(page.text)


def _snippet(text: str, start: int, end: int) -> str:
    """The full line(s) around a match, whitespace-collapsed, capped at SNIPPET_MAX chars around the match."""
    ls = text.rfind("\n", 0, start) + 1
    le = text.find("\n", end)
    le = len(text) if le == -1 else le
    if le - ls > SNIPPET_MAX:
        ls = max(ls, start - SNIPPET_MAX // 3)
        le = min(le, ls + SNIPPET_MAX)
    return " ".join(text[ls:le].split())


def detect_registry(pages: list[Page], entries: list[Entry]) -> list[Mention]:
    """One mention per (entry, page): the first match on that page."""
    out: list[Mention] = []
    for entry in entries:
        pats, ctx = entry.compiled(), entry.compiled_context()
        for page in pages:
            hits = [m for p in pats if (m := p.search(page.text))]
            if not hits:
                continue
            if ctx and not any(c.search(page.text) for c in ctx):
                continue  # pattern found, but the page does not look like the right language
            m = min(hits, key=lambda h: h.start())
            mention = Mention(technology=entry.technology, version=None, page=page.number,
                              snippet=_snippet(page.text, m.start(), m.end()), entry_id=entry.id)
            if snippet_on_page(mention.snippet, page):
                out.append(mention)
    return out


def detect_technologies(pages: list[Page]) -> list[Mention]:
    """Gemini-proposed mentions the registry missed. Not wired yet (no API key in dev) -> returns []."""
    return []
