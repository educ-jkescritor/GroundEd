# GroundEd

**Source-backed AI for keeping university curricula current.**  
*Built for **HackGlobal 2026** — Track: **Grounded Knowledge & RAG*** · **Live Demo:** [https://45-77-246-35.sslip.io](https://45-77-246-35.sslip.io)

An instructor or curriculum reviewer uploads a course module or syllabus (PDF). GroundEd detects every language, framework, database, function, and coding practice it teaches, verifies each against **[endoflife.date](https://endoflife.date)** (37 tracked products) and a **curated official documentation library** (`php.net`, MDN, MySQL Reference, Microsoft Docs), and backs every finding with **two verifiable citations**:
1. **Where it appears in the module** — exact page number, verbatim quote, and interactive PDF highlight bounding box.
2. **Why it may warrant review** — the lifecycle record or verbatim official documentation passage behind it.

Anything without a verified source is marked **Unverified** instead of guessed. Every verified item gets a deterministic **100-point priority score** computed by fixed rules in code (never by an LLM), and **nothing counts as changed without the faculty member's explicit decision** (*Update*, *Keep intentionally*, or *Dismiss*). When finished, faculty export a **Turnitin-style multi-page PDF report** (or Markdown summary) with a Cover Page, Integrity Overview, Findings & Decisions table, and Annotated Module Pages.

---

## Table of Contents
1. [Use Case & Problem Statement](#1-use-case--problem-statement)
2. [System Design & Grounding Architecture](#2-system-design--grounding-architecture)
3. [Deterministic Priority Score (100 Points)](#3-deterministic-priority-score-100-points)
4. [User Flow & Screenshots](#4-user-flow--screenshots)
5. [Repository Layout](#5-repository-layout)
6. [Local Development & Evaluation](#6-local-development--evaluation)
7. [Deployment (Vultr Cloud Compute)](#7-deployment-vultr-cloud-compute)
8. [Full Documentation Index](#8-full-documentation-index)

---

## 1. Use Case & Problem Statement

> Full details, personas, Jobs-to-be-Done & journey map: **[docs/use-cases.md](docs/use-cases.md)**

### Why This Problem Matters
- **Silent curriculum drift:** Technology changes faster than syllabi and lab manuals are revised (Dobslaw et al., 2023). Frameworks reach end-of-life (`PHP 5.6`, `Python 2.7`, `Windows 7`, `Internet Explorer 11`) and functions are removed (`mysql_connect()`, `mysql_query()`, ASP-style `<% %>` tags) while still taught in inherited lab exercises.
- **Manual checking doesn't scale:** Faculty teaching 3–5 courses a term—or department chairs reviewing 20+ modules for accreditation—don't have time to cross-check every tool and version against release notes.
- **Generic AI chatbots can't be trusted by faculty:** Standard LLMs hallucinate EOL dates, give confident opinions without sources, and rewrite documents without preserving instructor intent. Faculty will only act on findings they can **verify in 30 seconds and defend to a curriculum committee**.

### Who GroundEd Serves
| User | Goal | How GroundEd Helps |
|---|---|---|
| **Course Instructor** *(Primary)* | Quickly spot outdated tools/practices before a new term while staying in control | Side-by-side PDF highlight + official source passage; optional editable AI rewrite draft; **Keep intentionally** option for legacy topics taught on purpose |
| **Curriculum Reviewer / Department Chair** | Audit multiple modules before accreditation with reproducible evidence | Deterministic 100-point priority score (same PDF = same score), cryptographic provenance stamp, and Turnitin-style multi-page PDF / Markdown export |
| **Instructional Designer / Adjunct** | Update an inherited module they didn't author | Contextual migration passages from the RAG Source Library + editable AI draft grounded in the verified source |

---

## 2. System Design & Grounding Architecture

> Full details & sequence diagrams: **[docs/architecture.md](docs/architecture.md)** · Design rationale: **[docs/design-brief.md](docs/design-brief.md)**

**Core Principle:** *Code finds, checks, retrieves, and scores the evidence; the AI only drafts optional replacement wording from verified facts; the faculty member decides.*

![GroundEd System Architecture](docs/architecture.png)

### End-to-End Grounding & RAG Pipeline

```mermaid
flowchart TD
    A["Course Module PDF"] --> B["1. Read PDF (pdf.py)<br/>PyMuPDF extracts per-page text + highlight bboxes;<br/>rejects scanned/image-only PDFs"]
    B --> C["2. Detect Mentions (detect.py)<br/>Match against Registry regexes & 37 products;<br/>ignore history/changelog lines (rules/mentions.yaml)"]
    C --> D{"3. Verbatim snippet<br/>found on page?"}
    D -- No --> X["Drop candidate<br/>(zero hallucinated quotes)"]
    D -- Yes --> E{"4. Evidence Lookup"}

    E -- "Practice / Function<br/>(e.g. mysql_connect, <% %>)" --> F1["Facts Registry (registry/*.yaml)<br/>Verify exact quote exists inside<br/>committed Source Library doc"]
    E -- "Product / Version<br/>(e.g. PHP 5.6, Windows 7)" --> F2["Lifecycle Lookup (eol.py)<br/>Resolve version against<br/>endoflife.date release cycle"]
    E -- "Unknown to Registry" --> U["Status: Unverified<br/>('Needs manual check' — never scored)"]

    F1 --> G{"Verified & outdated?"}
    F2 --> G
    G -- "Currently supported" --> Sup["No finding emitted"]
    G -- "No verified source" --> U
    G -- "EOL / Nearing EOL / Deprecated" --> I["5. Source Library RAG (library.py)<br/>SQLite FTS5 BM25 retrieves supporting 'fact' passage<br/>+ 'replacement' migration passage"]

    I --> J["6. Teaching Signals & Rule Score (signals.py, score.py)<br/>Deterministic 0–100 score:<br/>Lifecycle (40) + How it is taught (30) + Frequency (20) + Hands-on (10)"]
    J --> K["7. Provenance Receipt & Report<br/>SHA-256 file hash + registry/library/rules/pipeline versions"]
    K --> L["8. Faculty Review, Optional Gemini Draft (llm.py) & PDF Export<br/>Update · Keep intentionally · Dismiss"]
```

### Non-Negotiable Grounding Guarantees
1. **No source, no claim:** Every scored finding has a verified verbatim PDF snippet (with page bounding box) **and** a verified record from `endoflife.date` or the curated Source Library (`backend/library/snapshot/`).
2. **Unverified ≠ Guessed:** If a mention lacks a verified source, it is flagged `unverified` (*"No trusted source found. GroundEd does not guess"*) and never scored.
3. **Deterministic scoring (Zero LLM variance):** Scores and priorities are computed strictly by rule-based Python code (`backend/app/score.py` & `backend/app/signals.py`). Running the same PDF twice always yields the exact same score.
4. **Strict separation of Sourced Facts vs. AI Suggestions:** Google Gemini (`backend/app/llm.py`) is invoked **only** when a user clicks **Generate draft** on a verified finding, and its output is visually isolated in a dashed violet container labelled *"AI suggestion · Not a sourced fact"*.
5. **Cryptographic provenance stamp:** Every report records the PDF's `file_sha256`, `pipeline_version`, `registry_version`, `library_version`, `rules_version`, and `analysis_date`.

---

## 3. Deterministic Priority Score (100 Points)

Implemented in `backend/app/score.py` with configurable weights in `backend/app/config.py` and teaching-signal rules in `backend/rules/teaching.yaml` ("Option C" — impact over age):

| Factor | Max Points | Deterministic Rule |
|---|---|---|
| **Lifecycle** | **40** | Ended or removed = `40` · Deprecated = `25` · Support ends within 12 months = `20` · Support ends within 24 months = `10` |
| **How it is taught** | **30** | Used in code students write (`code`) = `30` · Explained in prose (`explained`) = `15` · Only listed (`listed`) = `5` |
| **Frequency** | **20** | `4` points per page where the item appears (up to `20`) |
| **Hands-on** | **10** | `10` points if it appears on a lab, exercise, or activity page |

- **Priority thresholds:** **High** `≥ 80` · **Medium** `50–79` · **Low** `< 50`.
- **Supported** items produce no finding; **Unverified** items are not scored and are flagged *"needs manual check"*.

---

## 4. User Flow & Screenshots

> Full walkthrough, site map & content model: **[docs/user-flow.md](docs/user-flow.md)**

```mermaid
flowchart LR
    L["1. Landing (/)<br/>Value prop &<br/>live preview"] --> A["2. Analyze (/analyze)<br/>Upload PDF or pick<br/>built-in sample"]
    A --> R["3. Side-by-Side Report (/reports/:id)<br/>Left: PDF.js viewer with highlights<br/>Right: Ranked findings & % outdated"]
    R --> EV["4. Dual Evidence & Rubric<br/>PDF quote ⇄ Official source passage<br/>+ 100-pt score breakdown"]
    EV --> D{"5. Faculty Decision"}
    D -->|"Update"| U["Use sourced upgrade or<br/>generate & edit AI draft"]
    D -->|"Keep intentionally"| K["Keep on purpose<br/>(+ optional reason)"]
    D -->|"Dismiss"| X["Dismiss finding<br/>(+ optional reason)"]
    U & K & X --> E["6. Export Report<br/>Turnitin-style multi-page PDF<br/>or Copy Markdown"]
```

### Key Screens

1. **Analyze a Module — Upload PDF or Pick a Sample (`/analyze`)** — Drag-and-drop PDF upload (`≤ 10 MB`, deleted immediately after extraction) plus instant one-click **Sample Modules** (`Legacy PHP lab manual`, `Modern PHP lab manual`, and the 228-page `Web development course module`).  
   ![Step 1 — Analyze a Module](docs/screenshots/01-landing.png)

2. **Side-by-Side Report Workspace (`/reports/:id`)** — Displays the rendered PDF with interactive bounding-box highlights on the left (`Page 165 of 228 · Using Group Functions`) and prioritized findings (`6 findings to be reviewed · 62% OUTDATED`) on the right, synced both ways.  
   ![Step 2 — Side-by-Side Report Workspace](docs/screenshots/02-analyze.png)

3. **Dual Citations & 100-Point Priority Breakdown** — Places the module's verbatim quotes (`Page 165`, `Page 166`, `Page 167`) above the official documentation quote (`PHP Manual · php.net`) and opens the deterministic `90 of 100` priority score breakdown popover (`Lifecycle 40/40`, `How it is taught 30/30`, `Frequency 20/20`, `Hands-on 0/10`).  
   ![Step 3 — Dual Citations and 100-Point Score Breakdown](docs/screenshots/03-report-workspace.png)

4. **Optional AI Suggestion & Faculty Decision** — Clicking **Generate draft** produces an editable PDO replacement inside a dashed violet box badged **`AI suggestion · Not a sourced fact`**, followed by the instructor's decision controls (**Update**, **Keep intentionally**, or **Dismiss**).  
   ![Step 4 — Optional AI Suggestion and Faculty Decision](docs/screenshots/04-finding-detail.png)

5. **Turnitin-Style Multi-Page PDF Report Export** — Exports a print-ready curriculum review report containing a Cover Page (`grd:oid:::...`), Integrity Overview, Findings & Decisions table, and Annotated Module Pages with numbered margin badges (`[✓ 1]`) and per-page footers.  
   ![Step 5 — Turnitin-Style Multi-Page PDF Report Export](docs/screenshots/05-export-and-methodology.png)

6. **Zero False Alarms on Current Curricula (`Modern PHP lab manual`)** — Running the `PHP 8` + `PDO` sample module produces **`Nothing to review`** and **`0% OUTDATED`**, proving GroundEd never invents findings when a module is already up to date.  
   ![Step 6 — Zero False Alarms on Modern PHP Lab Manual](docs/screenshots/06-zero-invention.png)

---

## 5. Repository Layout

```text
backend/                  FastAPI backend & deterministic grounding pipeline (Python 3.12+)
  app/
    main.py               FastAPI endpoints (/api/analyze, /api/samples, /api/analysis/{id}, /draft, /feedback)
    pipeline.py           End-to-end deterministic analysis pipeline & provenance stamping
    models.py             Pydantic API contract (mirrored in frontend/src/types.ts)
    pdf.py                PyMuPDF text extraction, scanned-PDF detection & snippet bounding boxes
    detect.py             Registry pattern matching & mention filtering
    registry.py           Loader for curated Facts Registry (backend/registry/*.yaml)
    eol.py                endoflife.date product resolution & release cycle lookup (37 products)
    library.py            Curated Source Library + SQLite FTS5 BM25 passage retrieval (RAG)
    signals.py            Teaching depth (code / explained / listed) & hands-on lab detection
    score.py              Deterministic 100-point priority scoring ("Option C")
    llm.py                Isolated Google Gemini client (optional draft suggestions only)
    db.py, cache.py       SQLite WAL storage for analyses, 24h deterministic cache, drafts & feedback
    evaluate.py, cli.py   Evaluation harness & CLI tools
  library/                sources.yaml, coverage.yaml & committed documentation snapshot/
  registry/               Curated YAML facts & product version patterns (php.yaml, products.yaml)
  rules/                  mentions.yaml (changelog filter) & teaching.yaml (teaching depth regexes)
  data/                   Public sample modules (samples.yaml + PDFs) & runtime SQLite DB
  tests/                  74 pytest tests covering pipeline, grounding, scoring, library & API limits

frontend/                 React 18 + Vite + TypeScript + Tailwind CSS v4 + PDF.js (DESIGN.md v2)
  src/
    pages/                Landing, Analyze, Report, FindingDetail, Reports, SignIn, Methodology, Feedback, NotFound
    components/           PdfViewer, ModuleView, FindingItem, ScoreBreakdown, SourcesList, ReportExport, DetailsDialog
    components/ui/        Design system primitives (AiSuggestion, DecisionControl, PriorityBadge, StatusBadge, QuoteBlock...)
    api.ts, types.ts      Typed API client & shared contract

deploy/                   Production deployment config (docker-compose.yml + Caddyfile for Vultr)
docs/                     Architecture, use cases, user flow, screenshots, API contract & Vultr guide
DESIGN.md                 v2 Design System specification (Lapis & Clay palette, typography, accessibility, microcopy)
```

---

## 6. Local Development & Evaluation

### Backend (Python 3.11+)
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Optional: add GEMINI_API_KEY for the "Generate draft" button
uvicorn app.main:app --reload --port 8000
# Interactive API docs: http://localhost:8000/docs
```

Run the 74-test backend suite and evaluation runner:
```bash
cd backend
pytest
python -m app.cli eval
```

### Frontend (Node 20+)
```bash
cd frontend
npm install
npm run dev                 # Opens http://localhost:5173 (proxies /api to :8000)
```

---

## 7. Deployment (Vultr Cloud Compute)

On an Ubuntu 24.04 LTS instance with Docker and Docker Compose installed (full guide in **[docs/deploy-vultr.md](docs/deploy-vultr.md)**):

```bash
git clone https://github.com/educ-jkescritor/GroundEd.git && cd GroundEd
cp backend/.env.example backend/.env    # Fill in GEMINI_API_KEY and CORS_ORIGINS
SITE_ADDRESS=your.domain.or.ip.sslip.io docker compose -f deploy/docker-compose.yml up -d --build
```
Caddy 2 serves the static React build, reverse-proxies `/api/*` to FastAPI inside the Docker network, and provisions automatic HTTPS certificates via Let's Encrypt.

---

## 8. Full Documentation Index

- **[docs/use-cases.md](docs/use-cases.md)** — Problem statement, personas, Jobs to be Done, instructor journey map, main use case, and edge cases
- **[docs/architecture.md](docs/architecture.md)** — System overview, RAG & Registry pipeline, sequence diagram, and Vultr deployment architecture ([docs/architecture.png](docs/architecture.png) / [docs/architecture.svg](docs/architecture.svg))
- **[docs/user-flow.md](docs/user-flow.md)** — User flows, route map, report content model, and screen-by-screen visual walkthrough (`docs/screenshots/`)
- **[docs/design-brief.md](docs/design-brief.md)** — Pre-build design reasoning, lessons from the earlier ModSync prototype, and RAG track alignment
- **[DESIGN.md](DESIGN.md)** — Full v2 UI/UX Design System (Palette A · Lapis & Clay, typography, WCAG 2.2 AA contrast, microcopy)
- **[docs/api.md](docs/api.md)** — REST API contract (`backend/app/models.py` ⇄ `frontend/src/types.ts`)
- **[docs/deploy-vultr.md](docs/deploy-vultr.md)** — Step-by-step Vultr Cloud Compute production deployment guide
