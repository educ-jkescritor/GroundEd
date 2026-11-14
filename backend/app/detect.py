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


def normalise(text: str) -> str:
    """For comparing quotes: NFKC unfolds ligatures and compatibility forms (ﬁ -> fi), curly quotes become
    straight, whitespace collapses, case is ignored. Stored quotes and snippets keep their original text."""
    return " ".join(unicodedata.normalize("NFKC", text).translate(_QUOTES).split()).lower()


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
            if ctx and not any(c.search(page.text) for c in ctx):
                continue  # the page does not look like the right language/technology
            hits = sorted((m for p in pats for m in p.finditer(page.text)), key=lambda m: m.start())
            seen: set[str | None] = set()
            for m in hits:
                version = m.groupdict().get("v")
                if version is not None:
                    version = " ".join(version.split())
                if version in seen:
                    continue
                if entry.eol and is_historical(_line_at(page.text, m.start()), page.text):
                    continue
                mention = Mention(technology=entry.technology, version=version, page=page.number,
                                  snippet=_snippet(page.text, m.start(), m.end()), entry_id=entry.id)
                if snippet_on_page(mention.snippet, page):
                    seen.add(version)
                    out.append(mention)
    return out


def detect_technologies(pages: list[Page]) -> list[Mention]:
    """Gemini-proposed mentions the registry missed. Not wired yet (no API key in dev) -> returns []."""
    return []
