"""Transparent 100-point priority score. Deterministic, no LLM. Weights live in config.

Status rules (also code-only):
- eol_date <= analysis date            -> "eol"
- registry stage "deprecated"          -> "nearing_eol" (vendor announced future removal)
- eol_date within NEARING_EOL_MONTHS    -> "nearing_eol"
- otherwise                             -> "supported"
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from .config import DEPRECATED_LIFECYCLE_POINTS, NEARING_EOL_MONTHS, PROMINENCE_POINTS_PER_PAGE, SCORE_WEIGHTS
from .models import Score, ScorePart


def _months_until(d: date, today: date) -> int:
    return (d.year - today.year) * 12 + (d.month - today.month) - (1 if d.day < today.day else 0)


def _full_years(start: date, end: date) -> int:
    return end.year - start.year - ((end.month, end.day) < (start.month, start.day))


def status_for(eol_date: Optional[str], deprecated: bool, today: date) -> str:
    if eol_date and date.fromisoformat(eol_date) <= today:
        return "eol"
    if deprecated:
        return "nearing_eol"
    if eol_date and _months_until(date.fromisoformat(eol_date), today) <= NEARING_EOL_MONTHS:
        return "nearing_eol"
    return "supported"


def compute(eol_date: Optional[str], deprecated: bool, cycles_behind: Optional[int], pages_mentioned: int,
            today: date) -> Score:
    W = SCORE_WEIGHTS
    parts: list[ScorePart] = []

    # 1. Lifecycle status
    eol = date.fromisoformat(eol_date) if eol_date else None
    if eol and eol <= today:
        pts, why = W["lifecycle_status"], "Already end-of-life / removed."
    elif deprecated:
        pts, why = DEPRECATED_LIFECYCLE_POINTS, "Deprecated by the vendor; removal announced for a future version."
    elif eol and (m := _months_until(eol, today)) <= 12:
        pts, why = 35, f"Support ends within 12 months ({m} months left)."
    elif eol and _months_until(eol, today) <= 24:
        pts, why = 15, "Support ends within 24 months."
    else:
        pts, why = 0, "Supported; no end-of-life within 24 months."
    parts.append(ScorePart(key="lifecycle_status", label="Lifecycle status", points=pts,
                           max=W["lifecycle_status"], reason=why))

    # 2. Time past EOL
    if eol and eol <= today:
        yrs = _full_years(eol, today)
        pts = min(W["time_past_eol"], 5 * yrs)
        why = f"{yrs} full year{'s' if yrs != 1 else ''} past end-of-life."
    else:
        pts, why = 0, "Not past end-of-life."
    parts.append(ScorePart(key="time_past_eol", label="Time past EOL", points=pts, max=W["time_past_eol"], reason=why))

    # 3. Version lag
    if cycles_behind is None:
        pts, why = 0, "Not applicable: this is a feature, not a product version."
    else:
        pts = min(W["version_lag"], 5 * cycles_behind)
        why = (f"{cycles_behind} newer major version{'s' if cycles_behind != 1 else ''} available."
               if cycles_behind else "No newer major version.")
    parts.append(ScorePart(key="version_lag", label="Version lag", points=pts, max=W["version_lag"], reason=why))

    # 4. Prominence
    pts = min(W["prominence"], PROMINENCE_POINTS_PER_PAGE * pages_mentioned)
    parts.append(ScorePart(key="prominence", label="Prominence", points=pts, max=W["prominence"],
                           reason=f"Appears on {pages_mentioned} page{'s' if pages_mentioned != 1 else ''}."))

    return Score(total=sum(p.points for p in parts), breakdown=parts)
