# GroundEd

Curriculum review assistant for faculty: upload a course module (PDF) → find outdated technologies,
practices and topics → back every claim with (1) page + quote from the module and (2) a trusted source.
Successor to the ModSync hackathon prototype. Hackathon track: **Grounded Knowledge & RAG**.

Full reasoning and decisions: `docs/design-brief.md`. Diagram: `docs/architecture.png` (regenerate with
`python docs/architecture.py docs/architecture.png`).

## Non-negotiable principles

- **No source, no claim.** Every claim needs a verified module quote AND a library/registry citation.
- **The AI explains; it never decides or scores.** Detection hints, a support check and explanations are the only LLM jobs.
- **Scores come from fixed rules in code** — same input must give the same output.
- **Facts (versions, dates, support status) are looked up directly** from the Facts Registry / endoflife.date v1 — never via AI search.
- **Every report carries a provenance stamp set by code:** file hash, registry version, library version, model + prompt version, analysis date. Matching stamp → return cached result.
- **Subject-specific knowledge lives in data (registry YAML, source library), never in code.**
- **The faculty decides.** UI wording is advisory ("may warrant review").

## Architecture: Registry + RAG + Checks + Rule Scoring

Pipeline (background worker): 1 Read PDF (CODE) → 2 Detect (CODE+AI) → 3 Retrieve evidence (CODE: registry
lookup + hybrid keyword/vector search) → 4 Verify (CODE quote match + AI support check; fail → drop claim)
→ 5 Rule scoring (CODE) → 6 Explain (AI, verified evidence only).

Scoring defaults: lifecycle 0–40 (registry support stage) · frequency 6 pts/page max 30 · labs 0/20 ·
learning activities 0/10 (AI label + code-verified quote) · confidence computed from evidence coverage.
Priority: High ≥ 80, Medium ≥ 50, else Low. "Unsupported" and "less popular" are separate claim types.

## Scope

Initial subject: **web development only**. Next: mobile (only with ≥5 real modules). Out-of-scope modules
must yield "no evidence / not covered", not invented claims.

## Stack

React + Vite + TypeScript + Tailwind + React Router (PDF.js evidence viewer; UI rules in `DESIGN.md`) · Python +
FastAPI + Pydantic, managed with `uv` · PostgreSQL + pgvector · Docling or PyMuPDF (+OCR) — PyMuPDF is AGPL ·
LLM: **Google Gemini** (pinned model, strict JSON schema, temperature 0; all calls in one module) · embeddings:
**Gemini embedding model** (e.g. `gemini-embedding-001`; store model name with vectors) · no heavy LLM frameworks ·
Langfuse tracing · pytest + evaluation scripts · Docker Compose (local dev and production) · **hosted on a Vultr
Compute instance** (Caddy for HTTPS) — required by the hackathon. Verify library and model versions at setup.

## Build order

1. Test set (5–10 real web modules, outdated items labelled by the team) → 2. Facts Registry format + entries
→ 3. PDF reading → 4. Detection, checks, rule scoring → 5. RAG → 6. AI explanations → 7. Evidence UI.
Run the evaluation after every step. Metrics: claims backed, citation accuracy, coverage, false alarms,
consistency across reruns, teacher agreement. Do not optimise for citation count.

## Repo hygiene

- Never commit databases, uploaded/real course modules, `.env*` files with values, or vendored packages.
- Errors must say what actually failed (no blanket "429").
- Uploads have size/type limits; endpoints that expose data require auth.

## Status

2026-11-14: design agreed; repo initialised with docs only. Next step: phase 1 — test set + registry format.
