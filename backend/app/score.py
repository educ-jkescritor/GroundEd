"""Transparent 100-point priority score. Deterministic, no LLM. Weights live in config.SCORE_WEIGHTS."""
from datetime import date

from .config import SCORE_WEIGHTS
from .models import Lifecycle, Score, ScorePart


def compute(lifecycle: Lifecycle, cycles_behind: int, pages_mentioned: int, today: date | None = None) -> Score:
    """TODO: implement per docs/design-brief.md section 5.2 (weights in config.SCORE_WEIGHTS):
    - lifecycle: 0-40 from the support stage (EOL = 40)
    - frequency: 6 points per page where the item's exact wording appears, max 30
    - labs: 0 or 20 (AI label + quote that code verifies exists in the module)
    - activities: 0 or 10 (same check)
    Set Score.priority from config.PRIORITY_THRESHOLDS (high >= 80, medium >= 50, else low).
    Each ScorePart.reason must be a plain sentence a professor can read."""
    raise NotImplementedError


__all__ = ["compute", "SCORE_WEIGHTS", "ScorePart"]
