# Use Cases, Personas & Problem Statement

## 1. The Problem: Silent Curriculum Drift vs. Untrustworthy AI

University technology courses face a persistent three-way tension:
1. **Technology moves faster than curriculum review cycles:** Languages, frameworks, and functions reach end-of-life (`PHP 5.6`, `Python 2.7`, `Windows 7`, `Internet Explorer 11`) or are removed from modern runtimes (`mysql_connect()`, `mysql_query()`, ASP-style `<% %>` tags) while still appearing in inherited lecture slides and lab manuals (Dobslaw et al., 2023).
2. **Manual verification does not scale:** A faculty member teaching 3–5 courses per term—or a department chair reviewing 20+ modules before accreditation—rarely has time to cross-check every tool, function, and version against official release schedules and migration guides.
3. **Generic AI chatbots hallucinate and overstep:** Asking a standard LLM *"Is my course module outdated?"* produces confident, unsourced opinions, invented EOL dates, or wholesale rewrites that strip faculty ownership. Educators will only act on claims they can **verify in 30 seconds and defend** to a curriculum committee.

---

## 2. Personas & Who GroundEd Serves

| Persona | Role & Context | Core Goal | What Earns Their Trust |
|---|---|---|---|
| **Primary: Course Instructor**<br/>*(e.g., Prof. Ana Reyes, IT Faculty)* | Teaches 3–4 sections a term; revises modules 1–3 weeks before term starts. Strong in fundamentals, pressed for time. | *"Show me which tools or practices in my module may warrant review, with proof I can check in 30 seconds, while keeping me in control of every change."* | • Exact quote + clickable page highlight in their own PDF<br/>• Official source (`php.net`, `endoflife.date`, MDN, MySQL Reference) with date & link<br/>• First-class **Keep intentionally** option when teaching legacy tech on purpose |
| **Secondary: Curriculum Reviewer / Chair**<br/>*(e.g., Dr. Daniel Okafor, Program Chair)* | Reviews 10–30 course modules per year for department updates or accreditation. | *"Give me a consistent, evidence-backed summary I can export and attach to curriculum review minutes."* | • Deterministic 100-point priority score (same PDF = same score)<br/>• Cryptographic provenance stamp (`file_sha256`, registry & library versions)<br/>• Turnitin-style multi-page PDF and Markdown report export |
| **Tertiary: Instructional Designer / New Adjunct**<br/>*(e.g., Mx. Jamie Cruz)* | Inherited an older course module they did not write; needs a starting point for updates. | *"Help me understand why an inherited lab is dated and give me a starting replacement draft I can edit."* | • Side-by-side comparison of module quote vs. official migration passage<br/>• Clearly separated, editable **AI suggestion** grounded in the verified source |
| **Students & Self-Learners** | Checking whether a course guide or self-study module still reflects current industry practice. | *"Understand in plain language whether the tools in my lab guide are still supported."* | • Plain-English explanations and tooltips for terms like *End-of-life* and *Hands-on* |

> **Interaction Pattern:** *Side-by-side document and evidence review.* Upload a module → inspect interactive highlights on the PDF pages alongside prioritized findings and official sources → record faculty decisions → export an audit-ready PDF report.

---

## 3. Jobs to Be Done (JTBD)

**Main Job (Course Instructor):**  
*When* I prepare my course module for next term, *I want to* see which technologies and coding practices in it may be outdated—backed by exact quotes from my PDF and official documentation—*so I can* update what matters and still teach confidently without spending days checking everything by hand.

### Supporting Jobs & Target Outcomes

| # | When… | I want to… | So I can… | Who | Target Measure |
|---|---|---|---|---|---|
| **1** | I open my report | see the highest-impact items first | spend my limited prep time where it matters most | Instructor | Identify top priority item in `< 30s` |
| **2** | an item is flagged | see the quote from my module and the official source side by side | judge for myself whether the finding is accurate | Everyone | Verify quote & source in `< 30s` |
| **3** | I teach something legacy on purpose | mark it **Keep intentionally** with an optional note | have the report respect my pedagogical choice | Instructor | Record decision on first try |
| **4** | I agree an item needs updating | see the sourced replacement target and optionally generate an editable AI rewrite draft | update my lab or slide text faster | Instructor, Designer | Generate & edit draft in `< 30s` |
| **5** | I finish reviewing | export a Turnitin-style PDF or Markdown report with sources and decisions | share an audit-ready record with my chair or accreditor | Instructor, Reviewer | Export complete report in `< 1 min` |
| **6** | I review multiple modules | get deterministic, reproducible scores across runs | compare and discuss curriculum updates fairly | Reviewer / Chair | `100%` identical score on re-run |
| **7** | I first visit GroundEd | try it on built-in sample modules without signing up | evaluate the tool immediately | Everyone | Landing/Analyze to report in `< 1 min` |
| **8** | I upload a modern, up-to-date module | see `0% outdated` and `Nothing to review` | trust that the tool never invents false alarms | Everyone | `0` false positives on modern code |

---

## 4. Instructor Journey Map & Trust Moments

| Stage | 1. Notice the need | 2. Discover GroundEd | 3. Upload / Sample | 4. Analyze | 5. Scan Report | 6. Inspect Finding | 7. Decide | 8. Export & Share |
|---|---|---|---|---|---|---|---|---|
| **Doing** | Term is starting or chair requests a syllabus/module check | Opens GroundEd in browser | Uploads module PDF (`≤ 10 MB`) or picks one of the 3 built-in samples | Watches honest 4-step pipeline progress | Reads headline (`N findings to be reviewed`, `X% outdated`) and priority pills | Clicks a finding quote to highlight the exact line in the PDF and check `php.net` / `endoflife.date` | Chooses **Update** (with optional AI draft), **Keep intentionally**, or **Dismiss** | Exports the Turnitin-style PDF report or Markdown summary |
| **Thinking** | *"Which labs in this 200-page module use removed functions?"* | *"Is this another AI wrapper that makes things up?"* | *"Is my file safe? Can I test a sample first?"* | *"What is it actually checking?"* | *"What should I fix first before Monday's lab?"* | *"Is this really on page 165? Does the official manual say it was removed?"* | *"I want updated PDO wording here, but I'll keep the legacy note on page 209."* | *"Will my department chair accept this as curriculum review evidence?"* |
| **Feeling** | Pressured | Skeptical | Cautious → curious | Reassured | Focused | Convinced | In control | Confident |
| **Design Response** | Clear value prop: *"No source, no claim"* | One-click sample modules; no sign-in required | Privacy notice: uploaded PDFs deleted immediately after extraction | Named pipeline stages (`Reading → Detecting → Checking sources → Scoring`) | Ranked `High / Medium / Low` cards + `% outdated` metric | Synced PDF.js bounding-box highlight + verbatim official quote & link | Three equal decision controls + dashed-violet `"AI suggestion · Not a sourced fact"` box | Multi-page PDF export with Cover Page, Integrity Overview, Decisions, and Annotated Module Pages |

### Three Moments That Make or Break Faculty Trust
1. **The first finding they click (Stage 6):** The quoted snippet must actually appear on that exact PDF page (highlighted in place), and the external documentation link (`php.net`, `endoflife.date`, MDN, MySQL Reference) must resolve to a real authoritative record.
2. **The first time they disagree (Stage 7):** **Keep intentionally** and **Dismiss** are first-class decisions alongside **Update**—never hidden or treated as errors.
3. **The first time they see AI-generated text (Stage 7):** Optional Gemini rewrite drafts only appear when requested, are strictly grounded in the verified quote and source fact, and are visually isolated inside a dashed violet container labelled *"AI suggestion · Not a sourced fact"*.

---

## 5. Main Use Case: Reviewing a Course Module End to End

| Step | User Action | GroundEd System Action |
|---|---|---|
| **1. Open Analyze (`/analyze`)** | Opens GroundEd and clicks **Analyze a module** | Displays the PDF upload dropzone (`≤ 10 MB`, text-based PDF) and three built-in sample modules: **Legacy PHP lab manual**, **Modern PHP lab manual**, and **Web development course module** (228 pages). |
| **2. Submit Module** | Uploads a PDF or clicks **Web development course module (sample)** | Validates the `%PDF` header and size limit; extracts per-page text and word bounding boxes via PyMuPDF (`pdf.py`); deletes uploaded file immediately after extraction. |
| **3. Detect & Filter** | Watches step-by-step progress indicator | Matches text against the curated Facts Registry (`backend/registry/*.yaml`) and 37 versioned products (`products.yaml`), filters out historical/changelog lines (`rules/mentions.yaml`), and verifies every snippet exists verbatim on the page (`detect.py`). |
| **4. Verify & Retrieve RAG Passages** | | Resolves product versions against `endoflife.date` (`eol.py`) and verifies practice quotes inside the committed Source Library (`backend/library/snapshot/`). Retrieves supporting `fact` and `replacement` migration passages via SQLite FTS5 BM25 (`library.py`). Anything without a verified source is marked **Unverified**. |
| **5. Score & Stamp Provenance** | | Computes the deterministic 100-point priority score (`score.py`) from Lifecycle (`0–40`), How it is taught (`0–30`), Frequency (`0–20`), and Hands-on lab presence (`0–10`). Stamps cryptographic provenance (`file_sha256` + registry/library/rules/pipeline versions). |
| **6. Review Side-by-Side Workspace (`/reports/:id`)** | Scans the report header (`6 findings to be reviewed`, `62% OUTDATED`) and priority filters | Renders the interactive PDF in the left pane via PDF.js and the ranked findings list (`To review` / `Reviewed`) in the right pane. |
| **7. Inspect Dual Citations** | Clicks the `Page 165` chip on `PHP mysql extension (mysql_* functions)` | Scrolls the PDF viewer directly to Page 165 of 228 and highlights `$query = mysql_query("SELECT SUM(tuition) FROM tblstudent");` in red, alongside the official `php.net` removal notice and the `90/100` score breakdown popover. |
| **8. Generate Optional AI Draft** | Clicks **Generate draft** inside the finding card | Calls Gemini (`llm.py`) with only the verified module snippet and verified `php.net` fact; displays an editable PDO replacement example inside the dashed violet **AI suggestion · Not a sourced fact** box. |
| **9. Record Faculty Decision** | Selects **Update** (or **Keep intentionally** / **Dismiss**) and clicks **Save decision** | Moves the finding to the **Reviewed** section, updates the `% outdated` headline metric (`62% → 47%`), and persists the decision and approved wording in browser storage. |
| **10. Export Curriculum Review Report** | Clicks **Export report → Report as PDF** (or **Copy as Markdown**) | Generates a Turnitin-style multi-page PDF document containing a Cover Page, Integrity Overview, Findings & Decisions table, and Annotated Module Pages with numbered margin badges (`[✓ 1]`) and per-page footers. |

---

## 6. Edge Cases & Built-In Verification Paths

| Scenario | How GroundEd Handles It |
|---|---|
| **Up-to-date module (`Modern PHP lab manual` sample)** | Recognizes modern `PHP 8` and `PDO` prepared statements as currently supported and produces **0 findings** (`Nothing to review · 0% OUTDATED`), proving GroundEd never invents problems when a module is already current. |
| **Out-of-scope / non-technology course module** | Does not guess or hallucinate findings. Displays a calm empty state explaining that GroundEd covers IT, computing, and web development modules. |
| **Scanned PDF (image-only, no selectable text)** | Returns HTTP `422` (`scanned_pdf`) and informs the user: *"This PDF looks scanned (image-only), so we can't read its text yet. Please upload a PDF with selectable text or try a sample module."* |
| **Technology or version not in Registry / `endoflife.date`** | Marked **Unverified** (*"No trusted source found. GroundEd does not guess. Please check this one yourself"*) and excluded from priority scoring. |
| **AI draft endpoint busy or unconfigured (`429`/`503`)** | Core analysis, evidence citations, and 100-point priority scores succeed `100%` deterministically with zero LLM dependency. Only the optional draft box shows a non-blocking retry message. |

---

## 7. What GroundEd Deliberately Does Not Do

- **Never modifies the instructor's original PDF automatically:** It provides verifiable evidence, optional editable rewrite drafts, and an exportable review report.
- **Never uses AI to decide whether something is outdated or to calculate scores:** Facts come strictly from the curated Registry, Source Library, and `endoflife.date`; scores come strictly from deterministic Python rules (`score.py`).
- **Never judges teaching quality or pedagogy:** It checks technical currency and always provides a first-class **Keep intentionally** decision for instructors teaching legacy systems on purpose.
- **Never retains uploaded PDFs on disk:** Uploaded files are deleted immediately after text and bounding-box extraction (`finally: path.unlink(missing_ok=True)` in `backend/app/main.py`).
