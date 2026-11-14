"""ALL Gemini calls live in this file, so the provider can be swapped in one place.
The LLM only (1) spots technology mentions and (2) drafts suggested text. It never supplies lifecycle facts."""
from dataclasses import dataclass

from .pdf import Page


@dataclass
class Mention:
    technology: str  # as written, e.g. "Python"
    version: str | None  # e.g. "2.7"
    page: int
    snippet: str  # MUST appear verbatim in the page text; otherwise the mention is dropped


def detect_technologies(pages: list[Page]) -> list[Mention]:
    """TODO:
    - Prompt Gemini per page (or batched) for JSON: [{technology, version, snippet}].
      Use structured output (response_schema) so the result is valid JSON.
    - Drop any item whose snippet is not a substring of page.text (anti-hallucination check).
    - Deduplicate by (technology, version), keeping all citations.
    - Retry with backoff on 429 (free-tier rate limit)."""
    raise NotImplementedError


def draft_section(technology: str, version: str | None, page_text: str, upgrade_hint: str | None) -> str:
    """TODO: ask Gemini to rewrite the relevant syllabus sentence(s) for a current tool.
    The output is always shown to faculty as an unsourced AI suggestion for them to edit and approve."""
    raise NotImplementedError
