# System Architecture & Grounding Pipeline

GroundEd is built around a strict separation of responsibilities: **code extracts, verifies, retrieves, and scores evidence; the LLM only drafts optional replacement wording from verified evidence; the faculty member decides.**

![GroundEd Architecture Overview](architecture.png)

## 1. System Overview

```mermaid
flowchart LR
    U["Faculty / Reviewer Browser<br/>React 18 + Vite + TS + Tailwind v4 + PDF.js"] -->|HTTPS| C["Caddy 2 Reverse Proxy<br/>Auto-HTTPS + Static SPA"]
    C -->|/api/*| A["FastAPI Backend<br/>(Python 3.12 + Pydantic v2)"]

    subgraph Core["Deterministic Grounding Engine (Code Only)"]
        P["PyMuPDF (pdf.py)<br/>Page text + highlight bboxes"]
        D["Detector (detect.py)<br/>Registry patterns + mention rules"]
        R["Facts Registry (registry/*.yaml)<br/>Deprecated/removed practices"]
        E["endoflife.date Snapshot (eol.py)<br/>37 product release cycles & EOL dates"]
        L["Source Library RAG (library.py)<br/>Curated docs + SQLite FTS5 BM25"]
        S["Signals & Scoring (signals.py, score.py)<br/>Teaching depth + 100-pt Option C score"]
    end

    A --> P
    A --> D
    D --> R
    D --> E
    R --> L
    E --> L
    L --> S

    A -.->|"POST /draft only<br/>(temperature 0, cached)"| G["Google Gemini API<br/>(llm.py — AI suggestion)"]
    A --> DB[("SQLite WAL (db.py / cache.py)<br/>Analyses, 24h cache, drafts, feedback")]
```

---

## 2. Analysis & Grounding Pipeline

Every uploaded module (or sample syllabus) passes through a deterministic, 6-stage verification pipeline (`backend/app/pipeline.py`):

```mermaid
flowchart TD
    A["Course Module PDF"] --> B["1. Read PDF (pdf.py)<br/>Extract per-page text, strip repeated headers,<br/>reject scanned/image-only PDFs"]
    B --> C["2. Detect Mentions (detect.py)<br/>Match against Registry regexes & 37 products;<br/>filter history/changelog lines (rules/mentions.yaml)"]
    C --> D{"3. Snippet verified<br/>verbatim on page?"}
    D -- No --> X["Drop candidate<br/>(prevent hallucination)"]
    D -- Yes --> E{"4. Evidence Type"}

    E -- "Practice / Function<br/>(e.g. mysql_connect, <% %>)" --> F1["Lookup Static Fact (registry/*.yaml)<br/>Verify exact quote exists in<br/>committed Source Library doc"]
    E -- "Product / Version<br/>(e.g. PHP 5.6, Windows 7)" --> F2["Resolve Version (eol.py)<br/>Match against endoflife.date<br/>release cycle & EOL date"]
    E -- "Unknown to Registry" --> U["Status: Unverified<br/>('Needs manual check' — never scored)"]

    F1 --> G{"Source verified?"}
    F2 --> G
    G -- No --> U
    G -- Yes --> H{"Still supported?"}
    H -- Yes --> Sup["No finding emitted<br/>(Currently supported)"]
    H -- "No (EOL / Nearing EOL / Deprecated)" --> I["5. Retrieve RAG Passages (library.py)<br/>SQLite FTS5 BM25 passage retrieval:<br/>• Fact passage (around source quote)<br/>• Replacement passage (upgrade guide)"]

    I --> J["6. Teaching Signals & Rule Score (signals.py, score.py)<br/>Compute 0–100 score:<br/>Lifecycle (40) + How it is taught (30) + Frequency (20) + Hands-on (10)"]
    J --> K["7. Stamp Provenance & Save Analysis<br/>SHA-256 file hash + registry/library/rules/pipeline versions"]
    K --> L["8. Faculty Review & Turnitin-Style PDF Export<br/>Inspect PDF highlight + source passage;<br/>choose Update / Keep intentionally / Dismiss"]
```

---

## 3. Non-Negotiable Grounding Rules

1. **No source, no claim.** Every scored finding requires **two verified citations**:
   - **Where it appears in the module:** page number, verbatim snippet, and bounding box coordinates (`bbox`) on the PDF page (`backend/app/pdf.py`).
   - **Why it may warrant review:** either a lifecycle record from `endoflife.date` (`backend/app/eol.py`) or a verbatim quote verified by code inside a curated official document (`backend/library/snapshot/`, e.g., PHP Manual, MDN, MySQL Reference, Microsoft Docs).
2. **Unverified items are never guessed.** If a technology or version cannot be verified against the Facts Registry or `endoflife.date`, its status is set to `unverified` (*"No trusted source found. GroundEd does not guess"*), and it receives no priority score.
3. **The AI never supplies facts or scores.** All priority scores (`0–100`) are computed by deterministic rules in `backend/app/score.py` and `backend/app/signals.py` configured via `backend/rules/teaching.yaml`. Running the same PDF twice always produces the exact same findings and scores.
4. **Sourced facts and AI suggestions never look alike.** Gemini (`backend/app/llm.py`) is called **only** when a user explicitly clicks **Generate draft** on a verified finding, and receives only the verified module snippets and verified source facts. In the UI, AI drafts are isolated inside a dashed violet container labelled *"AI suggestion · Not a sourced fact"*.
5. **Every report carries a cryptographic provenance receipt.** `Analysis.provenance` records the PDF's `file_sha256`, `pipeline_version`, `registry_version`, `library_version`, `rules_version`, `eol_data` timestamps, and `analysis_date`.

---

## 4. Sequence Diagram: End-to-End Module Review

```mermaid
sequenceDiagram
    actor F as Faculty / Reviewer
    participant W as React SPA (Browser)
    participant C as Caddy 2 Proxy
    participant A as FastAPI (main.py)
    participant P as Pipeline (pdf / detect / registry / eol / library / score)
    participant DB as SQLite WAL (db.py / cache.py)
    participant G as Gemini API (llm.py)

    F->>W: Upload module PDF (or pick sample)
    W->>C: POST /api/analyze (multipart PDF or sample_id)
    C->>A: Forward request
    A->>P: Validate %PDF header & size -> run_pipeline()
    P->>P: Extract page text + bounding boxes (PyMuPDF)
    P->>P: Match registry patterns & filter non-teaching mentions
    P->>P: Verify quotes in Source Library & resolve endoflife.date cycles
    P->>P: Retrieve FTS5 BM25 supporting & replacement passages
    P->>P: Compute teaching depth, hands-on signal & 100-pt score
    P->>DB: Cache & store Analysis + Provenance stamp
    A-->>W: 200 OK — Analysis JSON (findings, pages, summary, provenance)
    W-->>F: Render side-by-side Report (PDF.js viewer + ranked findings)

    opt Faculty requests an AI rewrite suggestion
        F->>W: Click "Generate draft" on a verified finding
        W->>A: POST /api/analysis/{id}/findings/{fid}/draft
        A->>DB: Check deterministic draft cache
        alt Cache miss
            A->>G: Prompt with verified module snippet + verified source fact
            G-->>A: Suggested replacement paragraph
            A->>DB: Save draft in cache
        end
        A-->>W: Draft JSON (text + model name)
        W-->>F: Display in "AI suggestion · Not a sourced fact" box for editing
    end

    F->>W: Record decision (Update / Keep intentionally / Dismiss + note)
    W->>W: Persist decision in browser & render Turnitin-style PDF / Markdown export
```

---

## 5. Source Library (RAG) & Knowledge Architecture

To guarantee zero broken links and deterministic reproducibility during evaluation, GroundEd uses a **curated, snapshot-backed RAG library** (`backend/library/`):

| Component | Path | Responsibility |
|---|---|---|
| **Source Manifest** | `backend/library/sources.yaml` | Lists authoritative Tier-1/Tier-2 documentation URLs (`php.net`, MDN, MySQL Reference, Microsoft Docs) and `endoflife.date` products. |
| **Committed Snapshot** | `backend/library/snapshot/` | Normalized text snapshots and 37 `endoflife.date` JSON product records committed to the repo so offline/hackathon runs never fail on external network hiccups. |
| **Facts Registry** | `backend/registry/*.yaml` | Maps regex patterns (`php.yaml`, `products.yaml`) to either an `endoflife.date` product cycle or a `StaticFact` with an exact quote verified inside the snapshot library. |
| **FTS5 Passage Index** | `backend/app/library.py` | Indexes snapshot documents into an in-memory SQLite FTS5 table (`BM25`) to retrieve contextual `fact` passages and `replacement` migration passages per finding. |
| **Teaching & Scope Rules** | `backend/rules/teaching.yaml`, `mentions.yaml`, `coverage.yaml` | Data-driven regex rules that filter changelogs, classify how an item is taught (`code` vs. `explained` vs. `listed`), detect lab/activity pages (`hands_on`), and enforce registry/snapshot parity. |

---

## 6. Deployment Architecture (Vultr Cloud Compute)

```mermaid
flowchart LR
    subgraph Internet
      B["Browser"]
    end
    subgraph V["Vultr Cloud Compute Instance (Ubuntu 24.04 LTS + Docker Compose)"]
      direction LR
      subgraph web["container: web"]
        C["Caddy 2 :80 / :443<br/>Auto HTTPS (Let's Encrypt)<br/>Serves built React SPA"]
      end
      subgraph be["container: backend"]
        A["FastAPI :8000 (Uvicorn, non-root)<br/>PyMuPDF + Registry + FTS5 Library"]
        S[("Docker Volume: grounded_data<br/>SQLite WAL DB (analyses, cache, feedback)")]
        A --- S
      end
    end
    B -->|"HTTPS :443"| C
    C -->|"/api/* -> :8000"| A
    A -->|"HTTPS (drafts only)"| G["Google Gemini API"]
    A -.->|"HTTPS (refresh snapshot)"| E["endoflife.date API"]
```

- Only ports `22` (SSH), `80`, and `443` are exposed on the host firewall (`ufw`).
- The FastAPI container (`:8000`) runs as a non-root user and is reachable only inside the internal Docker network via Caddy.
- Uploaded PDFs are deleted immediately after text and bounding-box extraction (`finally: path.unlink(missing_ok=True)` in `backend/app/main.py`).
