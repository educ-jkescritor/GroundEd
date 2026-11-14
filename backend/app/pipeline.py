"""Analysis pipeline: PDF -> mentions -> facts -> score -> Analysis. No LLM decides or scores anything here."""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional

from . import cache, detect, eol, library, registry, signals
from .detect import Mention
from .models import Analysis, Citation, Finding, Lifecycle, Provenance, SourceInfo, Summary, Upgrade
from .pdf import Page, extract_pages, file_sha256, find_snippet_bbox
from .score import compute, status_for

PIPELINE_VERSION = "0.2.0"  # 0.2.0: scoring Option C
MAX_CITATIONS = 5  # per finding; prominence still counts every page


def _static_lifecycle(f: registry.StaticFact, eol_data: dict[str, str]) -> Optional[Lifecycle]:
    """Lifecycle for a document-backed fact, or None if the evidence does not check out."""
    doc = library.load_document(f.doc)
    if doc is None or not library.contains_quote(f.doc, f.quote):
        return None
    eol_date = None
    if f.removed_in:
        try:
            data = eol.get_product(f.removed_in.product)
        except eol.EolError:
            return None
        eol_data[data.product] = f"{data.last_modified} ({data.origin})"
        rel = eol.find_release(data, f.removed_in.cycle)
        if rel is None or not rel.release_date:
            return None
        eol_date = rel.release_date  # removed in X => unsupported since X was released
    return Lifecycle(product=f.product, cycle=f.cycle, eol_date=eol_date, source_url=doc.url,
                     source_name=f"{doc.publisher} — {doc.title}", source_quote=f.quote)


def _finding_for_entry(entry: registry.Entry, mentions: list[Mention], pages_by_no: dict[int, Page], pdf_path: Path,
                       today: date, eol_data: dict[str, str]) -> Finding:
    pages = sorted({m.page for m in mentions})
    # Teaching signals: every line on those pages that mentions the item, and whether any page is hands-on.
    pats = entry.compiled()
    lines = [l for n in pages for l in pages_by_no[n].text.splitlines() if any(p.search(l) for p in pats)]
    depth = signals.teaching_depth(lines)
    hands_on = any(signals.is_hands_on(pages_by_no[n].text) for n in pages)
    citations = [
        Citation(page=m.page, snippet=m.snippet, bbox=find_snippet_bbox(pdf_path, m.page, m.snippet))
        for m in sorted(mentions, key=lambda m: m.page)[:MAX_CITATIONS]
    ]
    upgrade = Upgrade(target_cycle=entry.upgrade.target, source_url=entry.upgrade.source_url) if entry.upgrade else None
    base = dict(id=entry.id, technology=entry.technology, citations=citations, upgrade=upgrade)

    if entry.fact:
        lifecycle = _static_lifecycle(entry.fact, eol_data)
        if lifecycle is None:  # quote not in the saved document, or date not sourceable: no source, no claim
            return Finding(**base, version=entry.fact.cycle, status="unverified")
        deprecated, version = entry.fact.stage == "deprecated", entry.fact.cycle
    else:
        ref = entry.eol
        try:
            data = eol.get_product(ref.product)
        except eol.EolError:
            return Finding(**base, version=ref.cycle, status="unverified")
        eol_data[data.product] = f"{data.last_modified} ({data.origin})"  # e.g. "2026-05-01T09:58:42+00:00 (snapshot)"
        rel = eol.find_release(data, ref.cycle)
        if rel is None:
            return Finding(**base, version=ref.cycle, status="unverified")
        lifecycle = Lifecycle(product=data.product, cycle=rel.label, eol_date=rel.eol_from,
                              latest_cycle=eol.latest_label(data), source_url=data.html_url,
                              source_name="endoflife.date")
        deprecated, version = False, rel.label

    status = status_for(lifecycle.eol_date, deprecated, today)
    score = compute(lifecycle.eol_date, deprecated, depth, len(pages), hands_on, today)
    return Finding(**base, version=version, status=status, lifecycle=lifecycle, score=score)


def analyze(pdf_path: Path, filename: str, kind: str = "upload", today: Optional[date] = None,
            use_cache: bool = True) -> Analysis:
    today = today or date.today()
    reg = registry.get()
    file_hash = file_sha256(pdf_path)
    detector = "registry"  # becomes "registry+<model>" once LLM detection is enabled
    rules_version = signals.rules().version
    cache_key = cache.key(file_hash, reg.version, rules_version, PIPELINE_VERSION, detector, today.isoformat())
    if use_cache and (hit := cache.get(cache_key)):
        return hit

    pages = extract_pages(pdf_path)
    by_entry: dict[str, list[Mention]] = defaultdict(list)
    for m in detect.detect_registry(pages, reg.entries):
        by_entry[m.entry_id].append(m)

    eol_data: dict[str, str] = {}
    entries = {e.id: e for e in reg.entries}
    pages_by_no = {p.number: p for p in pages}
    findings = [_finding_for_entry(entries[eid], ms, pages_by_no, pdf_path, today, eol_data)
                for eid, ms in by_entry.items()]

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
                              detector=detector, rules_version=rules_version, eol_data=eol_data,
                              analysis_date=today.isoformat()),
    )
    if use_cache:
        cache.put(cache_key, analysis)
    return analysis
