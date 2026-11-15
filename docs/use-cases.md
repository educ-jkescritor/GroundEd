# Use Cases & Problem Statement

## 1. The Problem: Silent Curriculum Drift vs. Untrustworthy AI

University technology courses face a persistent tension:
1. **Technology moves faster than curriculum review cycles:** Languages, frameworks, and functions reach end-of-life (`PHP 5.6`, `Python 2.7`, `AngularJS`, `Bootstrap 3`) or are removed from modern runtimes (`mysql_connect()`, `<font>` tags) while still appearing in inherited lecture notes and lab guides (Dobslaw et al., 2023).
2. **Manual verification does not scale:** A faculty member teaching 3–5 courses per term—or a department chair reviewing 20 modules before accreditation—rarely has time to cross-check every tool, function, and version against official release schedules and migration guides.
3. **Generic AI chatbots hallucinate and overstep:** Asking a standard LLM *"Is my syllabus outdated?"* produces confident, unsourced opinions, invented EOL dates, or wholesale rewrites that strip faculty ownership. Educators will only act on claims they can **verify and defend** to a curriculum committee.

---

## 2. Who GroundEd Is For

| Persona | Role & Context | Core Job to Be Done | What Earns Their Trust |
|---|---|---|---|
| **Primary: Course Instructor**<br/>*(e.g., Prof. Ana Reyes, IT Faculty)* | Teaches 3–4 sections a term; revises modules 1–3 weeks before term starts. Strong in fundamentals, pressed for time. | *"Show me which tools or practices in my module may warrant review, with proof I can check in 30 seconds, while keeping me in control of every change."* | • Exact quote + page number from their own PDF<br/>• Official source (`php.net`, `endoflife.date`, MDN) with date<br/>• Ability to mark **Keep intentionally** when teaching legacy tech on purpose |
| **Secondary: Curriculum Reviewer / Chair**<br/>*(e.g., Dr. Daniel Okafor, Program Chair)* | Reviews 10–30 course modules per year for department updates or accreditation. | *"Give me a consistent, evidence-backed summary I can export and attach to curriculum review minutes."* | • Deterministic 100-point priority score (same PDF = same score)<br/>• Cryptographic provenance stamp ("as of" date, registry & library versions)<br/>• Printable PDF / Markdown report export |
| **Tertiary: Instructional Designer / New Adjunct**<br/>*(e.g., Mx. Jamie Cruz)* | Inherited an older course module they did not write; needs a starting point for updates. | *"Help me understand why an inherited lab is dated and give me a starting replacement draft I can edit."* | • Side-by-side comparison of module quote vs. migration guide passage<br/>• Clearly separated, editable **AI suggestion** grounded in the verified source |
| **Students & Self-Learners** | Checking whether a course guide or self-study module still reflects current industry practice. | *"Understand in plain language whether the tools in my lab guide are still supported."* | • Plain-English explanations and tooltips for terms like *End-of-life* and *Hands-on* |

> **Interaction Pattern:** *Side-by-side document and evidence review.* Upload a module → get a prioritized report → inspect highlights in the document alongside the authoritative sources behind them.

---

## 3. Core User Stories

1. **Source-backed detection:** *As an instructor, I want to upload my course module PDF (or try a built-in sample) and see every outdated language, framework, database, or coding practice with its exact PDF page/quote and an official lifecycle or documentation record.*
2. **Transparent prioritization:** *As an instructor, I want to see why a finding is ranked High, Medium, or Low priority via a deterministic 100-point score breakdown (Lifecycle, How it's taught, Frequency, Hands-on).*
3. **Side-by-side verification:** *As an instructor, I want to view my PDF module with highlighted mentions right next to the ranked findings and retrieved source passages so I can verify context immediately.*
4. **Faculty-in-the-loop decisions:** *As an instructor, I want to record a decision on each finding—**Update** (with an optional AI-drafted rewrite), **Keep intentionally** (e.g., taught for historical context), or **Dismiss** (with an optional reason)—and undo at any time.*
5. **Shareable evidence report:** *As a curriculum reviewer, I want to export the reviewed report (including provenance metadata, citations, and faculty decisions) as Markdown or a printable PDF.*

---

## 4. Main Use Case: Reviewing a Course Module

| Step | User Action | GroundEd System Action |
|---|---|---|
| **1. Start** | Opens GroundEd and clicks **Analyze a module** | Displays the upload dropzone, scope guidance (technology courses, text-based PDFs up to 10 MB), and one-click sample modules. |
| **2. Input** | Uploads a syllabus/module PDF (or selects a sample such as *Web Systems — Legacy PHP & MySQL*) | Validates the `%PDF` file header and size limit; extracts per-page text and word bounding boxes via PyMuPDF; deletes the uploaded file from disk once extracted. |
| **3. Detect & Verify** | Observes progress steps (*Reading → Detecting → Checking sources → Scoring*) | Matches text against the Facts Registry (`backend/registry/*.yaml`), filters out historical/changelog mentions (`rules/mentions.yaml`), and verifies every snippet exists verbatim on the page. |
| **4. Ground Evidence** | | Resolves product versions against `endoflife.date` and verifies practice quotes against the committed Source Library (`backend/library/snapshot/`). Retrieves supporting and replacement passages via SQLite FTS5. Anything without a verified source is marked **Unverified**. |
| **5. Score & Rank** | | Computes the deterministic 100-point priority score (`score.py`) based on lifecycle stage (40), teaching depth (30), page frequency (20), and hands-on lab presence (10). Stamps provenance metadata. |
| **6. Inspect Report** | Reviews the **Report workspace** (`/reports/:id`) | Shows the module viewer (PDF with highlighted bounding boxes or extracted text) on the left and findings grouped/ranked by priority on the right. |
| **7. Examine Evidence** | Expands a finding or opens **Finding detail** (`/reports/:id/findings/:fid`) | Displays the verbatim module quote + page number alongside the official source quote (`php.net`, `endoflife.date`, MDN), publisher, link, retrieved RAG passages, and 100-point score breakdown. |
| **8. Optional AI Draft** | Clicks **Generate AI draft** under the Update flow | Sends only the verified module quote and verified source fact to Gemini (`llm.py`) to draft updated wording, displayed inside a dashed violet **"AI suggestion — not sourced"** container for user editing. |
| **9. Decide** | Chooses **Update**, **Keep intentionally**, or **Dismiss** (with optional reason) | Saves the decision badge in the browser; once all findings are reviewed, displays the completion state (*"All findings reviewed. Your module is ready for next term"*). |
| **10. Export & Feedback** | Clicks **Export** (Copy Markdown or Print / Save PDF) and optionally submits **Feedback** | Generates a clean, shareable curriculum review report with citations, decisions, and provenance receipt. |

---

## 5. Edge Cases & Alternative Paths

| Scenario | How GroundEd Handles It |
|---|---|
| **Out-of-scope / non-tech module (e.g., Ethics in Society GED sample)** | Does not invent findings. Displays a calm **"No findings / Outside technology scope"** state explaining that GroundEd currently covers IT, computing, and web development modules. |
| **Scanned PDF (image-only, no selectable text)** | Returns HTTP `422` and informs the user: *"This PDF looks scanned, so we can't read its text yet. Try a text-based PDF or explore a sample."* |
| **Technology not in Registry / `endoflife.date`** | Marked **Unverified** (*"No trusted source found. GroundEd does not guess. Please check this one yourself"*) and excluded from priority scoring. |
| **Currently supported technology (e.g., PHP 8.3)** | Recognized and resolved against `endoflife.date`, confirmed as supported, and omitted from outdated findings so faculty are never nagged about current tools. |
| **AI draft service busy or unconfigured** | Core analysis, evidence retrieval, and scoring still succeed 100% deterministically (zero LLM dependency). Only the optional draft button displays a friendly retry notice. |

---

## 6. What GroundEd Deliberately Does Not Do

- **Never modifies the instructor's original file automatically:** It produces advisory evidence, optional drafts, and an exportable review report.
- **Never uses AI to decide whether something is outdated or to calculate scores:** Facts come strictly from the curated Registry, Source Library, and `endoflife.date`; scores come strictly from fixed code rules.
- **Never judges teaching quality or pedagogy:** It checks technical currency and always provides a first-class **Keep intentionally** decision for instructors teaching legacy systems on purpose.
- **Never retains uploaded PDFs on disk:** Uploaded files are unlinked immediately after analysis (`backend/app/main.py`).
