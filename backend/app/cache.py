"""Provenance cache: same file + registry + pipeline + detector + date => return the stored analysis.
Separate table in the same SQLite file as db.py, so db.py stays untouched."""
from __future__ import annotations

import hashlib
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta, timezone
from typing import Optional

from . import config, db
from .models import Analysis


def key(*parts: str) -> str:
    return hashlib.sha256("|".join(parts).encode()).hexdigest()


def _connect() -> sqlite3.Connection:
    config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(config.DB_PATH)
    conn.execute("CREATE TABLE IF NOT EXISTS analysis_cache (key TEXT PRIMARY KEY, analysis_id TEXT NOT NULL)")
    conn.execute("CREATE TABLE IF NOT EXISTS draft_cache (key TEXT PRIMARY KEY, text TEXT NOT NULL, model TEXT NOT NULL, "
                 "created_at TEXT NOT NULL DEFAULT (datetime('now')))")
    return conn


def get(cache_key: str) -> Optional[Analysis]:
    with closing(_connect()) as conn:
        row = conn.execute("SELECT analysis_id FROM analysis_cache WHERE key = ?", (cache_key,)).fetchone()
    return db.get_analysis(row[0]) if row else None


def put(cache_key: str, analysis: Analysis) -> None:
    db.init_db()
    db.save_analysis(analysis)
    with closing(_connect()) as conn, conn:
        conn.execute("INSERT OR REPLACE INTO analysis_cache (key, analysis_id) VALUES (?, ?)", (cache_key, analysis.id))


def get_draft(cache_key: str) -> Optional[tuple[str, str]]:
    with closing(_connect()) as conn:
        row = conn.execute("SELECT text, model FROM draft_cache WHERE key = ?", (cache_key,)).fetchone()
    return (row[0], row[1]) if row else None


def put_draft(cache_key: str, text: str, model: str) -> None:
    with closing(_connect()) as conn, conn:
        conn.execute("INSERT OR REPLACE INTO draft_cache (key, text, model) VALUES (?, ?, ?)", (cache_key, text, model))


def purge_expired(hours: int | None = None) -> int:
    """Delete reports (they contain module quotes) and drafts older than UPLOAD_RETENTION_HOURS. Returns rows removed."""
    hours = config.UPLOAD_RETENTION_HOURS if hours is None else hours
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    db.init_db()
    with closing(_connect()) as conn, conn:
        n = conn.execute("DELETE FROM analyses WHERE created_at < ?", (cutoff.isoformat(),)).rowcount
        conn.execute("DELETE FROM analysis_cache WHERE analysis_id NOT IN (SELECT id FROM analyses)")
        n += conn.execute("DELETE FROM draft_cache WHERE created_at < ?", (cutoff.strftime("%Y-%m-%d %H:%M:%S"),)).rowcount
    return n
