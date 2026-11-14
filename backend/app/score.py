"""Transparent 100-point priority score (Option C). Deterministic, no LLM. Weights live in config.

  Lifecycle 0-40   how outdated it is (ended/removed > deprecated > ends soon)
  Teaching  0-30   how it is taught: in code students write > explained > only listed
  Frequency 0-20   pages where it appears
  Hands-on  0-10   appears on a lab / exercise / activity page
Supported items are not scored. Priority: high >= 80, medium >= 50, else low.

Status rules (also code-only):
- eol_date <= analysis date            -> "eol"
- registry stage "deprecated"          -> "nearing_eol" (vendor announced future removal)
- eol_date within NEARING_EOL_MONTHS    -> "nearing_eol"
- otherwise                             -> "supported"
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from .config import (FREQUENCY_POINTS_PER_PAGE, LIFECYCLE_POINTS, NEARING_EOL_MONTHS, PRIORITY_THRESHOLDS,
                     SCORE_WEIGHTS, TEACHING_POINTS)
from .models import Score, ScorePart
from .signals import Depth


def _months_until(d: date, today: date) -> int:
    return (d.year - today.year) * 12 + (d.month - today.month) - (1 if d.day < today.day else 0)


def _full_years(start: date, end: date) -> int:
    return end.year - start.year - ((end.month, end.day) < (start.month, start.day))


def _plural(n: int, word: str) -> str:
    return f"{n} {word}{'' if n == 1 else 's'}"


def status_for(eol_date: Optional[str], deprecated: bool, today: date) -> str:
    if eol_date and date.fromisoformat(eol_date) <= today:
        return "eol"
    if deprecated:
        return "nearing_eol"
    if eol_date and _months_until(date.fromisoformat(eol_date), today) <= NEARING_EOL_MONTHS:
        return "nearing_eol"
    return "supported"


def priority_for(total: int) -> str:
    return "high" if total >= PRIORITY_THRESHOLDS["high"] else "medium" if total >= PRIORITY_THRESHOLDS["medium"] else "low"


def _lifecycle(eol_date: Optional[str], deprecated: bool, today: date) -> tuple[int, str]:
    eol = date.fromisoformat(eol_date) if eol_date else None
    if eol and eol <= today:
        yrs = _full_years(eol, today)
        ago = f"{_plural(yrs, 'year')} ago" if yrs else "less than a year ago"
        return LIFECYCLE_POINTS["eol"], f"Support ended or feature removed on {eol.isoformat()} ({ago})."
    if deprecated:
        return LIFECYCLE_POINTS["deprecated"], "Deprecated by the vendor; removal announced for a future version."
    if eol and (m := _months_until(eol, today)) <= 12:
        return LIFECYCLE_POINTS["eol_within_12m"], f"Support ends on {eol.isoformat()} (within {_plural(m, 'month')})."
    if eol and _months_until(eol, today) <= 24:
        return LIFECYCLE_POINTS["eol_within_24m"], f"Support ends on {eol.isoformat()} (within 24 months)."
    return 0, "Supported."


_TEACHING_REASON = {
    "code": "Used in code that students write or copy.",
    "explained": "Explained in the module text.",
    "listed": "Only listed or mentioned.",
}


def compute(eol_date: Optional[str], deprecated: bool, depth: Depth, pages_mentioned: int, hands_on: bool,
            today: date) -> Optional[Score]:
    """Returns None for supported items: they are not scored and get no priority."""
    if status_for(eol_date, deprecated, today) == "supported":
        return None
    W = SCORE_WEIGHTS
    lc_pts, lc_why = _lifecycle(eol_date, deprecated, today)
    freq = min(W["frequency"], FREQUENCY_POINTS_PER_PAGE * pages_mentioned)
    parts = [
        ScorePart(key="lifecycle", label="Lifecycle", points=lc_pts, max=W["lifecycle"], reason=lc_why),
        ScorePart(key="teaching", label="How it is taught", points=TEACHING_POINTS[depth], max=W["teaching"],
                  reason=_TEACHING_REASON[depth]),
        ScorePart(key="frequency", label="Frequency", points=freq, max=W["frequency"],
                  reason=f"Appears on {_plural(pages_mentioned, 'page')} ({FREQUENCY_POINTS_PER_PAGE} points each, "
                         f"max {W['frequency']})."),
        ScorePart(key="hands_on", label="Hands-on", points=W["hands_on"] if hands_on else 0, max=W["hands_on"],
                  reason="Appears on a lab, exercise or activity page." if hands_on
                  else "No lab, exercise or activity page found."),
    ]
    total = sum(p.points for p in parts)
    return Score(total=total, priority=priority_for(total), breakdown=parts)
