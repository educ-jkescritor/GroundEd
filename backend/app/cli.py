"""Terminal entry point.

  uv run python -m app.cli analyze path/to/module.pdf [--json]
  uv run python -m app.cli eval [--runs 3]
  uv run python -m app.cli registry        # validate registry YAML and print entries
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import evaluate, registry
from .pdf import PdfError
from .pipeline import analyze


def _print_analysis(a) -> None:
    print(f"{a.source.filename} — {a.source.pages} pages — {a.summary.model_dump()}")
    for f in a.findings:
        total = f"{f.score.total:>3}" if f.score else "  -"
        print(f"\n[{f.status}] {total}/100  {f.technology}" + (f"  ({f.version})" if f.version else ""))
        for c in f.citations:
            print(f"    p.{c.page}: “{c.snippet}”")
        if f.lifecycle:
            lc = f.lifecycle
            print(f"    source: {lc.source_name or ''} {lc.source_url}" + (f"  EOL {lc.eol_date}" if lc.eol_date else ""))
            if lc.source_quote:
                print(f"    says: “{lc.source_quote}”")
        if f.upgrade:
            print(f"    upgrade: {f.upgrade.target_cycle}")
        if f.score:
            print("    score: " + " · ".join(f"{p.label} {p.points}/{p.max}" for p in f.score.breakdown))
    p = a.provenance
    if p:
        print(f"\nprovenance: file {p.file_sha256[:12]} · registry {p.registry_version} · pipeline {p.pipeline_version}"
              f" · detector {p.detector} · as of {p.analysis_date}")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="groundEd")
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("analyze")
    a.add_argument("pdf", type=Path)
    a.add_argument("--json", action="store_true")
    e = sub.add_parser("eval")
    e.add_argument("--runs", type=int, default=3)
    sub.add_parser("registry")
    args = ap.parse_args(argv)

    if args.cmd == "analyze":
        try:
            result = analyze(args.pdf, args.pdf.name, use_cache=False)
        except PdfError as err:
            print(f"error: {err}", file=sys.stderr)
            return 2
        print(result.model_dump_json(indent=2) if args.json else "", end="")
        if not args.json:
            _print_analysis(result)
    elif args.cmd == "eval":
        print("\n".join(evaluate.run(runs=args.runs).lines()))
    elif args.cmd == "registry":
        reg = registry.load()
        print(f"registry version {reg.version}: {len(reg.entries)} entries")
        for en in reg.entries:
            print(f"  {en.id:28} {'static fact' if en.fact else 'endoflife.date'}  {en.technology}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
