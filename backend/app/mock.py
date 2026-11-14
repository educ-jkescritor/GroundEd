"""MOCK DATA for frontend development, until the real pipeline is wired in.
Delete this module once /api/analyze returns real results.

A 5-page sample web-development module that exercises every status, kind and usage the UI supports.
Every citation snippet appears verbatim in its page text (the same rule the real pipeline must follow)."""
from datetime import datetime, timezone

from .models import (
    Analysis, Citation, Finding, Lifecycle, PageText, Sample, Score, ScorePart, SourceInfo, Summary, Upgrade,
)

MOCK_SAMPLES = [
    Sample(id="web-systems", title="Web Systems and Technologies (sample)",
           description="PHP, MySQL and front-end frameworks: a mix of current and legacy tools."),
    Sample(id="database-systems", title="Database Systems (sample)",
           description="SQL and NoSQL course with lab environment requirements."),
    Sample(id="mobile-dev", title="Mobile App Development (sample)",
           description="Android and cross-platform development labs."),
    Sample(id="ged-ethics", title="Ethics in Society (GED sample)",
           description="A general education module, to show what happens outside technology courses."),
]

MOCK_DRAFTS = {
    "f1": "Lab 3: Connect to the database using PDO with prepared statements, and display the results in an HTML table.",
    "f2": "All laboratory exercises use a currently supported PHP 8 release running on a local XAMPP server.",
    "f3": "For interactive pages we introduce a currently supported front-end framework (for example Angular or React).",
    "f4": "Pages are styled with Bootstrap 5 so that layouts adapt to small screens.",
    "f5": "Students install the current Node.js LTS release to run build tools.",
    "f6": "Activity: build the product catalog page using CSS Grid or Flexbox for alignment.",
}


def mock_draft(finding_id: str) -> str:
    return "[MOCK] " + MOCK_DRAFTS.get(finding_id, "Updated wording for this part of the module.")

PAGES = [
    PageText(number=1, text=(
        "Course: Web Systems and Technologies 2 (sample module)\n"
        "This module prepares students to build dynamic, database-driven web applications. "
        "Students may use Dreamweaver CS6 or any code editor for the exercises.")),
    PageText(number=2, text=(
        "Weeks 1 to 3: Server-side programming\n"
        "All laboratory exercises use PHP 5.6 running on a local XAMPP server. Students write PHP scripts "
        "that process HTML forms and validate user input on the server.")),
    PageText(number=3, text=(
        "Weeks 4 and 5: Client-side frameworks\n"
        "For interactive pages we introduce AngularJS 1.x as the front-end framework. "
        "Pages are styled with Bootstrap 3 so that layouts adapt to small screens.")),
    PageText(number=4, text=(
        "Lab 3: Database connectivity\n"
        "Connect to the database using mysql_connect() and display the results in an HTML table. "
        "Activity: build the product catalog page using table-based layouts for alignment.")),
    PageText(number=5, text=(
        "Week 8: Modern tooling preview\n"
        "Students install Node.js 22 to run build tools, and the final project is built with React. "
        "Lab 6 repeats the database exercise with mysql_connect() on PHP 5.6.")),
]


def _score(total: int, priority: str, parts: list[tuple[str, str, int, int, str]]) -> Score:
    return Score(total=total, priority=priority,
                 breakdown=[ScorePart(key=k, label=l, points=p, max=m, reason=r) for k, l, p, m, r in parts])


def mock_analysis(analysis_id: str = "demo", filename: str = "WST2-Module.pdf", kind: str = "sample") -> Analysis:
    findings = [
        Finding(
            id="f1", technology="mysql_connect()", status="eol", kind="practice", usage="lab",
            citations=[Citation(page=4, snippet="Connect to the database using mysql_connect()"),
                       Citation(page=5, snippet="Lab 6 repeats the database exercise with mysql_connect()")],
            lifecycle=Lifecycle(product="php", eol_date="2015-12-03",
                                source_url="https://www.php.net/manual/en/function.mysql-connect.php"),
            score=_score(82, "high", [
                ("lifecycle", "Lifecycle", 40, 40, "Removed in PHP 7.0 (3 Dec 2015)"),
                ("frequency", "Frequency", 12, 30, "Appears on 2 pages (6 points each)"),
                ("labs", "Labs", 20, 20, "Used in Lab 3 (page 4)"),
                ("activities", "Learning activities", 10, 10, "Repeated in the Lab 6 exercise (page 5)"),
            ]),
            upgrade=Upgrade(target_cycle="PDO or mysqli", source_url="https://www.php.net/manual/en/mysqlinfo.api.choosing.php"),
        ),
        Finding(
            id="f2", technology="PHP", version="5.6", status="eol", kind="language", usage="lab",
            citations=[Citation(page=2, snippet="All laboratory exercises use PHP 5.6"),
                       Citation(page=5, snippet="mysql_connect() on PHP 5.6")],
            lifecycle=Lifecycle(product="php", cycle="5.6", eol_date="2018-12-31", latest_cycle="8.x",
                                source_url="https://endoflife.date/php"),
            score=_score(72, "medium", [
                ("lifecycle", "Lifecycle", 40, 40, "Support ended on 31 Dec 2018"),
                ("frequency", "Frequency", 12, 30, "Appears on 2 pages (6 points each)"),
                ("labs", "Labs", 20, 20, "All laboratory exercises (page 2)"),
                ("activities", "Learning activities", 0, 10, "No activity use found"),
            ]),
            upgrade=Upgrade(target_cycle="PHP 8.x (latest supported)", source_url="https://endoflife.date/php"),
        ),
        Finding(
            id="f3", technology="AngularJS", version="1.x", status="eol", kind="framework", usage="mentioned",
            citations=[Citation(page=3, snippet="we introduce AngularJS 1.x as the front-end framework")],
            lifecycle=Lifecycle(product="angularjs", cycle="1.8", eol_date="2021-12-31",
                                source_url="https://endoflife.date/angularjs"),
            score=_score(46, "low", [
                ("lifecycle", "Lifecycle", 40, 40, "Support ended on 31 Dec 2021"),
                ("frequency", "Frequency", 6, 30, "Appears on 1 page"),
                ("labs", "Labs", 0, 20, "No lab use found"),
                ("activities", "Learning activities", 0, 10, "No activity use found"),
            ]),
        ),
        Finding(
            id="f4", technology="Bootstrap", version="3", status="eol", kind="framework", usage="mentioned",
            citations=[Citation(page=3, snippet="Pages are styled with Bootstrap 3")],
            lifecycle=Lifecycle(product="bootstrap", cycle="3", eol_date="2019-07-24", latest_cycle="5",
                                source_url="https://endoflife.date/bootstrap"),
            score=_score(46, "low", [
                ("lifecycle", "Lifecycle", 40, 40, "Support ended on 24 Jul 2019"),
                ("frequency", "Frequency", 6, 30, "Appears on 1 page"),
                ("labs", "Labs", 0, 20, "No lab use found"),
                ("activities", "Learning activities", 0, 10, "No activity use found"),
            ]),
            upgrade=Upgrade(target_cycle="Bootstrap 5", source_url="https://endoflife.date/bootstrap"),
        ),
        Finding(
            id="f5", technology="Node.js", version="22", status="nearing_eol", kind="tool", usage="mentioned",
            citations=[Citation(page=5, snippet="Students install Node.js 22 to run build tools")],
            lifecycle=Lifecycle(product="nodejs", cycle="22", eol_date="2027-04-30", latest_cycle="24",
                                source_url="https://endoflife.date/nodejs"),
            score=_score(26, "low", [
                ("lifecycle", "Lifecycle", 20, 40, "Support ends on 30 Apr 2027"),
                ("frequency", "Frequency", 6, 30, "Appears on 1 page"),
                ("labs", "Labs", 0, 20, "No lab use found"),
                ("activities", "Learning activities", 0, 10, "No activity use found"),
            ]),
            upgrade=Upgrade(target_cycle="Node.js 24 (LTS)", source_url="https://endoflife.date/nodejs"),
        ),
        Finding(
            id="f6", technology="Table-based layouts", status="less_used", kind="practice", usage="activity",
            citations=[Citation(page=4, snippet="build the product catalog page using table-based layouts")],
            lifecycle=Lifecycle(product="html", source_url="https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout"),
            score=_score(16, "low", [
                ("lifecycle", "Lifecycle", 0, 40, "Still supported; industry prefers CSS layout"),
                ("frequency", "Frequency", 6, 30, "Appears on 1 page"),
                ("labs", "Labs", 0, 20, "No lab use found"),
                ("activities", "Learning activities", 10, 10, "Product catalog activity (page 4)"),
            ]),
        ),
        Finding(
            id="f7", technology="React", status="supported", kind="framework", usage="activity",
            citations=[Citation(page=5, snippet="the final project is built with React")],
            lifecycle=Lifecycle(product="react", source_url="https://endoflife.date/react"),
            score=_score(16, "low", [
                ("lifecycle", "Lifecycle", 0, 40, "Currently supported"),
                ("frequency", "Frequency", 6, 30, "Appears on 1 page"),
                ("labs", "Labs", 0, 20, "No lab use found"),
                ("activities", "Learning activities", 10, 10, "Final project (page 5)"),
            ]),
        ),
        Finding(
            id="f8", technology="Dreamweaver CS6", status="unverified", kind="tool", usage="mentioned",
            citations=[Citation(page=1, snippet="Students may use Dreamweaver CS6")],
        ),
    ]
    if analysis_id == "ged-ethics":
        return Analysis(
            id=analysis_id, created_at=datetime.now(timezone.utc),
            source=SourceInfo(kind=kind, filename=filename, pages=1), summary=Summary(), findings=[],
            pages=[PageText(number=1, text=(
                "Module 1: Ethical frameworks\n"
                "Students compare utilitarian and deontological reasoning through case studies."))],
            coverage="not_covered",
        )
    statuses = ("eol", "nearing_eol", "less_used", "supported", "unverified")
    summary = Summary(**{s: sum(f.status == s for f in findings) for s in statuses})
    return Analysis(
        id=analysis_id, created_at=datetime.now(timezone.utc),
        source=SourceInfo(kind=kind, filename=filename, pages=len(PAGES)),
        summary=summary, findings=findings, pages=PAGES,
    )
