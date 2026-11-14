"""Evaluation runner: compares pipeline output with testset/expected.yaml.

Metrics (design brief §9): claims backed · citation accuracy (page) · coverage · false alarms · consistency.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import yaml

from .config import BASE_DIR
from .pipeline import analyze

EXPECTED = BASE_DIR / "testset" / "expected.yaml"
MODULES_DIR = BASE_DIR.parent / "private" / "modules"


@dataclass
class Report:
    expected: int = 0
    found: int = 0
    false_alarms: list[str] = field(default_factory=list)
    missed: list[str] = field(default_factory=list)
    scored: int = 0
    backed: int = 0
    page_ok: int = 0
    consistent_modules: int = 0
    fact_passages: int = 0
    fact_passages_ok: int = 0
    modules: int = 0
    skipped: list[str] = field(default_factory=list)

    def lines(self) -> list[str]:
        pct = lambda a, b: f"{a}/{b} ({100 * a / b:.0f}%)" if b else "n/a"
        return [
            f"Modules evaluated     {self.modules}" + (f"  (missing: {', '.join(self.skipped)})" if self.skipped else ""),
            f"Coverage              {pct(self.found, self.expected)}",
            f"False alarms          {len(self.false_alarms)}" + (f"  {self.false_alarms}" if self.false_alarms else ""),
            f"Missed                {len(self.missed)}" + (f"  {self.missed}" if self.missed else ""),
            f"Claims backed         {pct(self.backed, self.scored)}  (scored findings with source URL + verified quote)",
            f"Citation page match   {pct(self.page_ok, self.found)}",
            f"Consistency           {pct(self.consistent_modules, self.modules)}  (identical findings+scores across reruns)",
            f"Retrieved fact passage contains the registry quote  {pct(self.fact_passages_ok, self.fact_passages)}",
        ]


def _signature(a) -> list[tuple]:
    return [(f.id, f.status, f.score.total if f.score else None, tuple(c.page for c in f.citations)) for f in a.findings]


def run(runs: int = 3, modules_dir: Path = MODULES_DIR, today: date | None = None) -> Report:
    spec = yaml.safe_load(EXPECTED.read_text())["modules"]
    today = today or date.today()
    rep = Report()
    for name, items in spec.items():
        pdf = modules_dir / name
        if not pdf.exists():
            rep.skipped.append(name)
            continue
        rep.modules += 1
        results = [analyze(pdf, name, today=today, use_cache=False) for _ in range(runs)]
        if all(_signature(r) == _signature(results[0]) for r in results):
            rep.consistent_modules += 1
        a = results[0]
        got = {f.id: f for f in a.findings}
        want = {i["item"]: i for i in items}
        rep.expected += len(want)
        for item_id, item in want.items():
            if item_id in got:
                rep.found += 1
                if item["page"] in [c.page for c in got[item_id].citations]:
                    rep.page_ok += 1
            else:
                rep.missed.append(f"{name}:{item_id}")
        # A false alarm is an unexpected *claim*. "Supported" items are verification, not claims.
        rep.false_alarms += [f"{name}:{fid}" for fid, f in got.items() if fid not in want and f.status != "supported"]
        for f in a.findings:
            for p in f.passages or []:
                if p.role == "fact":
                    rep.fact_passages += 1
                    rep.fact_passages_ok += p.contains_fact_quote
            if f.score is not None:
                rep.scored += 1
                if f.lifecycle and f.lifecycle.source_url and f.citations:
                    rep.backed += 1
    return rep
