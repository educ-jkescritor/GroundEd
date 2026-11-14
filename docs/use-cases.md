# Use cases

## Who it's for

**Primary persona: the course faculty member.**
Teaches 3–5 courses a term, revises syllabi once a year or less, often by copying last year's document.
Knows the subject but has no time to track the release and support status of every tool. Will only act on
output they can verify themselves.

**Secondary persona: the curriculum reviewer / department chair.**
Reviews many syllabi before accreditation or a curriculum update. Needs a shareable, evidence-backed summary
to discuss with faculty.

## Problem
- Technology changes faster than syllabi are reviewed (Dobslaw et al., 2023).
- Tools named in a syllabus reach end-of-life, so students practise on unsupported software.
- Checking every tool by hand is slow; generic AI chatbots answer confidently without sources, which faculty can't trust.

## User stories
1. As a professor, I upload my syllabus and see which tools are outdated, with proof.
2. As a professor, I see *why* an item is flagged: the page and quote from my syllabus, the lifecycle record and a score breakdown.
3. As a professor, I choose how much help I want (review only, accept a sourced upgrade, or get an AI draft) and approve every change myself.
4. As a reviewer, I export a report to share with the department.
5. As a visitor, I try GroundEd on a sample syllabus without uploading anything.

## Main use case: review a syllabus

| Step | Faculty does | GroundEd does |
|---|---|---|
| 1 | Opens GroundEd, clicks **Analyze a syllabus** | Shows upload area and sample syllabi |
| 2 | Uploads a PDF | Extracts the text of each page |
| 3 | Waits (under a minute) | Detects technology mentions; keeps only those whose quote is found on the page |
| 4 | | Looks each one up on endoflife.date; anything not found becomes **Unverified** |
| 5 | | Calculates a 100-point priority score per verified item |
| 6 | Reads the summary (end-of-life / nearing / supported / unverified) | Lists findings, highest priority first |
| 7 | Opens a finding | Shows syllabus quote + page, lifecycle record + link, score breakdown |
| 8 | Chooses a help level | Review: nothing more. Upgrade: shows the newer version from the same record. Draft: AI writes a suggested section, clearly labelled |
| 9 | Edits and approves (or undoes) | Records the decision |
| 10 | Exports the report | Markdown or printable PDF with evidence, decisions and approved text |
| 11 | Leaves feedback | Saves role, country, rating and comments |

## Alternative and error paths
- **Scanned PDF (no text):** GroundEd says the PDF appears to be scanned and suggests a text-based PDF.
- **Tool not in endoflife.date:** marked Unverified, with a link to search manually. Never guessed.
- **AI service busy:** friendly message, plus a suggestion to use a sample (which is pre-analysed).

## What GroundEd deliberately does not do
- It does not change the syllabus file; it produces suggestions and a report.
- It does not state lifecycle facts from AI; those come only from endoflife.date.
- It does not judge teaching quality or pedagogy, only tool currency.
- It does not keep uploads: they are deleted after 24 hours.
