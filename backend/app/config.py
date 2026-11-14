"""Central settings. Everything tunable lives here so it is easy to find and document."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SAMPLES_DIR = DATA_DIR / "samples"
CACHE_DIR = DATA_DIR / "cache"
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = Path(os.getenv("DB_PATH", DATA_DIR / "grounded.db"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")  # TODO: confirm current free-tier model name

EOL_API_BASE = os.getenv("EOL_API_BASE", "https://endoflife.date/api")
EOL_CACHE_HOURS = int(os.getenv("EOL_CACHE_HOURS", "24"))

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
UPLOAD_RETENTION_HOURS = int(os.getenv("UPLOAD_RETENTION_HOURS", "24"))

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

# Transparent 100-point priority score (docs/design-brief.md section 5.2, initial defaults; to be refined).
# Keep in sync with README "Priority score" and frontend/src/pages/Landing.tsx.
SCORE_WEIGHTS = {
    "lifecycle": 40,    # registry / endoflife.date support stage
    "frequency": 30,    # 6 points per page where the item's wording appears, max 30
    "labs": 20,         # 0 or 20: used in a lab (AI label + code-verified quote)
    "activities": 10,   # 0 or 10: used in a learning activity (same check)
}
PRIORITY_THRESHOLDS = {"high": 80, "medium": 50}  # else "low"
