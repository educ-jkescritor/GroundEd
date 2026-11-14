"""MOCK DATA for frontend development, until the real pipeline is wired in.
Delete this module once /api/analyze returns real results."""
from datetime import datetime, timezone

from .models import (
    Analysis, Citation, Finding, Lifecycle, Sample, Score, ScorePart, SourceInfo, Summary, Upgrade,
)

MOCK_SAMPLES = [
    Sample(id="intro-web-dev", title="Intro to Web Development (sample)",
           description="First-year web course with a mix of current and legacy tools."),
    Sample(id="database-systems", title="Database Systems (sample)",
           description="SQL and NoSQL course with lab environment requirements."),
]


def mock_analysis(analysis_id: str = "demo", filename: str = "sample.pdf", kind: str = "sample") -> Analysis:
    findings = [
        Finding(
            id="f1", technology="Python", version="2.7", status="eol",
            citations=[Citation(page=2, snippet="Lab exercises use Python 2.7", bbox=[72, 300, 320, 314]),
                       Citation(page=5, snippet="Assignment 3: data processing script in Python 2.7")],
            lifecycle=Lifecycle(product="python", cycle="2.7", eol_date="2020-01-01",
                                latest_cycle="3.x", source_url="https://endoflife.date/python"),
            score=Score(total=82, priority="high", breakdown=[
                ScorePart(key="lifecycle", label="Lifecycle", points=40, max=40, reason="Support ended on 1 Jan 2020"),
                ScorePart(key="frequency", label="Frequency", points=12, max=30, reason="Appears on 2 pages (6 points each)"),
                ScorePart(key="labs", label="Labs", points=20, max=20, reason="Used in lab exercises (page 2)"),
                ScorePart(key="activities", label="Learning activities", points=10, max=10, reason="Used in Assignment 3 (page 5)"),
            ]),
            upgrade=Upgrade(target_cycle="3.x (latest)", source_url="https://endoflife.date/python"),
        ),
        Finding(
            id="f2", technology="AngularJS", version="1.x", status="eol",
            citations=[Citation(page=3, snippet="Front-end framework: AngularJS 1.x")],
            lifecycle=Lifecycle(product="angularjs", cycle="1.8", eol_date="2021-12-31",
                                source_url="https://endoflife.date/angularjs"),
            score=Score(total=58, priority="medium", breakdown=[
                ScorePart(key="lifecycle", label="Lifecycle", points=40, max=40, reason="Support ended on 31 Dec 2021"),
                ScorePart(key="frequency", label="Frequency", points=18, max=30, reason="Appears on 3 pages (6 points each)"),
                ScorePart(key="labs", label="Labs", points=0, max=20, reason="No lab use found"),
                ScorePart(key="activities", label="Learning activities", points=0, max=10, reason="No activity use found"),
            ]),
        ),
        Finding(
            id="f3", technology="React", version=None, status="supported",
            citations=[Citation(page=4, snippet="Final project built with React")],
            lifecycle=Lifecycle(product="react", source_url="https://endoflife.date/react"),
            score=Score(total=6, priority="low", breakdown=[
                ScorePart(key="lifecycle", label="Lifecycle", points=0, max=40, reason="Currently supported"),
                ScorePart(key="frequency", label="Frequency", points=6, max=30, reason="Appears on 1 page"),
                ScorePart(key="labs", label="Labs", points=0, max=20, reason="No lab use found"),
                ScorePart(key="activities", label="Learning activities", points=0, max=10, reason="No activity use found"),
            ]),
        ),
        Finding(
            id="f4", technology="Macromedia Dreamweaver", version=None, status="unverified",
            citations=[Citation(page=1, snippet="Students may use Macromedia Dreamweaver")],
        ),
    ]
    summary = Summary(**{s: sum(f.status == s for f in findings)
                         for s in ("eol", "nearing_eol", "supported", "unverified")})
    return Analysis(
        id=analysis_id, created_at=datetime.now(timezone.utc),
        source=SourceInfo(kind=kind, filename=filename, pages=5),
        summary=summary, findings=findings,
    )
