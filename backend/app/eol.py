"""endoflife.date v1 API lookups, cached on disk. The ONLY live source of product lifecycle facts.

GET {EOL_API_BASE}/products/{product}/ -> {"result": {"releases": [{name, label, isEol, eolFrom, isMaintained, ...}]}}
If the API is unreachable, a stale cached copy is used; with no cache, the item becomes "unverified".
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Optional

import httpx

from .config import CACHE_DIR, EOL_API_BASE, EOL_CACHE_HOURS


class EolError(RuntimeError):
    """Lifecycle data could not be fetched; message says what failed."""


@dataclass
class Release:
    name: str
    label: str
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


def _cache_path(product: str):
    return CACHE_DIR / f"eol-{product}.json"


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
    return r.json()


def get_product(product: str) -> ProductData:
    path = _cache_path(product)
    fresh = path.exists() and (time.time() - path.stat().st_mtime) < EOL_CACHE_HOURS * 3600
    if fresh:
        data = json.loads(path.read_text())
    else:
        try:
            data = _fetch(product)
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(data))
        except EolError:
            if not path.exists():
                raise
            data = json.loads(path.read_text())  # stale cache beats no answer; last_modified is recorded
    res = data["result"]
    return ProductData(
        product=res["name"],
        label=res.get("label") or res["name"],
        last_modified=data.get("last_modified", ""),
        html_url=res.get("links", {}).get("html") or f"https://endoflife.date/{product}",
        releases=[
            Release(name=r["name"], label=r.get("label") or r["name"], eol_from=r.get("eolFrom"),
                    is_eol=bool(r.get("isEol")), maintained=bool(r.get("isMaintained")))
            for r in res.get("releases", [])
        ],
    )


def find_release(data: ProductData, cycle: str) -> Optional[Release]:
    """Exact name match first, then prefix ("7" -> "7-sp1")."""
    for r in data.releases:
        if r.name == cycle:
            return r
    for r in data.releases:
        if r.name.startswith(cycle + "-"):
            return r
    return None


def latest_label(data: ProductData) -> Optional[str]:
    return data.releases[0].label if data.releases else None
