# GroundEd

**Source-backed AI for keeping university curricula current.**
Built for HackGlobal 2026 (Grounded Knowledge & RAG track).

A professor uploads a syllabus PDF. GroundEd finds every language, framework, database and tool it mentions,
checks each against [endoflife.date](https://endoflife.date), and gives every finding two citations:
the syllabus page where it appears and the lifecycle record behind it. Anything without a source is marked
**unverified** instead of guessed. Each item gets a transparent 100-point priority score, and nothing in the
syllabus changes without the faculty member's approval.

> Status: **frontend complete on mock data; backend pipeline in progress.** The API returns realistic mock data
> in its final shape (`backend/app/mock.py`) until the real pipeline replaces it.

**Pages:** Landing · Analyze (upload or sample, with progress) · Report (module and ranked findings side by side) ·
Finding detail · Reports history · Sign in (browser-only demo account) · Methodology · Feedback · Not found.
Try the **Ethics in Society (GED sample)** to see the "Not covered yet" path.

## Repository layout
```
backend/    FastAPI API (Python)
  app/main.py      endpoints
  app/models.py    API contract (pydantic)
  app/pdf.py       PDF -> page text + positions (PyMuPDF)
  app/detect.py    all Gemini calls (detection, drafts)
  app/eol.py       endoflife.date lookups + cache
  app/score.py     100-point priority score
  app/db.py        database access (PostgreSQL + pgvector; SQLite stub until migrated)
  data/            aliases.json, public sample syllabi, cache
frontend/   React + Vite + TypeScript + Tailwind
  src/pages/       Landing, Analyze, Results, Feedback
  src/components/  FindingCard, EvidencePanel, ScoreBreakdown
  src/api.ts       API client    src/types.ts  shared types
deploy/     docker-compose.yml + Caddyfile (Vultr)
docs/       architecture, API contract, user flow
```

## Local development

**Backend** (Python 3.11+):
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # add your GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

**Frontend** (Node 20+):
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :8000)
```

## Deploy (Vultr Compute)
On an Ubuntu instance with Docker installed:
```bash
git clone https://github.com/educ-jkescritor/GroundEd.git && cd GroundEd
cp backend/.env.example backend/.env    # fill in GEMINI_API_KEY and CORS_ORIGINS
SITE_ADDRESS=your.domain.or.ip.sslip.io docker compose -f deploy/docker-compose.yml up -d --build
```
Caddy serves the frontend, proxies `/api` to FastAPI, and gets HTTPS certificates automatically when
`SITE_ADDRESS` is a domain pointing at the instance.

## Priority score (100 points)
Fixed rules in code (never AI), so the same syllabus always gets the same score. Initial defaults from
[docs/design-brief.md section 5.2](docs/design-brief.md); they will be refined after the first evaluation run.

| Factor | Max | Rule |
|---|---|---|
| Lifecycle | 40 | Support stage from the registry / endoflife.date |
| Frequency | 30 | 6 points per page where the item appears, max 30 |
| Labs | 20 | 0 or 20: used in a lab (quote verified in the module) |
| Learning activities | 10 | 0 or 10: used in an activity (quote verified) |

**Priority:** High >= 80 · Medium >= 50 · Low below 50. Unverified items are not scored; they are flagged
"needs manual check". Weights: `backend/app/config.py`.

## Team workflow
- `main` holds the final, stable output. Work on `feature/*` branches, merge them into `develop` to test everything together, and merge `develop` into `main` only when it works.
- If you change the API shape, update `backend/app/models.py`, `frontend/src/types.ts` and `docs/api.md` together.
- UI changes follow [DESIGN.md](DESIGN.md): use the tokens and `frontend/src/components/ui/` components.
- Never commit `.env` or the private faculty syllabi (put them in `private/`, which is git-ignored).

## Documentation
- [docs/design-brief.md](docs/design-brief.md): full design reasoning and decisions (diagram: [docs/architecture.png](docs/architecture.png))
- [DESIGN.md](DESIGN.md): design system (colours, type, components, microcopy, accessibility)
- [docs/use-cases.md](docs/use-cases.md): personas, user stories, main use case
- [docs/architecture.md](docs/architecture.md): system, pipeline, sequence and deployment diagrams
- [docs/user-flow.md](docs/user-flow.md): user flow and screenshots
- [docs/api.md](docs/api.md): API contract
