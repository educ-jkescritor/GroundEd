# GroundEd Design System

This file is the source of truth for how GroundEd looks, reads and behaves. If a page or component disagrees with
this file, either fix the component or update this file in the same commit. Tokens live in
`frontend/src/index.css` (`@theme`); reusable components live in `frontend/src/components/ui/`.

---

## 1. Design principles

GroundEd is used by busy faculty who only trust output they can check. Every screen should follow these four rules:

1. **Evidence first.** A claim is never shown without its source next to it: syllabus page and snippet, plus the endoflife.date record.
2. **Sourced vs AI is always visible.** Facts from sources look like facts. AI-written text (replacement ideas, drafts) always
   uses the **AI suggestion** style (violet, dashed border, "AI suggestion: not sourced" label). Never mix the two.
3. **Calm, not alarming.** Status colours are muted and paired with text and an icon. Red means "end-of-life", not "error".
4. **Faculty stay in control.** Nothing looks "applied" until the user clicks Approve or Accept. Decisions are reversible.

## 2. Voice and microcopy

- Plain, respectful, short. We talk to professors, not developers. Say "end-of-life" (spelled out the first time), not "EOL" alone.
- **Advisory, never commanding.** GroundEd advises; faculty decide. Say "may warrant review", never "must update" or "wrong".
- Current scope is **web development and related courses**; say so where it sets expectations (landing, empty states).
- Use the second person ("your syllabus"). Avoid hype ("revolutionary", "magic").
- Never claim certainty we don't have. Use "No source found" rather than "Not outdated".

| Situation | Copy |
|---|---|
| Status: EOL | **End-of-life**: "No longer supported since {date}; may warrant review." |
| Status: nearing EOL | **Nearing end-of-life**: "Support ends {date}; may warrant review." |
| Priority | **High priority** (≥ 80) · **Medium priority** (≥ 50) · **Low priority** (< 50) |
| Status: supported | **Supported**: "Currently supported." |
| Status: unverified | **Unverified**: "No source found. GroundEd does not guess. Please check manually." |
| AI draft label | "AI suggestion: not sourced. Review and edit before using." |
| Privacy note | "Your PDF's text is processed by Google Gemini to detect technologies. Uploads are deleted after 24 hours." |
| Generic error | "Something went wrong. {detail} Try again, or use a sample syllabus." |
| Rate limit | "GroundEd is busy right now. Try again in a minute, or explore a sample syllabus." |
| Empty results | "No technologies detected. If your syllabus names tools, the PDF may be scanned. Try a text-based PDF." |

## 3. Colour tokens

Defined in `frontend/src/index.css` under `@theme`. Use the token classes (`bg-surface`, `text-ink`, `text-eol` …), **never raw hex** in components.

### Neutrals and brand
| Token | Hex | Use |
|---|---|---|
| `ink` | `#16213A` | Primary text, headings, primary button |
| `ink-muted` | `#4A5568` | Secondary text |
| `ink-subtle` | `#718096` | Captions, metadata |
| `canvas` | `#F7F6F2` | Page background (warm paper) |
| `surface` | `#FFFFFF` | Cards, panels |
| `line` | `#E3E1DA` | Borders, dividers |
| `brand` | `#0E6E5C` | Brand accent, links, focus ring |
| `brand-soft` | `#E3F2EE` | Brand tinted backgrounds |

### Status (each has text and background)
| Status | Text token | Background token | Icon (lucide) |
|---|---|---|---|
| End-of-life | `eol` `#B42318` | `eol-soft` `#FEF3F2` | `OctagonAlert` |
| Nearing end-of-life | `nearing` `#B54708` | `nearing-soft` `#FFFAEB` | `Clock` |
| Supported | `supported` `#067647` | `supported-soft` `#ECFDF3` | `CircleCheck` |
| Unverified | `unverified` `#475467` | `unverified-soft` `#F2F4F7` | `CircleHelp` |
| AI suggestion | `ai` `#6941C6` | `ai-soft` `#F4F3FF` | `Sparkles` |

All text/background pairs meet WCAG AA (≥ 4.5:1). Status is **never** communicated by colour alone: always label + icon.

### Priority (High / Medium / Low)
Priority is a **ranking**, not a status, so it never uses status colours (a supported item can't be "red").
It uses the neutral ink scale: **High** = solid `ink` with white text · **Medium** = `ink` outline · **Low** = `line` outline, `ink-muted` text.
Thresholds come from the backend's `score.priority` (High ≥ 80, Medium ≥ 50, else Low; see `docs/design-brief.md` §5.2).
Supported items show "No action needed" instead of a priority.

## 4. Typography

| Role | Font | Class | Size / weight |
|---|---|---|---|
| Display (landing hero) | Source Serif 4 | `font-serif` | `text-4xl sm:text-5xl` / 600 |
| Page title (h1) | Source Serif 4 | `font-serif` | `text-3xl` / 600 |
| Section title (h2) | Inter | `font-sans` | `text-xl` / 600 |
| Card title (h3) | Inter | | `text-lg` / 600 |
| Body | Inter | | `text-base` / 400, line-height 1.6 |
| Small / meta | Inter | | `text-sm` / 400, `text-ink-muted` |
| Numbers (scores, dates) | JetBrains Mono | `font-mono` | `tabular-nums` |
| Quoted syllabus snippet | Source Serif 4 italic | `font-serif italic` | `text-base` |

Fonts are loaded from Google Fonts in `frontend/index.html`. Serif signals "academic source"; that's why snippets from the syllabus use it.

## 5. Spacing, radius, elevation

- Spacing follows Tailwind's 4 px scale. Common: card padding `p-5`, gaps between cards `gap-4`, section spacing `py-16` (landing) / `space-y-8` (app pages).
- Content width: `max-w-6xl` for app pages, `max-w-3xl` for reading text. Page side gutter: `px-4 sm:px-6`.
- Radius: `rounded-lg` (8 px) for inputs and buttons, `rounded-xl` (12 px) for cards, `rounded-full` for badges.
- Elevation: cards use a 1 px `border-line` plus `shadow-sm`. No heavy shadows. Hover: `hover:border-ink/30`.

## 6. Components

All reusable building blocks are in `frontend/src/components/ui/`. Use them; don't restyle ad hoc.

| Component | File | Rules |
|---|---|---|
| `Button` | `ui/Button.tsx` | Variants: `primary` (ink bg), `secondary` (outlined), `ghost` (text), `ai` (violet, only for AI actions). Sizes `sm`, `md`. One primary per view. |
| `StatusBadge` | `ui/StatusBadge.tsx` | Always icon + label. Use for finding status only. |
| `PriorityBadge` | `ui/PriorityBadge.tsx` | High / Medium / Low. Neutral ink scale only. Use `priorityOf(score)` from `lib/priority.ts`. |
| `Notice` | `ui/Notice.tsx` | Tones `info`, `warning`, `error`. For page-level messages, not finding status. |
| `AiSuggestion` | `ui/AiSuggestion.tsx` | Wraps **any** AI-generated content. Violet dashed border + label. Mandatory. |
| `SourceLink` | `ui/SourceLink.tsx` | External source links: opens in new tab, shows `ExternalLink` icon, `rel="noreferrer"`. |
| `Card` | `ui/Card.tsx` | White surface, border, `rounded-xl`, `p-5`. |

Domain components (`components/`): `FindingCard`, `EvidencePanel`, `ScoreBreakdown`, `ReportExport`, `Layout`.

### FindingCard anatomy
```
┌──────────────────────────────────────────────────────────────┐
│ [StatusBadge]  Python 2.7     [High priority]   82/100  [▼]  │  collapsed header
│ No longer supported since 1 Jan 2020; may warrant review · p. 2, 5 │
├──────────────────────────────────────────────────────────────┤
│ IN YOUR SYLLABUS            │ LIFECYCLE RECORD               │  EvidencePanel
│ "Lab exercises use Py 2.7"  │ Cycle 2.7 · EOL 2020-01-01     │
│  p. 2                       │ endoflife.date ↗               │
├──────────────────────────────────────────────────────────────┤
│ Why 82/100?  ▇▇▇▇ 40/40 Lifecycle · 12/30 Frequency · …      │  ScoreBreakdown
├──────────────────────────────────────────────────────────────┤
│ How much help do you want?                                   │  Help levels
│ (•) Review evidence ( ) Accept upgrade ( ) Draft section     │
│ [Mark as reviewed]                                           │
└──────────────────────────────────────────────────────────────┘
```

## 7. Interaction patterns

- **Help levels** are a segmented control: *Review evidence* → *Accept upgrade* (only if a sourced upgrade exists) → *Draft section* (AI).
- **Decisions**: `reviewed`, `upgrade_accepted`, `draft_approved`. Shown as a badge on the card; "Undo" is always available.
  Decisions are stored per analysis in `localStorage` (`grounded:decisions:{analysisId}`) and included in the export.
- **Loading**: long tasks show named steps (Reading PDF → Finding technologies → Checking lifecycle records → Scoring) and never a bare spinner.
- **Errors**: inline `Notice` near the action, with a recovery path (try again / use a sample).
- **External links** always open in a new tab with an icon.
- **Sorting**: findings default to highest score first; unverified last.

## 8. Accessibility checklist

- Text contrast ≥ 4.5:1; status by label + icon, never colour alone.
- Visible focus ring: `focus-visible:outline-2 outline-brand outline-offset-2` (built into `Button` and inputs).
- Every interactive element is a real `<button>` or `<a>`; expandable cards use `aria-expanded`.
- Form fields have `<label>`s; errors are announced with `role="alert"`.
- Works at 375 px width; no horizontal scroll; tap targets ≥ 40 px.
- Respect `prefers-reduced-motion` (only subtle transitions are used).

## 9. Layout and pages

| Route | Page | Purpose |
|---|---|---|
| `/` | Landing | Problem, how it works, trust principles, call to action |
| `/analyze` | Analyze | Upload a PDF or choose a sample |
| `/results/:id` | Results | Summary, filters, findings, export |
| `/feedback` | Feedback | Role, country, rating, comments (Reach evidence) |
| `*` | NotFound | Friendly 404 with links home |

Every page sets its own `<title>` with `usePageTitle("…")` → "… · GroundEd".

## 10. Print / export

The report uses the same tokens but prints in black-and-white friendly form: status label text is always present,
links print their URL, the app header and controls are hidden (`print:hidden`).

## 11. Checklist for new UI

- [ ] Uses tokens, not hex values
- [ ] Uses `ui/` components where one exists
- [ ] Any AI text is inside `AiSuggestion`
- [ ] Every fact has a visible source
- [ ] Looks right at 375 px and 1280 px
- [ ] Keyboard-navigable with visible focus
