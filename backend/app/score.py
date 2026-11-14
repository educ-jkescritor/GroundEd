"""Transparent 100-point priority score. Deterministic, no LLM. Weights live in config.SCORE_WEIGHTS."""
from datetime import date

from .config import SCORE_WEIGHTS
from .models import Lifecycle, Score, ScorePart


def compute(lifecycle: Lifecycle, cycles_behind: int, pages_mentioned: int, today: date | None = None) -> Score:
    """TODO: implement per README "Priority score":
    - lifecycle_status: EOL already = 50, EOL <=12 months = 35, <=24 months = 15, else 0
    - time_past_eol: 5 per full year past EOL, capped at 20
    - version_lag: 5 per major cycle behind latest, capped at 15
    - prominence: e.g. 5 per page mentioned, capped at 15
    Each ScorePart.reason must be a plain sentence a professor can read."""
    raise NotImplementedError


__all__ = ["compute", "SCORE_WEIGHTS", "ScorePart"]
