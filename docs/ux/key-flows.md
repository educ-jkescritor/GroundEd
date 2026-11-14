# Key flows

> **Status: draft for review (Phase 2).** Each flow lists its success criterion (from
> [jobs-to-be-done.md](jobs-to-be-done.md)), to be measured in the Phase 7 usability check.

## 1. First visit → try a sample
**Success:** first finding visible in under 1 minute.
```mermaid
flowchart LR
    A[Landing] -->|Try a sample| B[Analyze: sample cards]
    B -->|Pick sample| C[Report<br/>pre-analysed, opens instantly]
    C --> D[Top finding]
```

## 2. Upload → progress → report
**Success:** user never wonders whether it's stuck.
```mermaid
flowchart TD
    A[Analyze] -->|Drop / choose PDF| V{Valid? PDF, ≤ size limit}
    V -- no --> E1[Inline error + how to fix]
    V -- yes --> P[Progress page<br/>Reading → Detecting → Checking sources → Scoring]
    P -->|done| R[Report: module + ranked findings]
    P -->|leave page| N[Report keeps processing<br/>Find it in Reports history]
    P -->|failed| E2[Error page: what failed + try again / use a sample]
```

## 3. Review a finding → decide
**Success:** explains why it's flagged in under 30 s; records a decision first try.
```mermaid
flowchart TD
    R[Report] -->|Click item or highlight| FD[Finding detail]
    FD --> EV[Module quote + page ⇄ source passage + tier + date]
    EV --> Q{Agree?}
    Q -- yes --> U[Update]
    U --> U1[Accept sourced upgrade]
    U --> U2[Ask for AI draft → edit → approve]
    Q -- taught on purpose --> K[Keep intentionally + reason]
    Q -- not outdated / wrong --> D[Dismiss + reason]
    U1 & U2 & K & D --> B[Decision badge on finding · Undo available]
    B -->|Next finding| FD
```

## 4. Export and share
**Success:** shareable report in under 1 minute.
```mermaid
flowchart LR
    R[Report] --> X{Export}
    X --> P[Print / Save as PDF<br/>with sources, decisions, as-of date]
    X --> M[Copy as Markdown]
```

## 5. Sign in with the demo account → history
```mermaid
flowchart LR
    S[Sign in] -->|Continue with demo account| H[Reports history<br/>2–3 sample reports]
    H --> R[Open a report]
    G[Guest analyses] -.->|after sign-in| H
```

## 6. Feedback
```mermaid
flowchart LR
    R[Report] -->|Give feedback| F[Feedback form<br/>role, country, rating, would use, comments, consent]
    F --> T[Thank-you + analyze another]
```

## 7. Error and edge paths (what the user sees)
| Situation | Message (draft) | Way forward |
|---|---|---|
| Not a PDF / too large | "Please choose a PDF up to 10 MB." | Choose another file |
| Scanned PDF (no text) | "This PDF looks scanned, so we can't read its text yet." | Upload a text-based PDF · Try a sample |
| **GED / non-tech module** | "This module looks like it's outside technology courses. GroundEd covers IT and computing courses for now, so there's nothing to report." | Analyze another module · Learn what's covered (Methodology) |
| No findings in a tech module | "We didn't find technologies or practices that may warrant review." + what was checked | Export the clean report |
| AI service busy | "Our analysis service is busy right now. Your module wasn't lost: try again in a minute, or explore a sample." | Retry · Sample |
| A source link is dead | Show the stored passage snapshot + "Link checked on {date}" | Read the snapshot |
| Network lost | "Can't reach GroundEd. Check your connection." | Retry |
