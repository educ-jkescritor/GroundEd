"""Central settings. Everything tunable lives here so it is easy to find and document."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Local dev: read backend/.env (Docker passes the same file via env_file). Real env vars win.
from dotenv import load_dotenv  # noqa: E402

load_dotenv(BASE_DIR / ".env", override=False)
DATA_DIR = BASE_DIR / "data"
SAMPLES_DIR = DATA_DIR / "samples"
CACHE_DIR = DATA_DIR / "cache"
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = Path(os.getenv("DB_PATH", DATA_DIR / "grounded.db"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")  # pinned: answered reliably in tests 2026-11-14 (3.7/3.8 were overloaded)
GEMINI_FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.5-flash-lite")  # one fallback only

EOL_API_BASE = os.getenv("EOL_API_BASE", "https://endoflife.date/api/v1")
EOL_CACHE_HOURS = int(os.getenv("EOL_CACHE_HOURS", "24"))
# "snapshot" (default): committed library/snapshot/eol data — reproducible, offline. "live": API first.
EOL_SOURCE = os.getenv("EOL_SOURCE", "snapshot")

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
MAX_PAGES = int(os.getenv("MAX_PAGES", "300"))  # longer PDFs are rejected with a clear message
ANALYSIS_TIMEOUT_SECONDS = int(os.getenv("ANALYSIS_TIMEOUT_SECONDS", "90"))
MAX_CONCURRENT_ANALYSES = int(os.getenv("MAX_CONCURRENT_ANALYSES", "3"))  # CPU-bound; sized for 2 vCPU
ANALYSIS_QUEUE_SECONDS = int(os.getenv("ANALYSIS_QUEUE_SECONDS", "15"))  # wait for a free slot, then 429 "busy"
DRAFTS_PER_MINUTE_PER_CLIENT = int(os.getenv("DRAFTS_PER_MINUTE_PER_CLIENT", "5"))  # Gemini calls, not cache hits
DRAFTS_PER_DAY = int(os.getenv("DRAFTS_PER_DAY", "300"))  # whole server; protects the API credit
UPLOAD_RETENTION_HOURS = int(os.getenv("UPLOAD_RETENTION_HOURS", "24"))

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

# Transparent 100-point priority score — Option C (stress-tested 2026-11-14). Fixed rules in code, never AI.
# Keep in sync with README "Priority score". Teaching signals (code / lab patterns) live in rules/teaching.yaml.
SCORE_WEIGHTS = {
    "lifecycle": 40,   # how outdated: see LIFECYCLE_POINTS
    "teaching": 30,    # how it is taught: see TEACHING_POINTS
    "frequency": 20,   # FREQUENCY_POINTS_PER_PAGE per page where it appears, capped
    "hands_on": 10,    # appears on a lab / exercise / activity page
}
LIFECYCLE_POINTS = {"eol": 40, "deprecated": 25, "eol_within_12m": 20, "eol_within_24m": 10}
TEACHING_POINTS = {"code": 30, "explained": 15, "listed": 5}
FREQUENCY_POINTS_PER_PAGE = 4
PRIORITY_THRESHOLDS = {"high": 80, "medium": 50}  # else "low"
NEARING_EOL_MONTHS = 12  # supported items whose EOL is this close get status "nearing_eol"
