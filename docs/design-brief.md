# GroundEd — Design Brief

> Status: pre-build design, agreed 2026-11-14. Successor to the ModSync hackathon prototype.
> Architecture diagram: [`architecture.png`](architecture.png) (source: [`architecture.py`](architecture.py)).

## 1. What GroundEd is

A curriculum review assistant for faculty. A teacher uploads a course module (PDF); GroundEd finds
technologies, practices and topics that may be outdated and backs **every** claim with two citations:

1. **Where it is in the module** — page + exact quote.
2. **Why it is outdated** — a trusted source (link, publisher, date).

The tool advises; **the faculty decides**. No source → no claim.

**Core principle:** *The AI can only say what the sources prove — code finds, checks and scores the
evidence; the AI explains it; the faculty decides.*

## 2. Hackathon track

**Primary: Grounded Knowledge & RAG.** The product's single claim ("this part of your course is outdated")
is only worth something if it is backed by a real source — exactly what this track rewards. Fixing the
prototype's reliability problems and fitting the track are the same work.

Secondary framing (optional): a light agentic layer — the system gathers evidence itself and drafts
suggestions the teacher approves. Do not lead with "agentic"; the core is a fixed, checkable pipeline.

Judges will ask two questions; the system must answer both with evidence:
- *"How do you know it's outdated?"* → citations to curated sources.
- *"Would it say the same thing tomorrow?"* → deterministic scoring + provenance + consistency metrics.

## 3. Lessons from the ModSync prototype (what NOT to repeat)

| # | Problem in ModSync | Plain meaning | GroundEd answer |
|---|---|---|---|
| 0 | No measurement | Couldn't prove a change helped | Test set + evaluation runner first |
| 1 | LLM chose all score components | Same PDF flipped High ↔ Low between runs; 53% of items rated High | Rule-based scoring in code |
| 2 | Lifecycle lookup rarely ran; `eol: true` shown as "supported" | AI mostly guessed whether something is outdated | Facts Registry + endoflife.date v1, support stages |
| 3 | LLM wrote its own `ai_mode` ("strict", "expert_review") | Couldn't trace which model produced a result | Provenance stamp set by code |
| 4 | All reference links LLM-generated, unchecked | Possible broken/invented links | Links come only from the curated library; link checks |
| 5 | Worked only on tool-heavy modules | Concept courses got nothing or odd results | Start with web dev; add standards-based topic checks later |
| 6 | "Agentic" claim was a fixed pipeline | Weak track fit | Enter under RAG |
| 7 | Hygiene: missing deps, DB committed, every error = 429, blocking server, no upload limit, unauthenticated export | Fragile, unsafe | Background jobs, auth, limits, proper errors, no data in git |

Evidence from 57 stored prototype runs: clear-cut mock PDFs were stable; real modules varied
(e.g. one item scored 85 → 43 across two runs of the same file).

## 4. Scope of the initial prototype

**Web development only.** Chosen because: the team has real web modules (test data), the field changes
fast, free authoritative sources are plentiful (endoflife.date, php.net, MDN, framework docs), and it has
clear demo moments (PHP 5, `mysql_connect()`, AngularJS, Bootstrap 3).

- Next subject: **mobile development** (overlaps with web: JS/TS, React → React Native, APIs, hybrid apps;
  clear signals: Xamarin EOL May 2024, PhoneGap discontinued 2020, Kotlin-first, Play target-API rules).
  Add only if ≥5 real mobile modules are available.
- Later: cybersecurity (topic/standards-based: NIST NICE, OWASP), others.
- **Adding a subject must require only new sources + test modules, never code changes.**
- Out-of-scope modules are still useful as tests: the system must answer "no evidence / not covered".

Rough size per subject: 20–40 trusted sources · 5–10 labelled test modules · 30–50 hand-checked claims.

## 5. Architecture: Registry + RAG + Checks + Rule Scoring

```
PDF → read text → detect technologies → Registry (facts) + RAG (documents)
    → verify → rule scoring → AI explains → faculty decides
```

| Part | Job | Example |
|---|---|---|
| **Facts Registry** | Exact, known facts, each with its source | "`mysql_*` removed in PHP 7.0 (php.net)" |
| **RAG** | Find supporting passages in written documents | Section of a migration guide |
| **Checks** | Quotes really exist; source really supports the claim | Claim dropped if it fails |
| **Rule scoring** | Priority from fixed rules | Same input → same score |
| **AI** | Only *explains* verified evidence | Never decides or scores |

Importance ranking: test set > source library > PDF reading quality > checks & scoring > RAG > AI > UI.

### 5.1 Pipeline steps (analysis worker, background job)

| Step | Who | Notes |
|---|---|---|
| 1 Read PDF | CODE | Docling/PyMuPDF; OCR for scanned pages & code screenshots; strip repeated headers/footers |
| 2 Detect | CODE + AI | Registry alias matching; AI proposes unknowns and classifies *taught vs. mentioned*; flag "version not stated" |
| 3 Retrieve evidence | CODE | Registry lookup for facts; hybrid (keyword + vector) search over source passages |
| 4 Verify | CODE + AI | Normalised/fuzzy quote match in module and source; separate AI support check; fail → drop |
| 5 Rule scoring | CODE | See 5.2 |
| 6 Explain | AI | Plain-language advice only from verified evidence; pinned model, temperature 0, strict schema |

### 5.2 Scoring rules (initial defaults — tune after the first evaluation run)

| Component | Points | Source of truth |
|---|---|---|
| Lifecycle | 0–40 | Registry/endoflife.date support stage; AI guess only as fallback, marked *unverified* |
| Frequency | 0–30 | Pages where the item's exact wording appears; **6 pts per page, max 30** |
| Labs | 0 / 20 | AI label + quote; code verifies quote exists, else 0 |
| Learning activities | 0 / 10 | Same as labs |
| Confidence | computed | Share of the score backed by verified evidence (not AI self-rating) |

Priority thresholds: **High ≥ 80, Medium ≥ 50, else Low** (revisit once real score distribution is known).
Keep "unsupported" and "less popular" as **separate claim types** — never conflate them.

### 5.3 Two kinds of evidence

| Kind | Example | Handling |
|---|---|---|
| Facts & dates | "PHP 5.6 support ended 2018-12-31" | Direct lookup (registry / API). Never via AI search. |
| Written guidance | Migration guides, deprecation notes, standards | RAG retrieval of passages |

### 5.4 Provenance (reproducibility)

Every report stores: **file hash · registry version · library version · model + prompt version · analysis date**.
Same inputs → return the cached result. Changed inputs → the difference is explainable.
Reports are stamped "as of <date>" because support status changes over time.

## 6. Source library

Quality over quantity. Every passage carries metadata: source name & publisher, **tier**, URL,
published date, collected date, topic/version tags, license.

| Tier | Kind | Examples | Proves |
|---|---|---|---|
| 1 | Support/status data | endoflife.date, vendor support pages, package deprecation flags | "Version no longer supported" |
| 2 | Official docs | Release notes, deprecation notices, migration guides (php.net, MDN, framework docs) | "Removed/replaced, and by what" |
| 3 | Curriculum standards | ACM/IEEE CS2023, NIST NICE, national standards body | "Courses like this should cover X" |
| 4 | Industry trend data | Stack Overflow Survey, GitHub Octoverse | Popularity only — not proof of outdatedness |
| 5 | Research papers | Pedagogy studies | Supporting evidence only (later) |

Build steps: choose scope → list sources → collect & clean → split into passages + tag → index
(keyword + vector) → test retrieval with known questions → schedule monthly refresh + link checks.

**Registry as code:** registry entries live as YAML in Git, schema-validated in CI, reviewed via PR,
synced with endoflife.date v1. Each entry: technology, version, aliases, support stage, EOL date,
replacement, source link, tier.

## 7. Edge cases to design for

**PDF input:** scanned PDFs (OCR or clear message) · code in screenshots · slides/multi-column layouts ·
repeated headers/footers inflating counts · locked/corrupt/huge files (size limit, clear errors) ·
mixed languages (e.g. English + Filipino).

**Detection:** name variants ("PHP5", "PHP 5.6", "php v5") · ambiguous names ("Java" vs "JavaScript",
"React"/"Bootstrap" as ordinary words) · no version stated · mentioned historically vs. actually taught ·
legacy taught on purpose ("keep intentionally" feedback) · practices not products (table layouts, XHTML, `var`).

**Sources:** supported-but-unpopular vs. unsupported · support stages (security-only ≠ none) ·
conflicting sources (higher tier wins, show both) · dead links (store passage snapshot + date) ·
time-dependence (stamp "as of").

**Checks & scoring:** PDF text artefacts break exact matching (normalise + fuzzy threshold) ·
multiple versions in one module (score separately) · module length effects.

**AI:** prompt injection inside PDFs (module text is data only) · provider outage (one fallback, recorded) ·
silent model updates (pin versions).

**System:** long analyses (background job + progress) · repeat uploads (provenance cache) ·
private/copyrighted modules (auth, deletion, check provider data-use policy).

## 8. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite + TypeScript + Tailwind + React Router | Design system and UI rules in [`DESIGN.md`](../DESIGN.md) |
| Evidence viewer | PDF.js (`react-pdf`) with highlighted quotes | Replaces page PNG screenshots |
| Backend | Python + FastAPI + Pydantic | |
| Packaging | `uv` | Locked, reproducible installs |
| Jobs | Job table + worker to start; real queue later | Never block the request |
| Database | **PostgreSQL + pgvector** | Registry, full-text + vector search, reports, feedback in one DB |
| PDF parsing | Docling (MIT) or PyMuPDF + OCR | ⚠️ PyMuPDF is AGPL — fine for hackathon, needs license or swap for a product |
| Embeddings | Gemini embedding model (e.g. `gemini-embedding-001`) | Same provider as the LLM; store model name with vectors |
| Search | Hybrid keyword + vector; reranker later | |
| LLM | **Google Gemini**: one pinned model (+ fallback), strict JSON schema, temperature 0 | All calls in one backend module; avoid heavy frameworks (e.g. LangChain) at first |
| Evaluation | pytest + custom scoring scripts; Ragas/DeepEval optional | Runs on every change |
| Tracing | Langfuse | Inputs, outputs, model, cost, latency |
| Files | S3-compatible storage (local folder in dev) | |
| Auth | Clerk / Supabase Auth, or simple backend sessions | Auth.js is Next.js-only, so it no longer fits |
| Local dev | Docker Compose | |
| Hosting | **Vultr Compute** instance (frontend + backend via Docker Compose, Caddy for HTTPS) | Required by the hackathon: backend must run on Vultr Compute |

Verify exact library versions at setup time; use endoflife.date **v1** API endpoints.

## 9. Metrics (what proves quality)

Do **not** optimise for citation count. Measure:

| Metric | Question |
|---|---|
| Claims backed | Share of claims with ≥1 valid source (target 100%, else no claim) |
| Citation accuracy | Does the cited passage actually support the claim? |
| Coverage | Of outdated items teachers would flag, how many were found? |
| False alarms | How often is something fine flagged? |
| Consistency | Same file, N runs → same items and scores? |
| Teacher agreement | Accept rate of suggestions (from feedback) |

Teacher feedback is used as **evaluation data first**; fine-tuning only much later, if ever.

## 10. Build order

1. **Test set** — 5–10 real web modules, outdated items marked by the team; plus out-of-scope modules.
2. **Facts Registry** — format + entries needed by the test set.
3. **PDF reading** — clean text and code from the real modules.
4. **Detection, checks, rule scoring.**
5. **RAG** over written sources.
6. **AI explanations.**
7. **Evidence UI.**

Measure against the test set after every step.

### Phases

| Phase | Goal | Demo message |
|---|---|---|
| 1 MVP | Web library, direct lookups, cited retrieval, verified quotes, side-by-side view | "Every claim is backed by a source — here's the proof" |
| 2 Trust | Evaluation set, consistency numbers, link checks, provenance | "Same answer every time; here's our accuracy" |
| 3 Breadth | Mobile, standards, "Ask your module" cited chat | "Works across courses and answers questions" |
| 4 Learning | Use feedback to improve retrieval; maybe fine-tune | "It improves with use" |

## 11. Carried over from ModSync

- **Keep (ideas):** FastAPI backend, page/quote evidence view, faculty feedback capture (accept/reject + rationale).
- **Drop:** 6-model fallback chain, AI-chosen scores and labels, writing page images into the frontend folder.
- **Never migrate:** the prototype's SQLite database (contains real module data), vendored `work/` packages, `.env.local`.
- **Do migrate:** the team's real web module PDFs — as the test set (keep them out of git if they are private/copyrighted).
