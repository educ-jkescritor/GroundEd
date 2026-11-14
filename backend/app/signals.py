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
