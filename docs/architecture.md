# Architecture

```mermaid
flowchart LR
    U[Faculty browser<br/>React + Vite SPA] -->|HTTPS| C[Caddy<br/>Vultr Compute]
    C -->|static files| S[(React build)]
    C -->|/api/*| A[FastAPI]
    A --> P[PyMuPDF<br/>page text + positions]
    A --> G[Gemini<br/>detect mentions, draft text]
    A --> E[endoflife.date API<br/>cached lifecycle records]
    A --> D[(SQLite<br/>analyses, feedback)]
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
