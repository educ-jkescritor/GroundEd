"""endoflife.date v1 lifecycle data. The ONLY source of product support dates.

Default (EOL_SOURCE=snapshot): read the committed snapshot in library/snapshot/eol/<product>.json, so results are
reproducible, versioned with the library, and work offline. `library build` refreshes the snapshot.
EOL_SOURCE=live: call the API (disk cache), falling back to the snapshot if the API is unreachable.
A product found nowhere makes the finding "unverified".

GET {EOL_API_BASE}/products/{product}/ -> {"result": {"releases": [{name, label, releaseDate, isEol, eolFrom, ...}]}}
endoflife.date data is MIT-licensed.
"""
from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from typing import Optional

import httpx

from .config import BASE_DIR, CACHE_DIR, EOL_API_BASE, EOL_CACHE_HOURS, EOL_SOURCE

SNAPSHOT_DIR = BASE_DIR / "library" / "snapshot" / "eol"


class EolError(RuntimeError):
    """Lifecycle data could not be found; message says what failed."""


@dataclass
class Release:
    name: str
    label: str
    release_date: Optional[str]
    eol_from: Optional[str]
    is_eol: bool
    maintained: bool


@dataclass
class ProductData:
    product: str
    label: str
    last_modified: str
    html_url: str
    releases: list[Release]  # newest first, as returned by the API
    origin: str  # "snapshot" | "live" | "cache"


def _fetch(product: str) -> dict:
    url = f"{EOL_API_BASE}/products/{product}/"
    try:
        r = httpx.get(url, timeout=15, follow_redirects=True)
    except httpx.HTTPError as e:
        raise EolError(f"endoflife.date unreachable for '{product}': {e.__class__.__name__}") from e
    if r.status_code == 404:
        raise EolError(f"endoflife.date has no product '{product}' (404)")
    if r.status_code != 200:
        raise EolError(f"endoflife.date returned HTTP {r.status_code} for '{product}'")
    return _trim(r.json())


def _trim(data: dict) -> dict:
    """Keep only the fields we use, so snapshots stay small and diffs readable."""
    res = data["result"]
    return {
        "last_modified": data.get("last_modified", ""),
        "result": {
            "name": res["name"], "label": res.get("label") or res["name"],
            "links": {"html": (res.get("links") or {}).get("html")},
            "releases": [{k: r.get(k) for k in ("name", "label", "releaseDate", "isEol", "eolFrom", "isMaintained")}
                         for r in res.get("releases", [])],
        },
    }


def _parse(data: dict, origin: str) -> ProductData:
    res = data["result"]
    return ProductData(
        product=res["name"], label=res.get("label") or res["name"], last_modified=data.get("last_modified", ""),
        html_url=(res.get("links") or {}).get("html") or f"https://endoflife.date/{res['name']}",
        releases=[Release(name=r["name"], label=r.get("label") or r["name"], release_date=r.get("releaseDate"),
                          eol_from=r.get("eolFrom"), is_eol=bool(r.get("isEol")),
                          maintained=bool(r.get("isMaintained"))) for r in res.get("releases", [])],
        origin=origin,
    )


def _snapshot(product: str) -> Optional[dict]:
    p = SNAPSHOT_DIR / f"{product}.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def _live(product: str) -> tuple[dict, str]:
    path = CACHE_DIR / f"eol-{product}.json"
    if path.exists() and (time.time() - path.stat().st_mtime) < EOL_CACHE_HOURS * 3600:
        return json.loads(path.read_text(encoding="utf-8")), "cache"
    data = _fetch(product)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")
    return data, "live"


def get_product(product: str) -> ProductData:
    if EOL_SOURCE == "snapshot" and (snap := _snapshot(product)):
        return _parse(snap, "snapshot")
    try:
        data, origin = _live(product)
        return _parse(data, origin)
    except EolError:
        if snap := _snapshot(product):
            return _parse(snap, "snapshot")  # API down: the committed snapshot beats no answer
        raise


def snapshot_products(products: list[str]) -> list[tuple[str, str, str]]:
    """Refresh library/snapshot/eol/<product>.json from the live API. Returns (product, status, reason) rows."""
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    for p in sorted(set(products)):
        try:
            data = _fetch(p)
            (SNAPSHOT_DIR / f"{p}.json").write_text(json.dumps(data, indent=1) + "\n", encoding="utf-8")
            rows.append((p, "ok", ""))
        except EolError as e:
            rows.append((p, "failed", f"{e} (previous snapshot kept)" if _snapshot(p) else str(e)))
    return rows


def find_release(data: ProductData, cycle: str) -> Optional[Release]:
    """Exact name match first, then prefix ("7" -> "7-sp1")."""
    for r in data.releases:
        if r.name == cycle:
            return r
    for r in data.releases:
        if r.name.startswith(cycle + "-"):
            return r
    return None


def resolve_version(data: ProductData, text: str, versions: Optional[dict[str, str]] = None) -> Optional[Release]:
    """Map a version as written in a module to an endoflife.date release, or None if it is not a known release.
    "5.6" -> 5.6 · "5.6.40" -> 5.6 · "5" -> newest 5.x (5.6) · "2012" -> versions["2012"] · "7" -> "7-sp1" ·
    jQuery "1.12.4" -> "1" (product names releases by major only). Unknown versions -> None (no claim)."""
    text = " ".join(text.split())
    text = (versions or {}).get(text, text)
    if rel := find_release(data, text):
        return rel
    parts = text.split(".")
    while len(parts) > 2:  # drop patch numbers: 5.6.40 -> 5.6
        parts.pop()
        if rel := find_release(data, ".".join(parts)):
            return rel
    if "." not in text:  # major only: newest release of that major line (releases are newest first)
        return next((r for r in data.releases if r.name.startswith(text + ".")), None)
    # Products that name releases by major only (jQuery "1", Bootstrap "3"): "1.12.4" -> "1". Exact name only,
    # so "Laravel 5.4" is NOT mapped to a different minor line such as 5.5.
    return next((r for r in data.releases if r.name == parts[0]), None)


def latest_label(data: ProductData) -> Optional[str]:
    """Newest version as a plain number ("11", "8.5"), without edition suffixes like "26H2 (E)"."""
    if not data.releases:
        return None
    m = re.match(r"\d+(\.\d+)?", data.releases[0].name)
    return m.group(0) if m else data.releases[0].label
