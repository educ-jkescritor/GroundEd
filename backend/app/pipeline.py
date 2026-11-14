"""Analysis pipeline: PDF -> mentions -> facts -> score -> Analysis. No LLM decides or scores anything here."""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Optional

import pymupdf

from . import cache, detect, eol, library, registry, signals
from .detect import Mention
from .models import Analysis, Citation, Finding, Lifecycle, PageText, Provenance, SourceInfo, Summary, Upgrade
from .pdf import Page, extract_pages, file_sha256, find_snippet_bbox
from .score import compute, status_for

PIPELINE_VERSION = "0.5.0"  # 0.5.0: page text, kind, usage and hands_on in the response (frontend Report)
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


# Item kind for labels and filters (code, not AI). Registry facts are practices (functions, tags, settings);
# lifecycle products are languages, frameworks or tools.
_LANGUAGES = {"php", "python", "ruby", "nodejs", "java", "dotnet"}
_FRAMEWORKS = {"angularjs", "angular", "bootstrap", "jquery", "jquery-ui", "laravel", "rails", "symfony", "vue",
               "nextjs", "nuxt", "spring-boot", "express", "django", "react", "drupal", "joomla", "wordpress"}


def _kind(entry: registry.Entry) -> str:
    if entry.fact:
        return "practice"
    product = entry.eol.product if entry.eol else ""
    return "language" if product in _LANGUAGES else "framework" if product in _FRAMEWORKS else "tool"


def _finding_for_entry(entry: registry.Entry, mentions: list[Mention], pages_by_no: dict[int, Page], pdf_doc,
                       today: date, eol_data: dict[str, str], product: Optional[eol.ProductData] = None,
                       rel: Optional[eol.Release] = None) -> Optional[Finding]:
    """One finding for one registry entry (and, for product entries, one release). None = nothing to claim."""
    pages = sorted({m.page for m in mentions})
    # Teaching signals: every line on those pages that mentions the item, and whether any page is hands-on.
    pats = entry.compiled()
    lines = [l for n in pages for l in pages_by_no[n].text.splitlines() if any(p.search(l) for p in pats)]
    depth = signals.teaching_depth(lines)
    hands_on = any(signals.is_hands_on(pages_by_no[n].text) for n in pages)
    citations = [
        Citation(page=m.page, snippet=m.snippet, bbox=find_snippet_bbox(pdf_doc, m.page, m.snippet))
        for m in sorted(mentions, key=lambda m: m.page)[:MAX_CITATIONS]
    ]
    upgrade = Upgrade(target_cycle=entry.upgrade.target, source_url=entry.upgrade.source_url) if entry.upgrade else None
    # A versioned mention of a non-default release gets its own id, e.g. "php-5.6"; defaults keep the entry id.
    fid = entry.id if rel is None or (entry.eol and rel.name == entry.eol.cycle) or not entry.versioned \
        else f"{entry.id}-{rel.name}"
    base = dict(id=fid, technology=entry.technology, citations=citations, upgrade=upgrade,
                kind=_kind(entry), usage=depth, hands_on=hands_on)

    if entry.fact:
        lifecycle = _static_lifecycle(entry.fact, eol_data)
        if lifecycle is None:  # quote not in the saved document, or date not sourceable: no source, no claim
            return Finding(**base, version=entry.fact.cycle, status="unverified")
        deprecated, version, ended = entry.fact.stage == "deprecated", entry.fact.cycle, False
    else:
        if product is None or rel is None:  # lifecycle data unavailable: no claim
            return Finding(**base, version=entry.eol.cycle, status="unverified")
        eol_data[product.product] = f"{product.last_modified} ({product.origin})"
        latest = eol.latest_label(product)
        lifecycle = Lifecycle(product=product.product, cycle=rel.label, eol_date=rel.eol_from, latest_cycle=latest,
                              source_url=product.html_url, source_name="endoflife.date")
        deprecated, version, ended = False, rel.label, rel.is_eol
        if upgrade is None and latest:  # product upgrades come from the same lifecycle record
            base["upgrade"] = upgrade = Upgrade(target_cycle=f"{product.label} {latest} (latest)",
                                                source_url=product.html_url)

    passages = library.passages_for(
        entry.technology,
        entry.fact.doc if entry.fact else None, entry.fact.quote if entry.fact else None,
        entry.upgrade.source_url if entry.upgrade else None, entry.upgrade.target if entry.upgrade else None,
    ) or None
    status = status_for(lifecycle.eol_date, deprecated, today, ended)
    if status == "supported":
        return None  # still supported: not a finding (no claim to make)
    score = compute(lifecycle.eol_date, deprecated, depth, len(pages), hands_on, today, ended)
    return Finding(**base, version=version, status=status, lifecycle=lifecycle, score=score, passages=passages)


def analyze(pdf_path: Path, filename: str, kind: str = "upload", today: Optional[date] = None,
            use_cache: bool = True) -> Analysis:
    today = today or date.today()
    reg = registry.get()
    file_hash = file_sha256(pdf_path)
    detector = "registry"  # becomes "registry+<model>" once LLM detection is enabled
    rules_version, library_version = signals.rules_version(), library.version()
    cache_key = cache.key(file_hash, reg.version, rules_version, library_version, PIPELINE_VERSION, detector,
                          today.isoformat())
    if use_cache and (hit := cache.get(cache_key)):
        return hit

    pages = extract_pages(pdf_path)
    entries = {e.id: e for e in reg.entries}
    products: dict[str, Optional[eol.ProductData]] = {}

    def product_for(name: str) -> Optional[eol.ProductData]:
        if name not in products:
            try:
                products[name] = eol.get_product(name)
            except eol.EolError:
                products[name] = None
        return products[name]

    # Group mentions: static facts by entry; product entries by (entry, release the written version resolves to).
    groups: dict[tuple[str, Optional[str]], list[Mention]] = defaultdict(list)
    releases: dict[tuple[str, Optional[str]], Optional[eol.Release]] = {}
    for m in detect.detect_registry(pages, reg.entries):
        e = entries[m.entry_id]
        if e.fact:
            groups[(e.id, None)].append(m)
            continue
        data = product_for(e.eol.product)
        if data is None:
            groups[(e.id, None)].append(m)  # -> unverified: lifecycle data unavailable
            continue
        text = m.version or e.eol.cycle
        rel = eol.resolve_version(data, text, e.eol.versions) if text else None
        if rel is None:
            continue  # not a real release of this product (e.g. "PHP 6", never released): ignore
        groups[(e.id, rel.name)].append(m)
        releases[(e.id, rel.name)] = rel

    eol_data: dict[str, str] = {}
    pages_by_no = {p.number: p for p in pages}
    with pymupdf.open(pdf_path) as pdf_doc:  # opened once for every citation's highlight box
        findings = [f for (eid, rname), ms in groups.items()
                    if (f := _finding_for_entry(entries[eid], ms, pages_by_no, pdf_doc, today, eol_data,
                                                product=products.get(entries[eid].eol.product) if entries[eid].eol
                                                else None,
                                                rel=releases.get((eid, rname)))) is not None]

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
        pages=[PageText(number=p.number, text=p.text) for p in pages],  # for the side-by-side Report
        provenance=Provenance(file_sha256=file_hash, registry_version=reg.version, pipeline_version=PIPELINE_VERSION,
                              detector=detector, rules_version=rules_version, library_version=library_version,
                              eol_data=eol_data,
                              analysis_date=today.isoformat()),
    )
    if use_cache:
        cache.put(cache_key, analysis)
    return analysis
