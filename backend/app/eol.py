"""endoflife.date lookups, cached on disk. This is the ONLY source of lifecycle facts.

API notes (verify before building):
- Product list:  GET {EOL_API_BASE}/all.json
- Product cycles: GET {EOL_API_BASE}/{product}.json  -> [{cycle, eol, latest, releaseDate, lts, ...}]
  `eol` can be a date string or a boolean.
- A newer v1 API also exists (https://endoflife.date/docs/api/v1/); pick one and stick with it.
"""
from .models import Lifecycle


def load_products() -> list[str]:
    """TODO: fetch all.json (cache to data/cache/, refresh after EOL_CACHE_HOURS)."""
    raise NotImplementedError


def match_product(technology: str) -> str | None:
    """TODO: normalise the name (lowercase, strip punctuation) and map it to a slug using
    data/aliases.json first, then exact slug matches from load_products(). Return None if no match => unverified."""
    raise NotImplementedError


def resolve(product: str, version: str | None) -> Lifecycle:
    """TODO: fetch the product's cycles, pick the cycle matching `version` (e.g. "2.7", or major "8"),
    and fill eol_date / latest_cycle. source_url = f"https://endoflife.date/{product}"."""
    raise NotImplementedError
