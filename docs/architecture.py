"""Generate the GroundEd high-level architecture diagram as SVG + PNG.

Usage:  python docs/architecture.py docs/architecture.png   (requires PyMuPDF; also writes the .svg)
"""
import sys
from pathlib import Path
from xml.sax.saxutils import escape

W, H = 2000, 1290
FONT = "Helvetica, Arial, sans-serif"

C = {
    "ink": "#17213a", "muted": "#4f5a6e", "line": "#64748b", "bg": "#ffffff",
    "code": "#0f766e", "code_bg": "#ccfbf1",
    "ai": "#6941c6", "ai_bg": "#f4f3ff",
    "data": "#b45309", "data_bg": "#fef3c7",
    "ext": "#475569", "ext_bg": "#f1f5f9",
    "ui": "#2b55a6", "ui_bg": "#dce6f6",
    "qa": "#b42318", "qa_bg": "#fef3f2",
    "group_bg": "#f4f5f8", "group_line": "#cbd5e1",
}

out: list[str] = []


def rect(x, y, w, h, fill, stroke, rx=10, sw=2, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" ry="{rx}" '
               f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>')


def text(x, y, s, size=14, color=None, weight="normal", anchor="start"):
    out.append(f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" '
               f'font-weight="{weight}" fill="{color or C["ink"]}" text-anchor="{anchor}">{escape(s)}</text>')


def lines(x, y, items, size=13, color=None, gap=18, anchor="start"):
    for i, s in enumerate(items):
        text(x, y + i * gap, s, size=size, color=color or C["muted"], anchor=anchor)


def chip(x, y, label, color):
    w = 9 * len(label) + 14
    rect(x, y, w, 20, color, color, rx=10, sw=0)
    text(x + w / 2, y + 14, label, size=11, color="#ffffff", weight="bold", anchor="middle")
    return w


def arrow(x1, y1, x2, y2, color=None, label=None, lx=None, ly=None, both=False, sw=2.2):
    color = color or C["line"]
    out.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{sw}"/>')

    def head(xa, ya, xb, yb):
        import math
        ang = math.atan2(yb - ya, xb - xa)
        L, Wd = 11, 6
        bx, by = xb - L * math.cos(ang), yb - L * math.sin(ang)
        px, py = -math.sin(ang) * Wd, math.cos(ang) * Wd
        out.append(f'<polygon points="{xb},{yb} {bx+px},{by+py} {bx-px},{by-py}" fill="{color}"/>')

    head(x1, y1, x2, y2)
    if both:
        head(x2, y2, x1, y1)
    if label:
        text(lx if lx is not None else (x1 + x2) / 2 + 8, ly if ly is not None else (y1 + y2) / 2,
             label, size=12, color=color, weight="bold")


def group(x, y, w, h, title, color, subtitle=None):
    rect(x, y, w, h, C["group_bg"], C["group_line"], rx=14, sw=1.5)
    text(x + 18, y + 28, title, size=16, color=color, weight="bold")
    if subtitle:
        text(x + w - 18, y + 28, subtitle, size=13, color=C["muted"], anchor="end")


def box(x, y, w, h, title, items, fg, bg, chips=(), title_size=15):
    rect(x, y, w, h, bg, fg)
    text(x + 14, y + 26, title, size=title_size, color=fg, weight="bold")
    lines(x + 14, y + 48, items)
    cx = x + 14
    for label, col in chips:
        cx += chip(cx, y + h - 30, label, col) + 6


# ---------------------------------------------------------------- canvas
out.append(f'<rect x="0" y="0" width="{W}" height="{H}" fill="{C["bg"]}"/>')
text(60, 52, "GroundEd — System Architecture & Grounding Pipeline", size=30, weight="bold")
text(60, 82, "Source-backed curriculum review · Facts Registry + SQLite FTS5 RAG + Deterministic 100-pt Scoring · Hosted on Vultr Cloud Compute",
     size=16, color=C["muted"])

# ---------------------------------------------------------------- row A: users + frontend
box(60, 115, 250, 105, "Faculty / Reviewer", [
    "Uploads module PDF or sample",
    "Inspects PDF highlight + source",
    "Decides: Update · Keep · Dismiss",
], C["ui"], C["ui_bg"])
box(360, 115, 1140, 105, "Frontend SPA  ·  React 18 + Vite + TypeScript + Tailwind CSS v4 + PDF.js", [
    "Side-by-side Report Workspace: interactive PDF.js viewer with bbox highlights (left) + ranked findings & priority filters (right)",
    "Clickable module quotes & official source cards  ·  Optional editable AI draft  ·  Turnitin-style multi-page PDF & Markdown export",
], C["ui"], C["ui_bg"])
arrow(310, 167, 360, 167, C["ui"])

# ---------------------------------------------------------------- row B: Caddy + FastAPI
box(60, 260, 1440, 72, "Caddy 2 Reverse Proxy (Auto-HTTPS)  →  FastAPI Backend (Python 3.12 + Pydantic v2)", [
    "POST /api/analyze (%PDF & size check, concurrency semaphore)  ·  GET /api/samples  ·  GET /api/analysis/{id}  ·  POST /draft (rate-limited)  ·  POST /api/feedback",
], C["code"], C["code_bg"])
arrow(925, 220, 925, 260, C["ui"], both=True, label="HTTPS / JSON", lx=935, ly=246)

# ---------------------------------------------------------------- row C: deterministic pipeline
group(60, 370, 1440, 262, "Deterministic Grounding & RAG Pipeline (pipeline.py)", C["code"],
      "(code finds, verifies, retrieves, and scores; AI never decides facts or scores)")
arrow(780, 332, 780, 370, C["code"], label="run pipeline", lx=790, ly=358)

steps = [
    ("1  Read PDF", ["PyMuPDF (pdf.py)", "Per-page text + words", "Strip repeated headers", "Exact snippet bboxes"],
     [("CODE", C["code"])]),
    ("2  Detect Mentions", ["Registry regexes (detect.py)", "37 versioned products", "Filter history/changelogs", "Verify verbatim quote"],
     [("CODE", C["code"])]),
    ("3  Verify Evidence", ["Facts Registry (registry.py)", "endoflife.date (eol.py)", "Confirm quote in doc", "No source → Unverified"],
     [("CODE", C["code"])]),
    ("4  Source RAG", ["SQLite FTS5 (library.py)", "BM25 passage search", "• Fact context passage", "• Replacement passage"],
     [("CODE", C["code"])]),
    ("5  Rule Scoring", ["Option C (score.py, 0–100)", "Lifecycle          0–40", "How taught      0–30", "Freq 0–20 · Lab 0/10"],
     [("CODE", C["code"])]),
    ("6  Optional Draft", ["On faculty click only", "Gemini (llm.py, temp 0)", "Uses verified quote+fact", "Badged 'AI suggestion'"],
     [("AI", C["ai"])]),
]
sx, sy, sw_, sh, gap = 80, 412, 207, 160, 31
for i, (title, items, chips) in enumerate(steps):
    x = sx + i * (sw_ + gap)
    is_ai_only = chips == [("AI", C["ai"])]
    box(x, sy, sw_, sh, title, items, C["ai"] if is_ai_only else C["code"],
        C["ai_bg"] if is_ai_only else "#ffffff", chips=chips, title_size=14)
    if i < len(steps) - 1:
        arrow(x + sw_, sy + sh / 2, x + sw_ + gap, sy + sh / 2, C["code"])

rect(80, 584, 1400, 36, "#ffffff", C["group_line"], rx=8, sw=1.2)
text(96, 607, "Cryptographic Provenance Stamp:  file_sha256 · registry_version · library_version · rules_version · pipeline_version · "
     "analysis_date   →   same PDF = same score", size=13, color=C["ink"], weight="bold")

# ---------------------------------------------------------------- row D: data & knowledge layer
group(60, 672, 1440, 196, "Knowledge Base & Persistence Layer", C["data"],
      "Committed YAML & JSON snapshots in Git  ·  SQLite (WAL mode + FTS5 index) on Docker volume")
data_boxes = [
    ("Facts Registry", ["backend/registry/*.yaml", "Deprecated functions,", "tags, settings, quotes,", "upgrade targets & URLs"]),
    ("Lifecycle Snapshot", ["library/snapshot/eol/", "37 products synced from", "endoflife.date v1 API:", "release cycles & EOL"]),
    ("Source Library (RAG)", ["library/snapshot/*.json", "Curated official docs:", "php.net, MDN, MySQL,", "Microsoft Docs + FTS5"]),
    ("SQLite Store (WAL)", ["Analyses & provenance,", "24h deterministic cache,", "AI draft cache,", "faculty feedback"]),
    ("Teaching & Scope Rules", ["rules/teaching.yaml", "rules/mentions.yaml", "library/coverage.yaml", "Code > explained > listed"]),
]
dx, dy, dw, dh, dgap = 80, 712, 264, 140, 20
data_x = []
for i, (title, items) in enumerate(data_boxes):
    x = dx + i * (dw + dgap)
    data_x.append(x)
    box(x, dy, dw, dh, title, items, C["data"], C["data_bg"])

# pipeline <-> data arrows (non-crossing, aligned under steps 3, 4, 5)
arrow(560, 632, 325, 712, C["data"], label="verify fact", lx=410, ly=666)
arrow(660, 632, 550, 712, C["data"], label="resolve EOL", lx=615, ly=666)
arrow(895, 632, 820, 712, C["data"], label="FTS5 BM25", lx=870, ly=666)
arrow(1120, 632, 1070, 712, C["data"], label="save + cache", lx=1108, ly=666)
arrow(1210, 632, 1320, 712, C["data"], label="load rules", lx=1280, ly=666)

# ---------------------------------------------------------------- row E: ingestion + quality
group(60, 908, 720, 252, "Offline Knowledge Ingestion (app.cli)", C["data"], "(versioned in Git, deterministic at runtime)")
box(80, 948, 330, 196, "Registry & Coverage Rules", [
    "YAML facts & version patterns in Git",
    "Every quote verified in snapshot doc",
    "coverage.yaml enforces product parity",
    "Adding a subject = data only, no code",
], C["data"], "#ffffff", chips=[("CODE", C["code"])])
box(430, 948, 330, 196, "Source Library Builder", [
    "sources.yaml → python -m app.cli library",
    "Fetches & cleans official documentation",
    "Snapshots 37 endoflife.date products",
    "Flags unreachable URLs (never guesses)",
], C["data"], "#ffffff", chips=[("CODE", C["code"])])
arrow(300, 948, 300, 852, C["data"], label="load", lx=310, ly=905)
arrow(600, 948, 600, 852, C["data"], label="index", lx=610, ly=905)

group(800, 908, 700, 252, "Quality & Evaluation Harness", C["qa"], "(runs on every commit)")
box(820, 948, 320, 196, "Golden Test Set & Samples", [
    "testset/expected.yaml + sample PDFs",
    "Legacy PHP lab · Modern PHP lab",
    "228-page Web Development module",
    "Verifies zero false alarms on modern code",
], C["qa"], C["qa_bg"])
box(1160, 948, 320, 196, "Automated Verification", [
    "74 pytest unit & integration tests",
    "Every registry quote checked in doc",
    "Citation bbox & snippet accuracy",
    "100% score reproducibility across runs",
], C["qa"], C["qa_bg"])
arrow(1140, 1046, 1160, 1046, C["qa"])
arrow(data_x[3] + 132, 852, 1300, 948, C["qa"], label="verify pipeline", lx=1310, ly=905)

# ---------------------------------------------------------------- external & deployment column
group(1540, 260, 400, 608, "Cloud & External Services", C["ext"])
ext = [
    ("Vultr Cloud Compute (Singapore)", [
        "Ubuntu 24.04 LTS (vc2-2c-4gb)",
        "Docker Compose: web (Caddy 2) +",
        "backend (FastAPI non-root container)",
        "Auto-HTTPS via Let's Encrypt",
    ]),
    ("Google Gemini API (llm.py)", [
        "gemini-2.5-flash (+ fallback model)",
        "Called ONLY for optional rewrite drafts",
        "Receives only verified quote & fact",
        "Cached in SQLite + rate-limited",
    ]),
    ("endoflife.date API (v1)", [
        "Upstream release & EOL schedules",
        "Committed offline snapshot in repo",
        "Live fallback with 24h local cache",
    ]),
    ("Official Documentation Sources", [
        "PHP Manual (php.net) · MDN Web Docs",
        "MySQL Reference · Microsoft Docs",
        "Stored with publisher, date & license",
    ]),
]
ey = 300
for title, items in ext:
    h = 40 + 18 * len(items) + 10
    box(1560, ey, 360, h, title, items, C["ext"], C["ext_bg"])
    ey += h + 16

arrow(1500, 460, 1560, 460, C["ai"], label="draft only", lx=1503, ly=448)

# ---------------------------------------------------------------- legend
group(1540, 908, 400, 252, "Legend", C["ink"])
lg = [
    (C["code"], C["code_bg"], "CODE", "Deterministic: same input, same output"),
    (C["ai"], C["ai_bg"], "AI", "Optional rewrite draft; always badged"),
    (C["data"], C["data_bg"], "DATA", "Curated registry, snapshots & SQLite"),
    (C["qa"], C["qa_bg"], "QA", "74 automated tests & eval harness"),
    (C["ui"], C["ui_bg"], "UI", "Side-by-side workspace & PDF export"),
]
for i, (fg, bg, lbl, desc) in enumerate(lg):
    y = 952 + i * 38
    rect(1562, y, 60, 26, bg, fg, rx=6, sw=2)
    text(1592, y + 18, lbl, size=11, color=fg, weight="bold", anchor="middle")
    text(1636, y + 18, desc, size=13, color=C["muted"])

# ---------------------------------------------------------------- footer
text(60, 1205, "Core Principle: No source, no claim — deterministic code finds, verifies, retrieves, and scores every finding; "
     "Gemini only drafts optional replacement wording; the faculty member decides.", size=15, color=C["ink"], weight="bold")
text(60, 1233, "Production Deployment: Vultr Cloud Compute (Ubuntu 24.04 LTS, Docker Compose, Caddy 2 HTTPS reverse proxy, non-root FastAPI backend, SQLite WAL volume).",
     size=13, color=C["muted"])

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
       + "".join(out) + "</svg>")

dest = Path(sys.argv[1])
svg_path = dest.with_suffix(".svg")
svg_path.write_text(svg, encoding="utf-8")

import pymupdf as fitz

doc = fitz.open(str(svg_path))
pix = doc[0].get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
pix.save(str(dest))
print("wrote", dest, pix.width, "x", pix.height)
