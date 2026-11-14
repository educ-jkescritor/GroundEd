"""Analysis pipeline: PDF -> mentions -> facts -> score -> Analysis. No LLM decides or scores anything here."""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional

from . import cache, detect, eol, registry
from .detect import Mention
from .models import Analysis, Citation, Finding, Lifecycle, Provenance, SourceInfo, Summary, Upgrade
from .pdf import extract_pages, file_sha256, find_snippet_bbox
from .score import compute, status_for

PIPELINE_VERSION = "0.1.0"
MAX_CITATIONS = 5  # per finding; prominence still counts every page


def _finding_for_entry(entry: registry.Entry, mentions: list[Mention], pdf_path: Path, today: date,
                       eol_data: dict[str, str]) -> Finding:
    pages = sorted({m.page for m in mentions})
    citations = [
        Citation(page=m.page, snippet=m.snippet, bbox=find_snippet_bbox(pdf_path, m.page, m.snippet))
        for m in sorted(mentions, key=lambda m: m.page)[:MAX_CITATIONS]
    ]
    upgrade = Upgrade(target_cycle=entry.upgrade.target, source_url=entry.upgrade.source_url) if entry.upgrade else None
    base = dict(id=entry.id, technology=entry.technology, citations=citations, upgrade=upgrade)

    if entry.fact:
        f = entry.fact
        lifecycle = Lifecycle(product=f.product, cycle=f.cycle, eol_date=f.eol_date, source_url=f.source_url,
                              source_name=f.source_name, source_quote=f.source_quote)
        deprecated, cycles_behind, version = f.stage == "deprecated", None, f.cycle
    else:
        ref = entry.eol
        try:
            data = eol.get_product(ref.product)
        except eol.EolError:
            return Finding(**base, version=ref.cycle, status="unverified")
        eol_data[data.product] = data.last_modified
        rel = eol.find_release(data, ref.cycle)
        if rel is None:
            return Finding(**base, version=ref.cycle, status="unverified")
        lifecycle = Lifecycle(product=data.product, cycle=rel.label, eol_date=rel.eol_from,
                              latest_cycle=eol.latest_label(data), source_url=data.html_url,
                              source_name="endoflife.date")
        deprecated, cycles_behind, version = False, eol.majors_behind(data, rel), rel.label

    status = status_for(lifecycle.eol_date, deprecated, today)
    score = compute(lifecycle.eol_date, deprecated, cycles_behind, len(pages), today)
    return Finding(**base, version=version, status=status, lifecycle=lifecycle, score=score)


def analyze(pdf_path: Path, filename: str, kind: str = "upload", today: Optional[date] = None,
            use_cache: bool = True) -> Analysis:
    today = today or date.today()
    reg = registry.get()
    file_hash = file_sha256(pdf_path)
    detector = "registry"  # becomes "registry+<model>" once LLM detection is enabled
    cache_key = cache.key(file_hash, reg.version, PIPELINE_VERSION, detector, today.isoformat())
    if use_cache and (hit := cache.get(cache_key)):
        return hit

    pages = extract_pages(pdf_path)
    by_entry: dict[str, list[Mention]] = defaultdict(list)
    for m in detect.detect_registry(pages, reg.entries):
        by_entry[m.entry_id].append(m)

    eol_data: dict[str, str] = {}
    entries = {e.id: e for e in reg.entries}
    findings = [_finding_for_entry(entries[eid], ms, pdf_path, today, eol_data) for eid, ms in by_entry.items()]

    # LLM-proposed technologies the registry does not know: never scored, always "unverified".
    for m in detect.detect_technologies(pages):
        findings.append(Finding(id=f"llm-{len(findings)}", technology=m.technology, version=m.version,
                                status="unverified", citations=[Citation(page=m.page, snippet=m.snippet)]))

    findings.sort(key=lambda f: (-(f.score.total if f.score else -1), f.id))
    summary = Summary(**{s: sum(f.status == s for f in findings) for s in ("eol", "nearing_eol", "supported", "unverified")})
    analysis = Analysis(
        id=uuid.uuid4().hex[:12],
        created_at=datetime.now(timezone.utc),
        source=SourceInfo(kind=kind, filename=filename, pages=len(pages)),
        summary=summary,
        findings=findings,
        provenance=Provenance(file_sha256=file_hash, registry_version=reg.version, pipeline_version=PIPELINE_VERSION,
                              detector=detector, eol_data=eol_data, analysis_date=today.isoformat()),
    )
    if use_cache:
        cache.put(cache_key, analysis)
    return analysis
