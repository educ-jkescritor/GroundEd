"""SQLite storage for analyses and feedback. Working minimal implementation."""
import json
import sqlite3
from contextlib import closing
from typing import Optional

from . import config
from .models import Analysis, FeedbackIn


def _connect() -> sqlite3.Connection:
    config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(config.DB_PATH)


def init_db() -> None:
    with closing(_connect()) as conn, conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                data TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                role TEXT NOT NULL,
                country TEXT NOT NULL,
                institution TEXT,
                rating INTEGER NOT NULL,
                comments TEXT,
                analysis_id TEXT,
                would_use TEXT,
                consent_to_quote INTEGER NOT NULL DEFAULT 0
            );
            """
        )
        # Add columns introduced after the first version to databases that already exist.
        existing = {row[1] for row in conn.execute("PRAGMA table_info(feedback)")}
        for column, ddl in (("would_use", "TEXT"), ("consent_to_quote", "INTEGER NOT NULL DEFAULT 0")):
            if column not in existing:
                conn.execute(f"ALTER TABLE feedback ADD COLUMN {column} {ddl}")


def save_analysis(analysis: Analysis) -> None:
    with closing(_connect()) as conn, conn:
        conn.execute(
            "INSERT OR REPLACE INTO analyses (id, created_at, data) VALUES (?, ?, ?)",
            (analysis.id, analysis.created_at.isoformat(), analysis.model_dump_json()),
        )


def get_analysis(analysis_id: str) -> Optional[Analysis]:
    with closing(_connect()) as conn:
        row = conn.execute("SELECT data FROM analyses WHERE id = ?", (analysis_id,)).fetchone()
    return Analysis.model_validate(json.loads(row[0])) if row else None


def save_feedback(fb: FeedbackIn) -> int:
    with closing(_connect()) as conn, conn:
        cur = conn.execute(
            "INSERT INTO feedback (role, country, institution, rating, comments, would_use, consent_to_quote, analysis_id) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (fb.role, fb.country, fb.institution, fb.rating, fb.comments, fb.would_use,
             int(fb.consent_to_quote), fb.analysis_id),
        )
        return int(cur.lastrowid)
