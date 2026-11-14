# Personas

> **Status: provisional (Phase 1, 14 Nov 2026).** No interview notes were available, so these personas are
> built from the problem validation summary, the design brief and common faculty workflows. Every item marked
> *(assumption)* must be checked in the Phase 7 usability check and updated afterwards.

## Design decisions from Phase 1
| Topic | Decision |
|---|---|
| Primary user | **Course instructor** revising their own module. The main flow is optimised for them. |
| Who can use it | **Anyone** who wants to check a module for outdated information: instructors (including IT instructors), reviewers, instructional designers, **students**. No role restrictions or separate modes. |
| Course scope | **Technology-related courses only** (e.g. IT, CS, IS, web development and related subjects). **General education (GED) courses are not in scope yet.** Out-of-scope modules get a clear "not covered yet" message, not invented findings. |
| Mental model | **"Like Turnitin, but for currency."** Faculty already know the pattern: upload a document → get a report → see highlights in the document with their sources beside them. We reuse this *interaction pattern*, not Turnitin's look, wording or branding. |
| Devices | **Laptop/desktop first** (1280 px and up, side-by-side evidence). Phones get a readable stacked layout. |
| Language | **English only** UI, in plain international English. Uploaded modules may contain other languages (e.g. Filipino). |

---

## Primary persona: the course instructor

**Prof. Ana Reyes**: Assistant Professor, BS Information Technology, a state university in the Philippines *(assumption)*

> "I know some of my lab tools are old, but I don't have time to check every one before the term starts." *(representative quote, not real)*

| | |
|---|---|
| **Teaches** | 3–4 sections a term: Web Systems & Technologies, Integrative Programming |
| **Experience** | 8 years teaching; strong in fundamentals, less time to follow every framework release *(assumption)* |
| **Tools they already use** | Turnitin or similar checkers, Google Classroom / Canvas / Moodle, Word/Google Docs, PDF modules *(assumption)* |
| **Device** | Faculty-room laptop or home laptop, sometimes slow internet |
| **When they'd use GroundEd** | 1–3 weeks before a term, while updating the module; when a department asks for a curriculum revision |

**Goals**
- Find what's outdated in their module quickly, without reading release notes for every tool.
- Be able to *defend* any change to a chair or accreditor, with sources.
- Keep control: change only what they agree with.

**Frustrations**
- Syllabus reviews are manual and infrequent; there's no time to check every tool.
- Generic AI chatbots answer confidently without sources, so they can't be trusted.
- Tools that "rewrite" documents automatically feel like losing ownership.

**Trust triggers** (what makes them believe a result)
- A quote from *their own* module, with the page number.
- A recognised source (official docs, endoflife.date) with a date.
- Cautious wording ("may warrant review"), not blame.
- Being able to say "keep this on purpose" without being nagged.

**Accessibility and reading needs**
- Reads long reports on a laptop, so needs comfortable text size and line length.
- Wide age range in faculty means larger text, high contrast and no tiny grey labels *(assumption)*.

**Success for them:** "In 10 minutes I knew which 3 things to update, and I had links to show my chair."

---

## Secondary persona: the curriculum reviewer

**Dr. Daniel Okafor**: Program Chair, Computing department, a university outside the Philippines *(assumption: supports the multi-country Reach goal)*

> "Before accreditation I need to show that our modules are current, and I need evidence, not opinions." *(representative quote)*

| | |
|---|---|
| **Responsibility** | Reviews 10–30 modules a year for program review or accreditation |
| **Uses GroundEd to** | Check modules one at a time, export reports, and discuss them with instructors |
| **Device** | Office desktop with a large screen; prints or shares PDFs |

**Goals:** a quick overview of each module; a shareable, evidence-backed report; consistent results (same file → same answer).
**Frustrations:** opinions without sources; inconsistent tools; extra logins.
**Trust triggers:** the "as of" date on reports, source tiers, a clear explanation of how scores are calculated.
**Success:** "I could attach GroundEd's report to our review minutes."

---

## Tertiary persona: the instructional designer / new instructor

**Mx. Jamie Cruz**: Instructional designer, or an adjunct who inherited an old module *(assumption)*

**Goals:** understand what's dated in material they didn't write; get suggested wording to start from.
**Needs:** AI-drafted updates, clearly labelled, that they can edit; plain explanations of unfamiliar tools.
**Success:** "I didn't know AngularJS was retired. Now I have a starting point for the rewrite."

---

## Other users: students and self-learners
**Students** can use GroundEd too, for example to check whether the module they're given (or a self-study
course) still teaches current tools. They use the same flow as everyone else. The design consequence is
plain-language explanations and tooltips for terms like "end-of-life" and "source tier", which also help
non-specialist reviewers.

> "Our lab guide still uses PHP 5. Is that still how it's done?" *(representative quote)*

## Out of scope (for now)
- **General education (GED) courses**, e.g. history, literature, math, ethics. GroundEd only covers technology-related courses for now.
- **Judging people.** GroundEd checks material, never grades instructors or students.

## Assumptions to check in the usability check (Phase 7)
1. Faculty recognise and like the "upload → report → highlights + sources" pattern.
2. A quote + page + dated source is enough for them to trust a finding.
3. "Keep intentionally" is a needed option (legacy tools taught on purpose).
4. Laptop-first is right; few would use it on a phone.
5. Their main worry is time, not technical understanding.
6. Students find the results understandable without a teacher explaining them.
7. Users understand why a GED module gets "not covered yet" rather than findings.
