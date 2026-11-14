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
      { "key": "lifecycle", "label": "Lifecycle", "points": 40, "max": 40, "reason": "…" },
      { "key": "teaching", "label": "How it is taught", "points": 30, "max": 30, "reason": "…" },
      { "key": "frequency", "label": "Frequency", "points": 8, "max": 20, "reason": "…" },
      { "key": "hands_on", "label": "Hands-on", "points": 10, "max": 10, "reason": "…" }
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

## Optional fields (all additive; the frontend works without them)
Sent by the pipeline since 0.5.0 unless marked *not sent yet*.

| Field | Where | Values | Used for |
|---|---|---|---|
| `kind` | `Finding` | `tool` · `language` · `framework` · `practice` · `topic` | Label before the name |
| `usage` | `Finding` | `code` · `explained` · `listed` (from `signals.teaching_depth`) | "Used in code students write · pages 4, 6" |
| `hands_on` | `Finding` | bool | "on a lab or exercise page" |
| `pages` | `Analysis` | `[{ "number": 1, "text": "…" }]` (cleaned page text) | The module column with highlights. Snippets are matched ignoring whitespace and quote style. |
| `lifecycle.source_name`, `lifecycle.source_quote` | `Finding` | publisher and the exact proving sentence | Source quote and link |
| `passages` | `Finding` | source-library passages (`fact` / `replacement`) | "From the source library" on finding detail |
| `provenance` | `Analysis` | versions, file hash, analysis date | "As of" date and "How this report was made" |
| `status: "less_used"`, `summary.less_used` | `Finding` | still supported, declining in industry | *Not sent yet* (needs trend data); badge exists |
| `coverage` | `Analysis` | `covered` (default) · `not_covered` | *Not sent yet*; "Not covered yet" page for non-tech modules (e.g. GED) |

Errors the frontend recognises on `POST /api/analyze`: `415` not a PDF · `413` too large · `422` with a message containing "scanned" · `429`/`503` service busy. Unknown `sample_id` returns `404`.

Still wanted later (see docs/ux/information-architecture.md, "Finding fields explained"): source tier, publisher,
passage text and dates; confidence; provenance stamp; job status for the progress page.
