# REST API Contract

Source of truth: `backend/app/models.py` (mirrored in `frontend/src/types.ts`).  
Interactive OpenAPI documentation: run the backend locally and open `http://localhost:8000/docs`.

## 1. Endpoints Overview

| Method | Path | Request Body / Params | Response Model | Description |
|---|---|---|---|---|
| `GET` | `/api/health` | none | `{status, gemini_configured}` | Liveness check & whether optional Gemini draft key is set |
| `GET` | `/api/samples` | none | `Sample[]` | Lists built-in sample modules from `backend/data/samples/samples.yaml` |
| `POST` | `/api/analyze` | `multipart/form-data`: `file` (PDF `≤ 10 MB`) **or** `sample_id` | `Analysis` | Runs the deterministic grounding & scoring pipeline on a PDF or sample |
| `GET` | `/api/analysis/{id}` | none | `Analysis` | Retrieves a previously computed analysis and its provenance receipt |
| `GET` | `/api/analysis/{id}/pdf` | none | `application/pdf` | Serves the PDF for built-in samples in the side-by-side PDF.js viewer |
| `POST` | `/api/analysis/{id}/findings/{finding_id}/draft` | none | `Draft` | Generates (or returns cached) optional AI rewrite suggestion for a verified finding |
| `POST` | `/api/feedback` | JSON `FeedbackIn` | `FeedbackOut` (`{ok, id}`) | Stores educator/reviewer feedback in SQLite |

---

## 2. Example `Finding` Payload

```json
{
  "id": "f1",
  "technology": "PHP mysql extension (mysql_* functions)",
  "version": null,
  "kind": "practice",
  "status": "eol",
  "usage": "code",
  "hands_on": false,
  "citations": [
    {
      "page": 165,
      "snippet": "$query = mysql_query(\"SELECT SUM(tuition) FROM tblstudent\");",
      "bbox": [112.4, 241.8, 518.2, 256.4]
    }
  ],
  "lifecycle": {
    "product": "php-mysql-ext",
    "cycle": null,
    "eol_date": "2015-12-03",
    "latest_cycle": "mysqli or PDO (with prepared statements)",
    "source_url": "https://www.php.net/manual/en/migration70.incompatible.php",
    "source_name": "PHP Manual (php.net)",
    "source_quote": "All ext/mysql functions were removed. For details about choosing a different MySQL API, see Choosing a MySQL API."
  },
  "score": {
    "total": 90,
    "max": 100,
    "priority": "high",
    "breakdown": [
      { "key": "lifecycle", "label": "Lifecycle", "points": 40, "max": 40, "reason": "Support ended or feature removed on 2015-12-03." },
      { "key": "teaching", "label": "How it is taught", "points": 30, "max": 30, "reason": "Used in code that students write or copy." },
      { "key": "frequency", "label": "Frequency", "points": 20, "max": 20, "reason": "Appears on 9 pages (4 points each, max 20)." },
      { "key": "hands_on", "label": "Hands-on", "points": 0, "max": 10, "reason": "No lab, exercise or activity page found." }
    ]
  },
  "upgrade": {
    "target_cycle": "mysqli or PDO (with prepared statements)",
    "source_url": "https://www.php.net/manual/en/mysqlinfo.api.choosing.php"
  },
  "passages": [
    {
      "role": "fact",
      "title": "PHP 7.0 Backward Incompatible Changes",
      "publisher": "PHP Group (php.net)",
      "source_url": "https://www.php.net/manual/en/migration70.incompatible.php",
      "text": "All ext/mysql functions were removed. For details about choosing a different MySQL API, see Choosing a MySQL API."
    },
    {
      "role": "replacement",
      "title": "Choosing a MySQL API",
      "publisher": "PHP Group (php.net)",
      "source_url": "https://www.php.net/manual/en/mysqlinfo.api.choosing.php",
      "text": "It is recommended to use either the mysqli or PDO_MySQL extensions. It is not recommended to use the old mysql extension for new development."
    }
  ]
}
```

- `status` is one of `eol | nearing_eol | supported | unverified`. For `unverified`, `lifecycle` and `score` are `null`.
- `score.priority` is `high` (`≥ 80`), `medium` (`50–79`), or `low` (`< 50`).
- Scoring rules are implemented in `backend/app/score.py` and documented in [docs/architecture.md](architecture.md).

---

## 3. `FeedbackIn` (`POST /api/feedback`)

```json
{
  "role": "Faculty / lecturer",
  "country": "Philippines",
  "institution": "optional",
  "rating": 5,
  "would_use": "yes",
  "comments": "optional",
  "consent_to_quote": true,
  "analysis_id": "optional, set when coming from a report page"
}
```

---

## 4. Field Reference (`Analysis` & `Finding`)

| Field | Model | Values | Purpose |
|---|---|---|---|
| `kind` | `Finding` | `tool` · `language` · `framework` · `practice` · `topic` | Category label shown on finding cards and filters |
| `usage` | `Finding` | `code` · `explained` · `listed` | Teaching depth classification from `backend/app/signals.py` |
| `hands_on` | `Finding` | `boolean` | Whether the finding appears on a lab, exercise, or activity page |
| `citations[].bbox` | `Citation` | `[x0, y0, x1, y1]` (PDF points) | Exact bounding-box coordinates used by `PdfViewer.tsx` and `ReportExport.tsx` |
| `pages` | `Analysis` | `[{ "number": 1, "text": "…" }]` | Extracted per-page text for text-fallback viewing and word/character metrics |
| `passages` | `Finding` | `SourcePassage[]` (`fact` / `replacement`) | Contextual passages retrieved from the SQLite FTS5 Source Library (`library.py`) |
| `provenance` | `Analysis` | `Provenance` | Cryptographic receipt: `file_sha256`, `pipeline_version`, `registry_version`, `library_version`, `rules_version`, `analysis_date` |

---

## 5. Error Status Codes (`POST /api/analyze` & `/draft`)

| HTTP Status | Condition | User-Facing Handling |
|---|---|---|
| `404` | Unknown `sample_id` or `analysis_id` | Not found notice with link back to `/analyze` |
| `413` | Uploaded PDF exceeds `MAX_UPLOAD_MB` (`10 MB`) | Inline file-size message on `/analyze` |
| `415` | Uploaded file is not a valid `%PDF` document | Inline file-type message on `/analyze` |
| `422` | Scanned / image-only PDF (`scanned_pdf`) | Friendly notice prompting user to try a selectable-text PDF or sample |
| `429` / `503` | Concurrency limit or Gemini draft service busy | Core report remains intact; optional draft button shows a retry prompt |
