"""Track A: version-aware product entries (endoflife.date snapshot). Offline.

Each case: text as a module might write it -> expected finding id (or None = must NOT produce a finding).
"""
from datetime import date

import pymupdf
import pytest

from app import eol, registry
from app.pipeline import analyze

TODAY = date(2026, 11, 14)

CASES = [
    # outdated versions -> finding
    ("Install PHP 5.6 with XAMPP", "php-5.6"),
    ("Requires PHP5 or later", "php-5.6"),               # major only -> newest 5.x
    ("Tested on PHP 5.6.40", "php-5.6"),                 # patch dropped
    ("Use Python 2.7 for the scripts", "python-2.7"),
    ("Node.js 12 and npm", "nodejs-12"),
    ("This lab uses AngularJS for the front end", "angularjs"),
    ("Angular 1.x controllers", "angularjs"),
    ("Upgrade to Vue 2 components", "vue-2.7"),
    ("Include jQuery 1.12.4 from the CDN", "jquery-1"),
    ("Responsive grid with Bootstrap 3 css classes", "bootstrap-3"),
    ("Laravel 5.8 routing", "laravel-5.8"),
    ("Django 1.11 models", "django-1.11"),
    ("Database: MySQL 5.7", "mysql-5.7"),
    ("PostgreSQL 9.6 server", "postgresql-9.6"),
    ("Microsoft SQL Server 2012 Express", "mssqlserver-11.0-sp4"),
    ("Apache 2.2 with mod_php", "apache-http-server-2.2"),
    ("Students need Mac OS X 10.7 or later", "macos-10.7"),
    ("Ubuntu 16.04 virtual machine", "ubuntu-16.04"),
    ("Test the page in IE 8", "internet-explorer-8"),
    ("Windows 10 lab computers", "windows-10"),
    # must NOT produce a finding
    ("Install PHP 8.4 with Composer", None),             # supported
    ("Python 3 is required", None),                      # newest 3.x is supported
    ("PHP 6 (2007 not yet released)", None),             # history line + not a real release
    ("1997 (PHP 2.0)", None),                            # history line
    ("PHP 5 (July 13, 2004)", None),                     # history line
    ("ISO-8601 day of the week (added in PHP 5.1.0)", None),   # changelog note
    ("Beginning PHP and MySQL 3rd Edition", None),       # '3rd' is not a version
    ("quotes and the dot character PHP\n1. Strings", None),    # version on the next line
    ("Bootstrap 3 nodes in the cluster", None),          # no CSS/HTML context
    ("Express 4 ideas in one sentence", None),           # no Node.js context
    ("Use React 16 hooks", None),                        # no lifecycle data for React: no claim
]


def _pdf(tmp_path, text):
    p = tmp_path / "m.pdf"
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_textbox(pymupdf.Rect(50, 50, 550, 800), text + "\n" + "filler text " * 5, fontsize=11)
    doc.save(p)
    return p


@pytest.mark.parametrize("text, expected", CASES)
def test_product_versions(tmp_path, text, expected):
    a = analyze(_pdf(tmp_path, text), "m.pdf", today=TODAY, use_cache=False)
    ids = {f.id for f in a.findings}
    if expected is None:
        assert ids == set(), f"false alarm for {text!r}: {ids}"
    else:
        assert expected in ids, f"missed {expected} in {text!r}: {ids}"
        f = next(x for x in a.findings if x.id == expected)
        assert f.lifecycle.source_name == "endoflife.date" and f.score and f.citations


def test_resolve_version_rules():
    php = eol.get_product("php")
    assert eol.resolve_version(php, "5.6").name == "5.6"
    assert eol.resolve_version(php, "5.6.40").name == "5.6"
    assert eol.resolve_version(php, "5").name == "5.6"
    assert eol.resolve_version(php, "6") is None
    assert eol.resolve_version(eol.get_product("jquery"), "1.12.4").name == "1"
    assert eol.resolve_version(eol.get_product("laravel"), "5.4") is None  # never guessed as 5.5
    ms = eol.get_product("mssqlserver")
    entry = next(e for e in registry.load().entries if e.id == "mssqlserver")
    assert eol.resolve_version(ms, "2008 R2", entry.eol.versions).name == "10.50-sp3"


def test_every_product_entry_has_a_lifecycle_snapshot_and_a_valid_default():
    for e in registry.load().entries:
        if e.eol:
            data = eol.get_product(e.eol.product)
            assert data.origin == "snapshot"
            if e.eol.cycle:
                assert eol.resolve_version(data, e.eol.cycle, e.eol.versions), f"{e.id}: default cycle not found"
            for written, release in e.eol.versions.items():
                assert eol.find_release(data, release), f"{e.id}: {written} -> {release} not a release"


def test_coverage_map_matches_the_registry():
    """The written coverage map and the registry must not drift apart."""
    import yaml
    from app.config import BASE_DIR
    cov = yaml.safe_load((BASE_DIR / "library" / "coverage.yaml").read_text())
    covered = {p for c in cov["categories"].values() for p in c["covered"]}
    ids = {e.id for e in registry.load().entries}
    assert covered - ids == set(), f"coverage map lists items with no registry entry: {covered - ids}"
    assert ids - covered == set(), f"registry entries missing from the coverage map: {ids - covered}"
