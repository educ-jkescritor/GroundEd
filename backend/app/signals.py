"""Teaching signals for scoring: how an item is taught (code / explained / listed) and whether it is hands-on.
Patterns live in backend/rules/teaching.yaml. Deterministic, no LLM."""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

import yaml

from .config import BASE_DIR

RULES_FILE = BASE_DIR / "rules" / "teaching.yaml"
Depth = Literal["code", "explained", "listed"]
_RANK = {"listed": 0, "explained": 1, "code": 2}


@dataclass(frozen=True)
class Rules:
    version: str
    code: tuple[re.Pattern[str], ...]
    hands_on: tuple[re.Pattern[str], ...]
    explained_min_words: int


@lru_cache(maxsize=1)
def rules() -> Rules:
    raw = RULES_FILE.read_bytes()
    data = yaml.safe_load(raw)
    return Rules(
        version=hashlib.sha256(raw).hexdigest()[:12],
        code=tuple(re.compile(p, re.IGNORECASE) for p in data["code"]),
        hands_on=tuple(re.compile(p, re.IGNORECASE) for p in data["hands_on"]),
        explained_min_words=int(data["explained_min_words"]),
    )


def line_depth(line: str) -> Depth:
    r = rules()
    if any(p.search(line) for p in r.code):
        return "code"
    return "explained" if len(line.split()) >= r.explained_min_words else "listed"


def teaching_depth(lines: list[str]) -> Depth:
    """Deepest way the item is taught across all lines that mention it."""
    return max((line_depth(l) for l in lines), key=_RANK.__getitem__, default="listed")


def is_hands_on(page_text: str) -> bool:
    return any(p.search(page_text) for p in rules().hands_on)


# ---------------------------------------------------------------- historical mentions (rules/mentions.yaml)

MENTIONS_FILE = BASE_DIR / "rules" / "mentions.yaml"


@dataclass(frozen=True)
class MentionRules:
    version: str
    history_line: tuple[re.Pattern[str], ...]
    history_page: tuple[re.Pattern[str], ...]


@lru_cache(maxsize=1)
def mention_rules() -> MentionRules:
    raw = MENTIONS_FILE.read_bytes()
    data = yaml.safe_load(raw)
    return MentionRules(
        version=hashlib.sha256(raw).hexdigest()[:12],
        history_line=tuple(re.compile(p, re.IGNORECASE) for p in data["history_line"]),
        history_page=tuple(re.compile(p, re.IGNORECASE) for p in data["history_page"]),
    )


def is_historical(line: str, page_text: str) -> bool:
    """True if a product-version mention is history or a changelog note, not taught content."""
    r = mention_rules()
    first = next((l for l in page_text.splitlines() if l.strip()), "")
    return any(p.search(first) for p in r.history_page) or any(p.search(line) for p in r.history_line)


def rules_version() -> str:
    """Combined version of every rules file (recorded in provenance; part of the cache key)."""
    return hashlib.sha256((rules().version + mention_rules().version).encode()).hexdigest()[:12]
