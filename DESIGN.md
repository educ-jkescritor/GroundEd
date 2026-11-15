# GroundEd Design System (v2)

This file is the source of truth for how GroundEd looks, reads and behaves. If a page or component disagrees
with it, fix the component or update this file in the same commit.
Tokens live in `frontend/src/index.css` (`@theme`). Reusable components live in `frontend/src/components/ui/`.

> **v2, 14 Nov 2026.** Built from the UX research and product architecture in [`docs/use-cases.md`](docs/use-cases.md) and [`docs/user-flow.md`](docs/user-flow.md): personas, jobs to be done, information architecture, journey map, and key flows.
> **Decisions:**
> - Palette **A · Lapis & Clay** on a **white canvas with soft grey panels (24 px corners)**.
> - **Headings in Instrument Serif** (slightly bolder via a thin text stroke); Inter for everything else; Source Serif 4 italic only for quoted evidence.
> - **Horizon** logo; **Sprout** as the only "ground" illustration motif.
> - **17 px** base text, **comfortable** density, **light theme only**.
> - Landing patterns inspired by letters.app (principles only, nothing copied): before → after hero on a horizon band, live mini-UI panels, demo video with tabs, pill header, 3-step cards.
> - Laptop-first, English UI.
> - Technology courses only.

---

## 1. Who we design for

| | |
|---|---|
| **Primary user** | A course instructor revising their own module. Busy, expert in the subject, sceptical of AI. |
| **Also** | Curriculum reviewers, instructional designers, students. Anyone checking a tech module; no role restrictions. |
| **Mental model** | Side-by-side document review for currency: upload → report → highlights in the module with sources beside them. |
| **Context** | Laptop/desktop at 1280 px and up, sometimes slow internet. Wide age range, so readable text and high contrast matter. |

## 2. Principles

1. **Evidence first.** A claim never appears without its sources beside it: the module quote with its page, and the trusted source with its tier, publisher and date.
2. **Sourced and AI text never look alike.** AI-written text always uses the AI suggestion style (violet, dashed border, label).
3. **Advise, never judge.** Calm colours and cautious words ("may warrant review"). We check material, never people.
4. **The user decides.** Nothing counts as changed until the user chooses Update, Keep intentionally or Dismiss. Every decision can be undone.
5. **Quiet by default, detail on demand.** Show what's needed to decide; put the rest one click away.
6. **Plain language.** A student or a non-specialist reviewer should understand every label. Terms of art get a tooltip.

## 3. Voice, wording and microcopy

**Voice:** a knowledgeable colleague. Plain, respectful, short, never hype. Second person ("your module").

### Glossary
| Use | Avoid | Meaning |
|---|---|---|
| **Module** | syllabus, file, document | The uploaded course material. The Landing page says "syllabus, module or lesson guide" once. |
| **Report** | results, analysis | Everything GroundEd found for one module |
| **Finding** | claim, issue, error | One item that may warrant review |
| **May warrant review** | outdated!, wrong, must fix | Default advisory phrase |
| **End-of-life** | dead, obsolete | No longer supported by its maintainers (sourced) |
| **Less used in industry** | unpopular, bad | Still supported; usage is declining (trend source) |
| **Unverified** | unknown, error | No trusted source found; GroundEd doesn't guess |
| **Source**, **source tier** | reference, quality | A trusted document, and how strong it is |
| **Update · Keep intentionally · Dismiss** | accept, reject | The user's decision on a finding |
| **AI suggestion** | AI answer, fix | Text written by AI, not a sourced fact |
| **Not covered yet** | unsupported, error | Module is outside technology courses (e.g. GED) |

### Microcopy library
| Situation | Copy |
|---|---|
| Report headline | "{n} findings may warrant review" · "No findings may warrant review" |
| End-of-life | "No longer supported since {date}; may warrant review." |
| Nearing end-of-life | "Support ends {date}; may warrant review." |
| Supported | "Currently supported. No action needed." |
| Less used in industry | "Still supported, but used less in industry ({source}, {year})." |
| Unverified | "No trusted source found. GroundEd does not guess. Please check this one yourself." |
| Low confidence | "Limited evidence: we couldn't confirm {what}. Check page {n}." |
| AI suggestion label | "AI suggestion: not sourced. Review and edit before using." |
| Decisions | Update · Keep intentionally · Dismiss · Undo. Reason field: "Why? (optional)" |
| Privacy | "Your module's text is processed by Google Gemini to find technologies. Uploads are deleted after 24 hours." |
| Scope note | "GroundEd covers technology courses (IT, computing, web development). Other subjects aren't covered yet." |
| Not covered yet | "This module looks like it's outside technology courses, so there's nothing to report yet." |
| Scanned PDF | "This PDF looks scanned, so we can't read its text yet. Try a text-based PDF." |
| Busy service | "Our analysis service is busy right now. Your module wasn't lost: try again in a minute, or explore a sample." |
| Network | "Can't reach GroundEd. Check your connection and try again." |
| All decided (sprout moment) | "All {n} findings reviewed. Your module is ready for next term." |
| Demo account | "Demo account: for trying GroundEd only. Reports are saved in this browser." |

## 4. Brand

- **Personality:** trustworthy · scholarly · calm.
- **Logo: Horizon.** A circle split by a horizon line: a sky-wash top, a clay ground below, and a lapis "point of light" (knowledge) above the line. The **wordmark** "Ground**Ed**" is set in **Inter 700, tracking −0.03em** (matching the headings), with "Ed" in lapis.
  - Files: `frontend/public/logo.svg` (mark + wordmark) and `frontend/public/favicon.svg` (mark only, works at 16 px).
  - Clear space around the logo: at least the height of the "G".
  - Minimum size: mark 16 px, full logo 120 px wide.
  - **Don't** recolour it, stretch it, add shadows, or place it on clay or lapis backgrounds.
- **Illustration motif: Sprout.** A small sprout growing from a groundline. It marks **growth and completion**, so it's used only for:
  1. All findings reviewed
  2. Feedback sent
  3. A clean report (no findings)
  4. The Landing page's closing call to action

  Never use it on errors, in findings, or as decoration elsewhere.
- **Horizon band (landing hero only).** A vertical gradient from `sky` at the top to `canvas` white, ending on a
  1 px `ink` groundline with a faint clay band below. It echoes the Horizon logo. Use no clouds, scenery or photos.

## 5. Colour tokens

Use token classes (`bg-canvas`, `text-ink`, `bg-lapis` …), **never raw hex** in components.
All text pairs below are checked against WCAG 2.2 AA (≥ 4.5:1 for text; ≥ 3:1 for graphics).

### Brand and neutrals (Palette A · Lapis & Clay, white canvas)
| Token | Hex | Role | Contrast |
|---|---|---|---|
| `canvas` | `#FFFFFF` | Page background | — |
| `panel` | `#F4F5F8` | Soft grey panels (landing features, evidence wells, report header band) | — |
| `panel-strong` | `#EEF1F6` | Hover on panels, table headers | — |
| `surface` | `#FFFFFF` | Cards and inputs *inside* panels (white on grey) | — |
| `line` | `#E3E6EC` | Borders, dividers | — |
| `ink` | `#17213A` | Primary text, headings, "High" priority | 16.0 on canvas · 14.7 on panel |
| `ink-muted` | `#4F5A6E` | Secondary text | 7.0 on canvas · 6.4 on panel |
| `ink-subtle` | `#5F687B` | Captions, metadata | 5.6 on canvas · 5.1 on panel · **not on `sky`** (4.45) |
| `lapis` | `#3A6FD0` | **Brand fills**: primary buttons, focus ring, badges, logo "Ed" | white on lapis 4.8 |
| `lapis-deep` | `#2B55A6` | **Blue text and links**, button hover (the lighter `lapis` is too light for small text on panels) | 7.1 on white · 6.5 on panel · 5.7 on sky |
| `sky` | `#DCE6F6` | Light brand wash: horizon band, selected tabs, info notices, logo sky | — |
| `clay` | `#B9784A` | **Decoration only**: logo ground, groundline accents, quote rules | 3.6 on white (graphics only) |
| `clay-deep` | `#8A5530` | Clay used as text (rare) | 6.1 on white |
| `moss` | `#5E7F62` | **Sprout only** | 4.5 on white (graphics) |

> **Rule:** clay and moss are brand decoration. They **never** carry meaning (status, priority, errors),
> so they can't be confused with "nearing end-of-life" amber or "supported" green.

### Status (neutral; told by icon and words)
Status is **not colour-coded**, so red/amber/green mean only one thing: priority. Status badges are neutral
(`surface` background, `line` border, `ink-muted` text) with an icon, and the results page states status in a
plain-language verdict instead ("No longer supported since 2015.").

| Status | Icon (lucide) |
|---|---|
| End-of-life | `OctagonAlert` |
| Nearing end-of-life | `Clock` |
| Less used in industry | `TrendingDown` |
| Supported | `CircleCheck` |
| Unverified | `CircleHelp` |
| AI suggestion (not a status) | `Sparkles`, `ai` `#6941C6` on `ai-soft` `#F4F3FF`, dashed `#B9A6EC` border |

### Priority (the only red / amber / green)
| Priority | Tag | Tokens (text · background · border) | Used on |
|---|---|---|---|
| High (80–100) | ▲ High | `high` #B42318 · `high-soft` · `high-line` | Tag, summary bar, document highlight |
| Medium (50–79) | ● Medium | `medium` #B54708 · `medium-soft` · `medium-line` | Same |
| Low (under 50) | ▼ Low | `low` #067647 · `low-soft` · `low-line` | Same |
| Unverified (no source, never scored) | ? Unverified | `unverified` · `unverified-soft` · `line` | Same |
| Decided (Updated / Kept / Dismissed) | ✓ + word | `lapis-deep` text | Card meta, progress bar |

- Colour goes on the **tags only** (plus the summary bar and document highlights), **not** on card edges.
- Every tag has an icon and a word, so colour is never the only cue.
- Thresholds come from the backend (`score.priority`).

## 6. Typography

| Role | Font | Size / line-height | Weight · tracking | Use |
|---|---|---|---|---|
| Display | Instrument Serif | 76 / 1.02 (46 on phones) | 400 + 0.022em stroke | Landing hero headline only |
| Section display | Instrument Serif | 52 / 1.05 (36 on phones) | 400 + stroke | Landing section titles |
| H1 | Instrument Serif | 32 / 1.15 | 400 + stroke | App page titles |
| H2 | Instrument Serif | 24 / 1.25 | 400 + stroke | Section titles in the app |
| H3 | Instrument Serif | 18 / 1.4 | 400 + stroke | Card and finding titles |
| Body | Inter | **17 / 1.6** (html font-size 17 px) | 400 | All running text |
| Small | Inter | 14 / 1.5 | 400 | Metadata, helper text |
| Label | Inter | 12 / 1.2, +0.06em, uppercase | 600 | Section labels ("IN YOUR MODULE") |
| Quote | Source Serif 4 italic | 16 / 1.55 | 400 | **Only** text quoted from a module or source |
| Data | JetBrains Mono, tabular | 14 / 1.2 | 500 | Scores, versions, dates in tables |

- **Headings: Instrument Serif** for an academic feel. It has a single weight, so `h1`–`h3` get
  `-webkit-text-stroke: 0.022em currentColor` to look slightly bolder (never browser fake-bold). No negative tracking.
- **Quoted evidence: Source Serif 4 italic** with a coloured left rule (clay = module, lapis = source), so quotes stay
  distinct from headings. Mono is numbers. Interface text is Inter.
- Big headlines are short (≤ 6 words), centred on the landing page, left-aligned in the app.
- Line length: 60–75 characters for reading text (`max-w-prose`).
- Never smaller than 12 px; never grey text below 14 px except labels.

## 7. Space, shape, elevation, motion, layout

| Token | Value | Use |
|---|---|---|
| Spacing scale | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64 · 96 px | Tailwind 1–24 |
| Card padding | 20 px (24 px on detail panels) | Comfortable density |
| Gap between findings | 12 px | |
| Section spacing | 120 px (landing) · 32 px (app pages) | Generous white space on the landing |
| Radius | `sm` 8 px (badges inside cards) · `md` 10 px (buttons, inputs) · `lg` 16 px (cards) · **`xl` 24 px (panels)** · `full` (pills, header) | |
| Elevation | `0`: flat (grey panels need no border) · `1`: `0 1px 2px rgb(23 33 58 / .06)` + `line` border (white cards) · `2`: `0 12px 32px rgb(23 33 58 / .10)` (floating header, menus, drawers, hero cards) | |
| Motion | 150 ms ease-out (hover, expand) · 250 ms (drawer) · none when `prefers-reduced-motion` | No looping animation |
| Breakpoints | `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 | Designed at 1280, stacked below `lg` |
| Content width | 1200 px app · 720 px reading pages | |
| Z-index | header 20 · drawer 40 · menu/popover 50 · toast 60 | |

**Layout patterns**
- **App shell:**
  - **Floating pill header:** sticky, 12 px from the top, `full` radius, white at 85% with a backdrop blur, elevation 2. It holds: logo · How it works · Reports · Feedback, then Sign in · **Analyze a module** (the only filled button).
  - White canvas; footer with Methodology, Sources, GitHub, Feedback.
- **Results workspace (`/reports/:id`, side-by-side document review).** No site navigation and no footer:
  the page is a full-height workspace; **only the two panes scroll**, never the page.
  - **Top bar:** Horizon mark (home) · module name (serif, nothing below it) · **+ New analysis** (back to
    upload) · **Download ▾** (secondary while reviewing, primary once everything is decided) · **Details** (how the
    report was made, in plain language, as a modal) · account menu or Sign in.
  - **Left (≈ 55%): the real PDF**, rendered with PDF.js (loaded only on this page), with page arrows, zoom and
    Fit. Finding boxes come from the backend's citation `bbox`, tinted by priority; the selected one gets a
    lapis outline. Uploaded files are kept only in the tab's memory (the backend deletes uploads); after a reload,
    or if the PDF fails, the pane falls back to the extracted page text with highlights.
  - **Left toolbar:** ‹ Finding n of m › (also J / K keys) · page indicator · zoom · Fit. Coloured **markers** beside
    the document's scrollbar show where every finding is; the selected one is ringed.
  - **Right (≈ 45%, min 420 px): one scroll area.** The summary scrolls away; the **Findings | Sources** tabs stay
    pinned. Summary: "7 findings to be reviewed" + a large **"n% reviewed"** on the right (completion
    indicator) → the priority tags, which **are the filters** (All · ▲ High · ● Medium · ▼ Low · ? Unverified) →
    "Hide reviewed" → completion sprout → a one-time, dismissible sign-in note after the first decision.
  - **Opening:** the top finding is selected and the document scrolls to it (no blank first page).
  - **Sync:** selecting a finding scrolls the document to its box; "Show in document" (the p. N chip next to each
    quote) scrolls to *that* quote and pulses it, every time. Clicking a box in the document opens its card.
    Saving a decision opens the next finding to review.
  - **Below `lg` (1024 px):** a Findings / Document switch shows one pane at a time.
- **Finding card (read the bold parts and you have the gist).**
  - Collapsed: **name** + priority tag → **status** · "Use **replacement** instead" → pages · decision state.
  - Expanded, top to bottom: **Key facts** (three tiles: Status in the priority colour · In your module ·
    Use instead; values in bold, details small) → **The evidence** ("Your module says" quotes with a p. N chip ⇄
    "<Source> says" quote and link) → **Draft updated wording** (outlined violet; disabled with a reason when AI
    isn't configured) → folded "Why is this … priority?" → **Your decision**, pinned to the bottom of the open card.
  - Not shown on cards: kind tags, score number, provenance, library passages (Sources tab / Details).
- **Sources tab:** a bibliography: each source with type in words (Support data / Official documentation),
  publisher, saved date, the findings it backs, and a link.
- **Finding detail (full page, for deep review):**
  - Wide screens: two columns, *In your module* (quote, page, view in module) and *Source* (tier, publisher, passage, dates, link).
  - Below them: Why this priority (score), Help (upgrade / AI draft), Decision, with Previous / Next finding.
  - Below `lg`, the columns stack.
- **Print:** header and controls hidden; status label text always present; link URLs printed; the provenance stamp in the footer.

### Landing page structure (inspired by letters.app; principles only)
| Order | Section | Pattern | Content |
|---|---|---|---|
| 1 | **Hero** | Centred short headline + 2–3 line subhead + one primary button (+ "Try a sample" text link) on the **horizon band** | Below the text, a **before → after** pair: a module page with a highlighted quote ("In your module"), overlapped by our finding card with its source ("With GroundEd"). Real UI, not an illustration. |
| 2 | **Problem** | One short statement + one cited fact | Curricula lag industry (Dobslaw et al., 2023); faculty validation in the Philippines |
| 3 | **Live mini-UI panels** | 2-column grid of `panel` blocks (24 px), each with a small label chip, a 2-line title and a live UI fragment | Progress steps · Finding card with source · Score breakdown · Decision control (Update / Keep / Dismiss) |
| 4 | **See it work** | Section title + **tabs** (Review a module / Decide on a finding) above an embedded demo video in a browser frame | Our demo video (a hackathon deliverable); falls back to screenshots if no video yet |
| 5 | **How it works** | **3 numbered step cards** in a row; the first is highlighted (lapis tint) | Upload a module → Check the evidence → Decide what to update |
| 6 | **Built to be trusted** | 4 short principles with icons | Cited sources · No guessing · Transparent priority · You decide |
| 7 | **Voices** | Quote cards | **Only real feedback quotes with consent.** Until we have them, show validation facts instead. Never invent testimonials or signatures. |
| 8 | **Closing CTA + device shot** | Sprout illustration + headline + button; the Report page on a laptop frame | "Ready for next term?" style headline |

## 8. Iconography

[lucide](https://lucide.dev) icons, 16 px in text and badges, 20 px in buttons, stroke 1.75. One meaning per icon:

| Meaning | Icon | Meaning | Icon |
|---|---|---|---|
| End-of-life | `OctagonAlert` | Source / external link | `ExternalLink` |
| Nearing end-of-life | `Clock` | Module quote | `BookOpen` |
| Supported | `CircleCheck` | Source record | `Library` |
| Less used in industry | `TrendingDown` | Upload | `Upload` |
| Unverified | `CircleHelp` | Export | `Download` |
| AI suggestion | `Sparkles` | Undo | `Undo2` |
| Help / definition | `Info` | Low confidence | `TriangleAlert` |

Icons never stand alone for meaning: always with a visible label, or an `aria-label` for icon-only buttons.

## 9. Showing data and evidence

- **Scores:** `86/100` in mono. Breakdown as bars: points/max per factor (Lifecycle 40, How it's taught 30, Frequency 20, Hands-on 10; see `backend/app/score.py`) with one plain-sentence reason each.
- **Dates:** "1 Jan 2020" (en-GB day-month-year) plus a relative hint when useful: "(6 years ago)". Reports say "As of {date}".
- **Module evidence:** quote style, "Page 4", and a link "View in module" (scrolls the module column to that highlight).
- **Source evidence:**
  - Tier label in words (*Support data*, *Official documentation*, *Curriculum standard*, *Industry trend*)
  - Publisher, then the passage in quote style
  - "Published {date} · Checked {date}", then the link
- **Kind and usage:** a small uppercase label before the name (TOOL, LANGUAGE, PRACTICE, TOPIC) and a summary line ("Taught in labs · pages 4, 6").
- **Confidence:** hidden when high. When low, a `TriangleAlert` note with what's missing.
- **Provenance:** "As of {date} · Details" in the report header; the full stamp is in a popover and the print footer.
- **Document highlights:** status-tinted underline + soft background (`eol-soft`, etc.), 2 px solid underline when selected. Highlights never rely on colour alone, so a hover/focus label names the finding.

## 10. Components

### Inventory
| Component | File | Status | Notes |
|---|---|---|---|
| Button | `ui/Button.tsx` | Have → restyle | Variants: `primary` (lapis), `secondary` (outlined), `ghost`, `ai` (violet). Sizes `sm` 36 px, `md` 44 px. One primary per view. |
| Card | `ui/Card.tsx` | Have → restyle | White, `line` border, `lg` (16 px) radius, elevation 1 |
| **Panel** | `ui/Panel.tsx` | **Must** | Soft grey `panel` block, `xl` (24 px) radius, no border; optional label chip + title |
| **PillHeader** | `components/Layout.tsx` | **Must** (restyle) | Floating rounded sticky header |
| **HorizonBand** | `ui/HorizonBand.tsx` | **Must** | Landing hero background: sky → canvas gradient + groundline |
| **StepCards** | `ui/StepCards.tsx` | **Should** | Numbered how-it-works cards, first highlighted |
| **VideoFrame** | `ui/VideoFrame.tsx` | **Should** | Browser-frame wrapper for the demo video, with tabs above |
| Notice | `ui/Notice.tsx` | Have → restyle | Tones `info` (sky), `warning`, `error`. Page-level messages only. |
| StatusBadge | `ui/StatusBadge.tsx` | Have → add "Less used in industry" | Icon + label always |
| PriorityBadge | `ui/PriorityBadge.tsx` | Have | Neutral ink scale |
| AiSuggestion | `ui/AiSuggestion.tsx` | Have | Mandatory wrapper for AI text |
| SourceLink | `ui/SourceLink.tsx` | Have | New tab + icon + screen-reader note |
| **Logo** | `ui/Logo.tsx` | **Must** | Horizon mark + wordmark; `mark` / `full` variants |
| **Field set** (Input, Select, Textarea, Radio, Checkbox) | `ui/Field.tsx` | **Must** | Label always visible; help text; error text with `role="alert"` |
| **Tabs** | `ui/Tabs.tsx` | **Must** | Help levels; landing video tabs. Keyboard arrows. |
| **ProgressSteps** | `ui/ProgressSteps.tsx` | **Must** | Reading → Detecting → Checking sources → Scoring; done / current / waiting / failed |
| **QuoteBlock** | `ui/QuoteBlock.tsx` | **Must** | Serif italic quote + page/source caption |
| **SourceCard** | `ui/SourceCard.tsx` | **Must** | Tier, publisher, passage, dates, link |
| **DecisionControl** | `ui/DecisionControl.tsx` | **Must** | Update / Keep intentionally / Dismiss + reason + undo |
| **EmptyState** | `ui/EmptyState.tsx` | **Must** | Icon or sprout, title, text, action |
| **Tooltip / Definition** | `ui/Definition.tsx` | **Should** | Dotted-underline term + popover explanation (students, reviewers) |
| **Toast** | `ui/Toast.tsx` | **Should** | "Copied", "Decision saved" |
| **FilterChips** | `ui/FilterChips.tsx` | **Should** | Status / priority / kind filters with counts |
| **Drawer** | `ui/Drawer.tsx` | **Should** | Finding detail beside the list on wide screens |
| **Skeleton** | `ui/Skeleton.tsx` | **Later** | Loading placeholders |
| **DocumentViewer** | `components/DocumentViewer.tsx` | **Should** | Module pages + highlights (PDF.js); falls back to page text with highlights |
| **Sprout** | `ui/Sprout.tsx` | **Must** | The completion illustration (inline SVG) |

### States (every interactive component)
default · hover · focus-visible (2 px lapis outline, 2 px offset) · active · disabled (50% opacity, no pointer) ·
loading (spinner + label, e.g. "Drafting…") · error (eol text + message).

### FindingCard anatomy (findings panel)
```
┌───────────────────────────────────────────────────────────────────────┐
│ PRACTICE  mysql_connect()      [● End-of-life]   [High]  86/100   ▾  │
│ Taught in labs · pages 4, 6 · No longer supported since 1 Dec 2015;   │
│ may warrant review                                    [To review]    │
└───────────────────────────────────────────────────────────────────────┘
```

### Finding detail anatomy
```
IN YOUR MODULE (p. 4)              │ SOURCE · Official documentation
"Lab 3: Connect to the database    │ PHP Group · php.net
 using mysql_connect()"            │ "The original MySQL extension was removed in PHP 7.0.0."
View in module →                   │ Published 3 Dec 2015 · Checked 10 Nov 2026 ↗
─────────────────────────────────────────────────────────────────────────
Why High priority (86/100)?  ▇▇▇▇ Lifecycle 40/40 · How it's taught 30/30 · Frequency 8/20 · Hands-on 10/10
How can GroundEd help?  [Review evidence] [Suggested upgrade] [AI draft]
Your decision:  (Update) (Keep intentionally) (Dismiss)   Why? ________   [Save]
```

## 11. Accessibility (WCAG 2.2 AA)

- Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI graphics (see the tables above).
- Status, priority and highlights are never shown by colour alone.
- Keyboard: every action reachable; visible focus; tabs use arrow keys; Esc closes drawers and popovers; focus returns to the trigger.
- Semantics: real `<button>` and `<a>`; `aria-expanded` on expanders; `aria-live` for progress; `role="alert"` for errors.
- Forms: visible labels, never placeholder-only; errors next to the field.
- Text resizes to 200% without loss; layout works at 320 px width.
- Targets ≥ 24 × 24 px (WCAG 2.2), with 40 px+ preferred for main actions.
- Respect `prefers-reduced-motion`.
- **Testing:** Lighthouse accessibility ≥ 95; keyboard-only walkthrough; 200% zoom check; colour-blindness simulation in Chrome DevTools.

## 12. Checklist for any new UI

- [ ] Uses tokens, not hex values or default Tailwind palette classes (`slate-`, `blue-`…)
- [ ] Uses `ui/` components where one exists
- [ ] Words come from the glossary and microcopy library
- [ ] Every fact has a visible source; any AI text is inside `AiSuggestion`
- [ ] Clay and moss used only as decoration; sprout only at completion moments
- [ ] Headings in Instrument Serif; Source Serif italic only for quoted evidence
- [ ] Inspiration from other sites is adapted as principles, never copied (no copied layouts, imagery, icons or wording)
- [ ] Works at 1280 px and stacks cleanly below 1024 px
- [ ] Keyboard-navigable with visible focus; passes the accessibility list above
