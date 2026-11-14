"""Generate the GroundEd high-level architecture diagram as SVG + PNG.

Usage:  python docs/architecture.py docs/architecture.png   (requires PyMuPDF; also writes the .svg)
"""
import sys
from pathlib import Path
from xml.sax.saxutils import escape

W, H = 2000, 1290
FONT = "Helvetica, Arial, sans-serif"

C = {
    "ink": "#1e293b", "muted": "#475569", "line": "#64748b", "bg": "#ffffff",
    "code": "#0f766e", "code_bg": "#ccfbf1",
    "ai": "#7c3aed", "ai_bg": "#ede9fe",
    "data": "#b45309", "data_bg": "#fef3c7",
    "ext": "#475569", "ext_bg": "#f1f5f9",
    "ui": "#1d4ed8", "ui_bg": "#dbeafe",
    "qa": "#be123c", "qa_bg": "#ffe4e6",
    "group_bg": "#f8fafc", "group_line": "#cbd5e1",
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
text(60, 52, "GroundEd — High-Level System Architecture", size=30, weight="bold")
text(60, 82, "Grounded curriculum review · Registry + RAG + Checks + Rule Scoring · Initial scope: Web Development",
     size=16, color=C["muted"])

# ---------------------------------------------------------------- row A: users + frontend
box(60, 115, 230, 105, "Faculty", ["Uploads a module PDF", "Reviews cited evidence", "Accepts / rejects / keeps"],
    C["ui"], C["ui_bg"])
box(350, 115, 1150, 105, "Frontend  ·  Next.js + TypeScript + Tailwind + shadcn/ui", [
    "Upload & login  ·  Analysis progress  ·  Report with priorities  ·  Evidence viewer (PDF.js, highlighted quotes)",
    "Side-by-side: “Your module says (page, quote)”  vs  “Source says (link, date)”  ·  Faculty decision + rationale",
], C["ui"], C["ui_bg"])
arrow(290, 167, 350, 167, C["ui"])

# ---------------------------------------------------------------- row B: API
box(60, 260, 1440, 72, "Backend API  ·  Python + FastAPI + Pydantic", [
    "Auth  ·  POST upload (size/type checks)  →  create job  ·  GET job status / progress  ·  GET report  ·  POST feedback  ·  Returns cached report if provenance matches",
], C["code"], C["code_bg"])
arrow(925, 220, 925, 260, C["ui"], both=True, label="HTTPS / JSON", lx=935, ly=246)

# ---------------------------------------------------------------- row C: worker pipeline
group(60, 370, 1440, 262, "Analysis Worker", C["code"], "(background job — no AI decides, AI only explains)")
arrow(780, 332, 780, 370, C["code"], label="enqueue job", lx=790, ly=358)

steps = [
    ("1  Read PDF", ["Docling / PyMuPDF", "OCR for scanned pages", "& code screenshots", "Strip headers/footers"],
     [("CODE", C["code"])]),
    ("2  Detect", ["Registry alias matching", "AI proposes unknowns", "Taught vs. mentioned", "Version stated?"],
     [("CODE", C["code"]), ("AI", C["ai"])]),
    ("3  Retrieve Evidence", ["Registry: exact facts", "RAG: hybrid search", "(keyword + vector)", "over source passages"],
     [("CODE", C["code"])]),
    ("4  Verify", ["Quotes exist in module", "& in source (fuzzy)", "AI support check", "Fail → drop claim"],
     [("CODE", C["code"]), ("AI", C["ai"])]),
    ("5  Rule Scoring", ["Lifecycle   0–40", "Frequency   0–30", "Labs   0 / 20", "Activities   0 / 10"],
     [("CODE", C["code"])]),
    ("6  Explain", ["Writes plain-language", "advice ONLY from", "verified evidence", "Pinned model, temp 0"],
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
text(96, 607, "Provenance stamp on every report:  file hash · registry version · library version · model + prompt version · "
     "analysis date   →   same inputs = same result", size=13, color=C["ink"], weight="bold")

# ---------------------------------------------------------------- row D: data layer
group(60, 672, 1440, 196, "Data Layer", C["data"], "PostgreSQL + pgvector (one database) · S3-compatible file storage")
data_boxes = [
    ("Facts Registry", ["Technology, version,", "support stage, EOL date,", "replacement, aliases,", "source link + tier"]),
    ("Source Library", ["Cleaned passages +", "embeddings + full-text", "index; publisher, date,", "license, tags"]),
    ("Reports", ["Claims, citations,", "scores, explanations,", "provenance stamp,", "job status"]),
    ("Feedback", ["Accept / reject /", "keep intentionally,", "faculty rationale", "→ evaluation data"]),
    ("File Storage", ["Uploaded PDFs,", "extracted pages;", "retention + delete", "on request"]),
]
dx, dy, dw, dh, dgap = 80, 712, 264, 140, 20
data_x = []
for i, (title, items) in enumerate(data_boxes):
    x = dx + i * (dw + dgap)
    data_x.append(x)
    box(x, dy, dw, dh, title, items, C["data"], C["data_bg"])

# pipeline <-> data arrows
s3x = sx + 2 * (sw_ + gap)
arrow(s3x + 40, 632, data_x[0] + 230, 712, C["data"], label="lookup", lx=s3x - 120, ly=668)
arrow(s3x + 140, 632, data_x[1] + 200, 712, C["data"], label="search", lx=s3x + 150, ly=668)
s6x = sx + 5 * (sw_ + gap)
arrow(s6x + 100, 632, data_x[2] + 200, 712, C["data"], label="save report", lx=s6x + 110, ly=668)

# ---------------------------------------------------------------- row E: ingestion + quality
group(60, 908, 720, 252, "Knowledge Ingestion", C["data"], "(offline, scheduled)")
box(80, 948, 330, 196, "Registry as Code", [
    "YAML files in Git, reviewed via PR",
    "Schema-validated in CI",
    "Synced with endoflife.date (v1 API)",
    "Every change versioned",
], C["data"], "#ffffff", chips=[("CODE", C["code"])])
box(430, 948, 330, 196, "Source Pipeline", [
    "Trusted web-dev sources:",
    "php.net, MDN, framework docs,",
    "release & deprecation notes",
    "Collect → clean → split → tag → embed",
    "Monthly refresh + link checks",
], C["data"], "#ffffff", chips=[("CODE", C["code"])])
arrow(300, 948, 300, 852, C["data"], label="load", lx=310, ly=905)
arrow(600, 948, 600, 852, C["data"], label="index", lx=610, ly=905)

group(800, 908, 700, 252, "Quality & Evaluation", C["qa"], "(runs on every change)")
box(820, 948, 320, 196, "Test Set", [
    "5–10 real web modules",
    "Outdated items marked",
    "by the team (ground truth)",
    "+ out-of-scope modules",
    "(must say “no evidence”)",
], C["qa"], C["qa_bg"])
box(1160, 948, 320, 196, "Evaluation Runner", [
    "pytest + scoring scripts",
    "Claims backed by source",
    "Citation accuracy",
    "Coverage · False alarms",
    "Consistency across reruns",
], C["qa"], C["qa_bg"])
arrow(1140, 1046, 1160, 1046, C["qa"])
arrow(data_x[3] + 132, 852, 1300, 948, C["qa"], label="feedback → test data", lx=1320, ly=905)

# ---------------------------------------------------------------- external services column
group(1540, 260, 400, 608, "External Services", C["ext"])
ext = [
    ("LLM API", ["One main + one fallback model", "Pinned versions, strict JSON", "schema, temperature 0",
                 "Used in steps 2, 4, 6 only"]),
    ("Embedding Model", ["text-embedding-3-small", "or open-source (BGE / E5)", "Model name stored with vectors"]),
    ("endoflife.date API (v1)", ["Support stages & EOL dates", "Feeds the Facts Registry", "Results cached"]),
    ("Langfuse (tracing)", ["Every AI call: inputs,", "outputs, model, cost, latency"]),
]
ey = 300
ext_y = []
for title, items in ext:
    h = 40 + 18 * len(items) + 10
    box(1560, ey, 360, h, title, items, C["ext"], C["ext_bg"])
    ext_y.append((ey, h))
    ey += h + 16
# worker -> LLM
arrow(1500, 398, 1560, 398, C["ai"], label="AI", lx=1520, ly=390)

# ---------------------------------------------------------------- legend
group(1540, 908, 400, 252, "Legend", C["ink"])
lg = [
    (C["code"], C["code_bg"], "CODE", "Deterministic: same input, same output"),
    (C["ai"], C["ai_bg"], "AI", "Language model; always checked"),
    (C["data"], C["data_bg"], "DATA", "Sources, registry, reports"),
    (C["qa"], C["qa_bg"], "QA", "Measures accuracy & consistency"),
    (C["ui"], C["ui_bg"], "UI", "What faculty see and do"),
]
for i, (fg, bg, lbl, desc) in enumerate(lg):
    y = 952 + i * 38
    rect(1562, y, 60, 26, bg, fg, rx=6, sw=2)
    text(1592, y + 18, lbl, size=11, color=fg, weight="bold", anchor="middle")
    text(1636, y + 18, desc, size=13, color=C["muted"])

# ---------------------------------------------------------------- footer
text(60, 1200, "Principle: the AI can only say what the sources prove — code finds, checks and scores the evidence; "
     "the AI explains it; the faculty decides.", size=15, color=C["ink"], weight="bold")
text(60, 1228, "Not shown: login provider (Auth.js / Clerk / Supabase Auth), Docker Compose for local dev, "
     "hosting (Vercel + Render/Fly/Railway).", size=13, color=C["muted"])

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
       + "".join(out) + "</svg>")

dest = Path(sys.argv[1])
svg_path = dest.with_suffix(".svg")
svg_path.write_text(svg, encoding="utf-8")

import fitz  # PyMuPDF

doc = fitz.open(str(svg_path))
pix = doc[0].get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
pix.save(str(dest))
print("wrote", dest, pix.width, "x", pix.height)
