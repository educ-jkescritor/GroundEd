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

# Transparent 100-point priority score. Keep in sync with README "Priority score".
SCORE_WEIGHTS = {
    "lifecycle_status": 50,  # EOL already = 50, EOL <=12 months = 35, <=24 months = 15, supported = 0
    "time_past_eol": 20,     # +5 per full year past EOL, capped
    "version_lag": 15,       # +5 per major cycle behind latest supported, capped
    "prominence": 15,        # how often / how centrally the syllabus uses it
}
