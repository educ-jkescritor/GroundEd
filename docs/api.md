# API contract

Source of truth: `backend/app/models.py` (mirrored in `frontend/src/types.ts`).
While the backend is in progress, every endpoint returns **mock data in this exact shape**, so the frontend can be built in parallel.
Interactive docs: run the backend and open http://localhost:8000/docs

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/health` | none | `{status, gemini_configured}` |
| GET | `/api/samples` | none | `Sample[]` |
| POST | `/api/analyze` | multipart: `file` (PDF) **or** `sample_id` | `Analysis` |
| GET | `/api/analysis/{id}` | none | `Analysis` |
| POST | `/api/analysis/{id}/findings/{finding_id}/draft` | none | `Draft` |
| POST | `/api/feedback` | JSON `FeedbackIn` | `{ok, id}` |

## Example `Finding`
```json
{
  "id": "f1",
  "technology": "Python",
  "version": "2.7",
  "status": "eol",
  "citations": [{ "page": 2, "snippet": "Lab exercises use Python 2.7", "bbox": [72, 300, 320, 314] }],
  "lifecycle": {
    "product": "python", "cycle": "2.7", "eol_date": "2020-01-01",
    "latest_cycle": "3.x", "source_url": "https://endoflife.date/python"
  },
  "score": {
    "total": 82, "max": 100, "priority": "high",
    "breakdown": [
      { "key": "lifecycle", "label": "Lifecycle", "points": 40, "max": 40, "reason": "Support ended on 1 Jan 2020" },
      { "key": "frequency", "label": "Frequency", "points": 12, "max": 30, "reason": "Appears on 2 pages (6 points each)" },
      { "key": "labs", "label": "Labs", "points": 20, "max": 20, "reason": "Used in lab exercises (page 2)" },
      { "key": "activities", "label": "Learning activities", "points": 10, "max": 10, "reason": "Used in Assignment 3 (page 5)" }
    ]
  },
  "upgrade": { "target_cycle": "3.x (latest)", "source_url": "https://endoflife.date/python" }
}
```

`status` is one of `eol | nearing_eol | supported | unverified`. For `unverified`, `lifecycle` and `score` are `null`.
`score.priority` is `high` (>= 80), `medium` (>= 50) or `low`; if the backend omits it, the frontend derives it from `total`.
Scoring rules: [docs/design-brief.md section 5.2](design-brief.md). The backend owns this format; the frontend follows it.

## `FeedbackIn` (POST `/api/feedback`)
```json
{
  "role": "Faculty / lecturer",
  "country": "Philippines",
  "institution": "optional",
  "rating": 4,
  "would_use": "yes",
  "comments": "optional",
  "consent_to_quote": true,
  "analysis_id": "optional, set when coming from a results page"
}
```
`would_use` is `yes | maybe | no` (optional). `consent_to_quote` defaults to `false`; only quote comments where it is `true`.

## Additions for the side-by-side Report (14 Nov 2026, all optional)
The frontend works without these, but shows more when the backend sends them. Backend owner: please confirm or adjust.

| Field | Where | Values | Used for |
|---|---|---|---|
| `status: "less_used"` | `Finding` | new status: still supported, declining in industry | "Less used in industry" badge (never "end-of-life") |
| `kind` | `Finding` | `tool` · `language` · `framework` · `practice` · `topic` | Label before the name; filters |
| `usage` | `Finding` | `lab` · `activity` · `mentioned` | "Taught in labs · pages 4, 6" |
| `pages` | `Analysis` | `[{ "number": 1, "text": "…" }]` | The module column with highlights. Each citation `snippet` must appear verbatim in its page's `text`. |
| `summary.less_used` | `Analysis.summary` | count | Header counts |

Still wanted later (see docs/ux/information-architecture.md, "Finding fields explained"): source tier, publisher,
passage text and dates; confidence; provenance stamp; job status for the progress page.
