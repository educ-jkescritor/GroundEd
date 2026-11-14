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
            citations=[Citation(page=2, snippet="Lab exercises use Python 2.7", bbox=[72, 300, 320, 314])],
            lifecycle=Lifecycle(product="python", cycle="2.7", eol_date="2020-01-01",
                                latest_cycle="3.x", source_url="https://endoflife.date/python"),
            score=Score(total=90, breakdown=[
                ScorePart(key="lifecycle_status", label="Lifecycle status", points=50, max=50, reason="Already end-of-life"),
                ScorePart(key="time_past_eol", label="Time past EOL", points=20, max=20, reason="More than 4 years past EOL"),
                ScorePart(key="version_lag", label="Version lag", points=15, max=15, reason="Major version behind"),
                ScorePart(key="prominence", label="Prominence", points=5, max=15, reason="Mentioned on 1 page"),
            ]),
            upgrade=Upgrade(target_cycle="3.x (latest)", source_url="https://endoflife.date/python"),
        ),
        Finding(
            id="f2", technology="AngularJS", version="1.x", status="eol",
            citations=[Citation(page=3, snippet="Front-end framework: AngularJS 1.x")],
            lifecycle=Lifecycle(product="angularjs", cycle="1.8", eol_date="2021-12-31",
                                source_url="https://endoflife.date/angularjs"),
            score=Score(total=80, breakdown=[
                ScorePart(key="lifecycle_status", label="Lifecycle status", points=50, max=50, reason="Already end-of-life"),
                ScorePart(key="time_past_eol", label="Time past EOL", points=15, max=20, reason="About 3 years past EOL"),
                ScorePart(key="version_lag", label="Version lag", points=0, max=15, reason="No newer cycle of this product"),
                ScorePart(key="prominence", label="Prominence", points=15, max=15, reason="Used in 3 labs"),
            ]),
        ),
        Finding(
            id="f3", technology="React", version=None, status="supported",
            citations=[Citation(page=4, snippet="Final project built with React")],
            lifecycle=Lifecycle(product="react", source_url="https://endoflife.date/react"),
            score=Score(total=0, breakdown=[
                ScorePart(key="lifecycle_status", label="Lifecycle status", points=0, max=50, reason="Supported"),
                ScorePart(key="time_past_eol", label="Time past EOL", points=0, max=20, reason="Not EOL"),
                ScorePart(key="version_lag", label="Version lag", points=0, max=15, reason="No version stated"),
                ScorePart(key="prominence", label="Prominence", points=0, max=15, reason="Not scored when supported"),
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
