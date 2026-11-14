# Architecture

```mermaid
flowchart LR
    U[Faculty browser<br/>React + Vite SPA] -->|HTTPS| C[Caddy<br/>Vultr Compute]
    C -->|static files| S[(React build)]
    C -->|/api/*| A[FastAPI]
    A --> P[PyMuPDF<br/>page text + positions]
    A --> G[Gemini<br/>detect mentions, draft text]
    A --> E[endoflife.date API<br/>cached lifecycle records]
    A --> D[(PostgreSQL + pgvector<br/>registry, source passages,<br/>reports, feedback)]
```

## Analysis pipeline

```mermaid
flowchart TD
    A[Syllabus PDF] --> B[Extract text per page]
    B --> C[Gemini: list technology mentions + verbatim snippet]
    C --> D{Snippet found on page?}
    D -- no --> X[Drop: possible hallucination]
    D -- yes --> E{Matches an endoflife.date product?}
    E -- no --> U[Unverified: needs manual check]
    E -- yes --> F[Fetch lifecycle record]
    F --> G[Status: EOL / nearing EOL / supported]
    G --> H[Priority score 0-100 with breakdown]
    H --> I[Faculty reviews: evidence, upgrade, or AI draft]
    I --> J{Approve?}
    J -- yes --> K[Included in report]
```

## Grounding rules
- Lifecycle facts come **only** from endoflife.date and always carry a link.
- Syllabus citations are verbatim text with a page number.
- LLM output is limited to detection (verified against page text) and drafts (labelled "AI suggestion, not sourced").
- Nothing is applied without faculty approval.

## Sequence: analyzing one syllabus

```mermaid
sequenceDiagram
    actor F as Faculty
    participant W as React app
    participant C as Caddy
    participant A as FastAPI
    participant P as PyMuPDF
    participant G as Gemini
    participant E as endoflife.date
    participant D as PostgreSQL

    F->>W: Upload PDF (or pick sample)
    W->>C: POST /api/analyze
    C->>A: proxy
    A->>P: extract text per page
    P-->>A: pages + word positions
    A->>G: list technology mentions (JSON)
    G-->>A: mentions + snippets
    A->>A: keep only snippets found verbatim on the page
    A->>E: lifecycle records (cached)
    E-->>A: cycles, EOL dates
    A->>A: status + 100-point score
    A->>D: save analysis
    A-->>W: Analysis (findings + citations)
    W-->>F: Results with evidence
    F->>W: Draft section (optional)
    W->>A: POST /api/analysis/{id}/findings/{fid}/draft
    A->>G: draft updated text
    G-->>A: draft
    A-->>W: Draft (labelled AI suggestion)
    F->>W: Edit + Approve (stored in browser, included in export)
```

## Deployment on Vultr

```mermaid
flowchart LR
    subgraph Internet
      B[Browser]
    end
    subgraph V[Vultr Compute instance: Ubuntu + Docker]
      direction LR
      subgraph web[container: web]
        C[Caddy :80/:443<br/>auto HTTPS<br/>serves React build]
      end
      subgraph be[container: backend]
        A[FastAPI :8000]
      end
      PG[(container: postgres<br/>PostgreSQL + pgvector)]
      A --- PG
    end
    B -->|HTTPS 443| C
    C -->|/api/* → :8000| A
    A -->|HTTPS| G[Gemini API]
    A -->|HTTPS| E[endoflife.date]
```

Only ports 22 (SSH), 80 and 443 are open. The backend port 8000 is reachable only inside the Docker network.
