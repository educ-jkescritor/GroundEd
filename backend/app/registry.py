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


class StaticFact(BaseModel):
    stage: Stage
    product: str
    cycle: Optional[str] = None
    eol_date: Optional[str] = None  # ISO date the item stopped being supported/was removed
    source_name: str
    source_url: str
    source_quote: str


class EolRef(BaseModel):
    product: str  # endoflife.date product slug
    cycle: str  # release name, matched exactly or as a prefix ("7" matches "7-sp1")


class UpgradeRef(BaseModel):
    target: str
    source_url: str


class Entry(BaseModel):
    id: str
    technology: str
    patterns: list[str]
    fact: Optional[StaticFact] = None
    eol: Optional[EolRef] = None
    upgrade: Optional[UpgradeRef] = None

    @model_validator(mode="after")
    def _check(self) -> "Entry":
        if (self.fact is None) == (self.eol is None):
            raise ValueError(f"{self.id}: exactly one of `fact` or `eol` is required")
        for p in self.patterns:
            re.compile(p)
        return self

    def compiled(self) -> list[re.Pattern[str]]:
        return [re.compile(p, re.IGNORECASE) for p in self.patterns]


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
