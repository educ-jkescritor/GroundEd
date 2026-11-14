# GroundEd

Curriculum review assistant for faculty: upload a course module/syllabus (PDF) → find outdated technologies,
functions and practices → back every finding with (1) page + verbatim quote from the PDF and (2) a trusted source.
HackGlobal 2026, track **Grounded Knowledge & RAG**. Deadline: 2026-11-15 12:00.

Docs: `README.md` (setup, layout, scoring) · `docs/api.md` (API contract) · `docs/architecture.md` ·
`docs/design-brief.md` (full design reasoning; parts marked there as Postgres/Next.js/RAG are post-hackathon).

## Non-negotiable principles

- **No source, no claim.** A finding is only scored if it has a verified PDF quote AND a sourced fact.
  No source → status `unverified` ("needs manual check"), never a guess.
- **The AI never supplies facts or scores.** LLM jobs: spot technology mentions the registry missed, and
  draft suggested text (always labelled "AI suggestion, not sourced").
- **Scores come from fixed rules in code** (`backend/app/score.py`, weights in `config.py`) — same input, same output.
- **Facts come only from** the Facts Registry (`backend/registry/*.yaml`, sourced from official docs such as php.net)
  or endoflife.date — never from an LLM.
- **Every analysis carries a provenance stamp set by code** (file hash, registry version, model, analysis date).
- **Subject knowledge lives in data** (registry YAML, aliases), never in code.
- **The faculty decides.** UI wording is advisory.

## Architecture (adopted skeleton)

`backend/` FastAPI + Pydantic + SQLite · `frontend/` React + Vite + TS + Tailwind · `deploy/` Docker Compose + Caddy (Vultr).
Pipeline: `pdf.py` (PyMuPDF page text) → `detect.py` (registry alias matching in code first, Gemini for extras;
every snippet must appear verbatim on its page) → `registry.py` / `eol.py` (facts) → `score.py` → saved analysis.

Scoring (100 pts): lifecycle status 50 · time past EOL 20 · version lag 15 · prominence 15. Unverified = not scored.

## API contract

`backend/app/models.py` is the contract, mirrored in `frontend/src/types.ts` and `docs/api.md`.
**Only additive changes** (new optional fields); never rename/remove. Change all three together.

## Git workflow

`feature/backend-pipeline`, `feature/frontend-ui` → PR → `develop` → PR → `main` (release/demo only).
Merge `develop` into your feature branch before touching shared files.

## Scope

Web development (PHP/MySQL test modules first). Out-of-scope content must yield "unverified", not invented findings.

## Repo hygiene

- Never commit `.env`, databases, or real course modules (they live in git-ignored `private/`).
- Errors must say what actually failed (no blanket "429"); uploads have size/type limits.
- Endpoints that expose module data should require auth. **Known gap (hackathon):** no login yet; report IDs are
  random and reports are purged after `UPLOAD_RETENTION_HOURS`. State this openly; real auth needs the frontend team.
- Sources that can't be fetched are flagged (`needs_manual` / `failed` + reason), never guessed.

## Dev

`cd backend && uv venv && uv pip install -r requirements.txt && uv run uvicorn app.main:app --reload`
Tests: `cd backend && uv run pytest`. Eval: `uv run python -m app.cli eval` (see README).
