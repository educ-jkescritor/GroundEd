"""Facts Registry: YAML files in backend/registry/, validated with Pydantic on load.

Each entry says how to recognise an item in a PDF (regex `patterns`, data not code) and where its facts come from:
either a static `fact` taken from an official document (with a verbatim quote), or an `eol` reference that is
resolved live against endoflife.date. Exactly one of the two must be present.
"""
from __future__ import annotations

import hashlib
import re
from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

import yaml
from pydantic import BaseModel, model_validator

from .config import BASE_DIR

REGISTRY_DIR = BASE_DIR / "registry"

Stage = Literal["eol", "deprecated", "supported"]


class EolRef(BaseModel):
    product: str  # endoflife.date product slug
    cycle: str  # release name, matched exactly or as a prefix ("7" matches "7-sp1")


class StaticFact(BaseModel):
    """A fact proven by a sentence in a library document. Dates are never typed by hand: a removal date is the
    release date of `removed_in`, looked up in the endoflife.date snapshot."""
    stage: Stage
    product: str
    cycle: Optional[str] = None  # version the stage applies from, e.g. deprecated "as of 8.0.17"
    removed_in: Optional[EolRef] = None  # e.g. {product: php, cycle: "7.0"} -> PHP 7.0 release date
    doc: str  # library document id (backend/library/sources.yaml)
    quote: str  # verbatim sentence from that document; checked by code against the snapshot

    @model_validator(mode="after")
    def _check(self) -> "StaticFact":
        if self.stage == "eol" and self.removed_in is None:
            raise ValueError("stage 'eol' needs `removed_in` so the date comes from a source")
        return self


class UpgradeRef(BaseModel):
    target: str
    source_url: str


class Entry(BaseModel):
    id: str
    technology: str
    patterns: list[str]
    # Optional: the page must ALSO match one of these, else the hit is ignored. Prevents false alarms when the
    # same syntax is valid elsewhere (e.g. `<% %>` is current EJS/JSP syntax, only outdated in PHP).
    context: list[str] = []
    fact: Optional[StaticFact] = None
    eol: Optional[EolRef] = None
    upgrade: Optional[UpgradeRef] = None

    @model_validator(mode="after")
    def _check(self) -> "Entry":
        if (self.fact is None) == (self.eol is None):
            raise ValueError(f"{self.id}: exactly one of `fact` or `eol` is required")
        for p in self.patterns + self.context:
            re.compile(p)
        return self

    def compiled(self) -> list[re.Pattern[str]]:
        return [re.compile(p, re.IGNORECASE) for p in self.patterns]

    def compiled_context(self) -> list[re.Pattern[str]]:
        return [re.compile(p, re.IGNORECASE) for p in self.context]


class Registry(BaseModel):
    version: str
    entries: list[Entry]


def load(directory: Path = REGISTRY_DIR) -> Registry:
    files = sorted(directory.glob("*.yaml"))
    h = hashlib.sha256()
    entries: list[Entry] = []
    for f in files:
        data = f.read_bytes()
        h.update(f.name.encode() + b"\0" + data)
        for raw in yaml.safe_load(data) or []:
            entries.append(Entry.model_validate(raw))
    ids = [e.id for e in entries]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        raise ValueError(f"Duplicate registry ids: {sorted(dupes)}")
    return Registry(version=h.hexdigest()[:12], entries=entries)


@lru_cache(maxsize=1)
def get() -> Registry:
    return load()


def eol_products(reg: Optional[Registry] = None) -> list[str]:
    """endoflife.date products the registry depends on (snapshotted by `library build`)."""
    reg = reg or load()
    return sorted({e.eol.product for e in reg.entries if e.eol} | {e.fact.product for e in reg.entries if e.fact})
