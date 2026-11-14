import { useRef, useState, type KeyboardEvent } from "react";
import { BookOpenCheck, MessageSquare } from "lucide-react";
import { AiSuggestion } from "../components/ui/AiSuggestion";
import { ButtonLink } from "../components/ui/Button";
import { Panel } from "../components/ui/Card";
import { HorizonBand } from "../components/ui/HorizonBand";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { QuoteBlock } from "../components/ui/QuoteBlock";
import { Sprout } from "../components/ui/Sprout";
import { BrowserFrame, DecisionPreview, ReportPreview, UploadPreview } from "../components/ProductPreview";
import { usePageTitle } from "../lib/usePageTitle";

const section = "mx-auto max-w-6xl px-4 sm:px-6";
const sectionTitle = "text-[36px] leading-[1.05] sm:text-[52px]";
const cardTitle = "heading-serif text-[22px] leading-[1.2] text-ink";
const cardBody = "text-[15px] font-normal leading-relaxed text-ink-muted";

type StepId = "upload" | "review" | "decide";

const steps: { id: StepId; title: string; body: string; url: string }[] = [
  {
    id: "upload",
    title: "Upload a module",
    body: "Drop a syllabus, module or lesson guide as a PDF—or try a built-in sample with no account needed.",
    url: "grounded.app/analyze",
  },
  {
    id: "review",
    title: "Check the evidence",
    body: "See your module side by side with ranked findings, verbatim quotes, and official lifecycle records.",
    url: "grounded.app/reports/web-systems",
  },
  {
    id: "decide",
    title: "Decide what to update",
    body: "Update (with a sourced replacement or optional AI draft), keep intentionally, or dismiss—then export.",
    url: "grounded.app/reports/web-systems#finding-mysql",
  },
];

const scoreRows = [
  { label: "Lifecycle", reason: "Ended or removed", pts: 40, max: 40 },
  { label: "How it's taught", reason: "Used in code students write", pts: 30, max: 30 },
  { label: "Frequency", reason: "Appears on 2 pages", pts: 8, max: 20 },
  { label: "Hands-on", reason: "On a lab or exercise page", pts: 10, max: 10 },
];

export default function Landing() {
  usePageTitle();
  const [activeStep, setActiveStep] = useState<StepId>("review");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentStep = steps.find((s) => s.id === activeStep) ?? steps[1];

  function handleStepKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (index + 1) % steps.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (index - 1 + steps.length) % steps.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = steps.length - 1;
    }
    if (nextIndex !== null) {
      e.preventDefault();
      setActiveStep(steps[nextIndex].id);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <div className="space-y-24 pb-8 md:space-y-[120px]">
      {/* 1 · Hero on the horizon band: before → after */}
      <section className="px-3 pt-6 sm:px-6">
        <HorizonBand>
          <div className="mx-auto max-w-5xl px-4 pb-16 pt-14 text-center sm:pt-20">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-surface/80 px-3.5 py-1.5 text-sm font-semibold text-lapis-deep">
              <BookOpenCheck size={16} aria-hidden /> For IT and computing courses
            </p>
            <h1 className="mx-auto mt-6 max-w-3xl text-[46px] leading-[1.02] sm:text-[76px]">
              Teach what's current. With proof.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-muted">
              Upload a syllabus, module or lesson guide. GroundEd finds tools and practices that may be outdated and
              backs every finding with a trusted source. <strong className="text-ink">You decide what changes.</strong>
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink to="/analyze">Analyze a module</ButtonLink>
              <ButtonLink to="/analyze#samples" variant="secondary">Try a sample</ButtonLink>
            </div>

            {/* Before → after (aligned with FindingItem.tsx & priority highlight tokens) */}
            <div className="relative mx-auto mt-14 grid max-w-3xl gap-4 text-left sm:grid-cols-2 sm:items-end">
              <figure className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:-rotate-2">
                <figcaption className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-ink-subtle">
                  In your module · page 4
                </figcaption>
                <p className="leading-relaxed text-ink">
                  Lab 3: Connect to the database using{" "}
                  <span className="rounded-[3px] bg-high-soft px-0.5 underline decoration-high decoration-2 underline-offset-[3px]">
                    mysql_connect()
                  </span>{" "}
                  and display the results in an HTML table.
                </p>
              </figure>
              <figure className="space-y-3 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-float)] sm:translate-y-4">
                <figcaption className="text-xs font-semibold uppercase tracking-[0.06em] text-lapis-deep">
                  With GroundEd
                </figcaption>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">mysql_connect()</p>
                    <p className="text-xs text-ink-muted">
                      <strong className="font-semibold text-ink">Removed in PHP 7.0</strong> · Use{" "}
                      <strong className="font-semibold text-ink">PDO or mysqli</strong> instead
                    </p>
                  </div>
                  <PriorityBadge priority="high" short />
                </div>
                <QuoteBlock size="sm" tone="source" caption="PHP Group · php.net · Official documentation">
                  This extension was deprecated in PHP 5.5.0, and it was removed in PHP 7.0.0.
                </QuoteBlock>
              </figure>
            </div>
          </div>
        </HorizonBand>
      </section>

      {/* 2 · Problem */}
      <section className={`${section} grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-center`}>
        <h2 className={sectionTitle}>Technology moves faster than curricula.</h2>
        <div className="space-y-4 text-lg text-ink-muted">
          <p>
            A 2023 study comparing university syllabi with six years of software job ads found industry demand for
            modern tooling rising faster than courses reflected it (Dobslaw et al., 2023). Languages, frameworks, and
            functions already in a module can reach end-of-life within a few years.
          </p>
          <p>
            IT faculty we spoke with in the Philippines confirmed it: reviews are manual and infrequent, checking every
            tool takes hours they rarely have, and generic AI chatbots can't be trusted without sources.
          </p>
        </div>
      </section>

      {/* 3 · How it works (unified 3-step selector + live BrowserFrame preview) */}
      <section id="how-it-works" className={`${section} scroll-mt-24 space-y-8`}>
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className={sectionTitle}>How it works</h2>
          <p className="text-lg text-ink-muted">
            Three steps from syllabus PDF to a source-backed curriculum review report.
          </p>
        </div>

        {/* Interactive 3-step tab cards */}
        <div
          role="tablist"
          aria-label="How GroundEd works"
          className="grid gap-4 md:grid-cols-3"
        >
          {steps.map((s, i) => {
            const selected = activeStep === s.id;
            return (
              <button
                key={s.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                id={`step-tab-${s.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`step-panel-${s.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveStep(s.id)}
                onKeyDown={(e) => handleStepKeyDown(e, i)}
                className={`group flex flex-col items-start gap-3 rounded-[var(--radius-panel)] border p-6 text-left transition-all ${
                  selected
                    ? "border-lapis bg-sky/55 shadow-[var(--shadow-card)]"
                    : "border-transparent bg-panel hover:bg-panel-strong"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-bold transition-colors ${
                    selected ? "bg-lapis text-white" : "bg-surface text-ink group-hover:bg-lapis/15"
                  }`}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className={cardTitle}>{s.title}</span>
                <span className={cardBody}>{s.body}</span>
              </button>
            );
          })}
        </div>

        {/* Live BrowserFrame synced to the selected step (full width matching the 3 cards above) */}
        <div
          id={`step-panel-${currentStep.id}`}
          role="tabpanel"
          aria-labelledby={`step-tab-${currentStep.id}`}
        >
          <BrowserFrame url={currentStep.url}>
            {activeStep === "upload" && <UploadPreview />}
            {activeStep === "review" && <ReportPreview />}
            {activeStep === "decide" && <DecisionPreview />}
          </BrowserFrame>
        </div>
      </section>

      {/* 4 · Built to be trusted (3 distinct Grounded RAG proof panels — no overlap with How it works) */}
      <section className={`${section} space-y-10`}>
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className={sectionTitle}>Built to be trusted</h2>
          <p className="text-lg text-ink-muted">
            Code finds, checks, and scores the evidence. AI never guesses facts or calculates scores.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Proof 1: Dual citations & Unverified safeguard */}
          <Panel
            label="No guessing"
            title="Every claim is cited"
            description="Each finding links to its official lifecycle record or documentation—or is marked Unverified, never guessed."
            className="flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="rounded-[var(--radius-card)] bg-surface p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">Bootstrap 3</span>
                  <PriorityBadge priority="medium" short />
                </div>
                <QuoteBlock size="sm" tone="source" caption="endoflife.date · Support data">
                  End of support 24 Jul 2019 · Latest release: Bootstrap 5.3
                </QuoteBlock>
              </div>

              <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">CampusPortal SDK v1.4</span>
                  <PriorityBadge priority="unverified" />
                </div>
                <p className="text-xs leading-relaxed text-ink-muted">
                  No trusted source found. GroundEd does not guess or invent lifecycle dates—flagged for manual check.
                </p>
              </div>
            </div>
          </Panel>

          {/* Proof 2: Deterministic 100-pt Priority Score */}
          <Panel
            label="Deterministic"
            title="Fixed 100-point priority"
            description="Priority is calculated by transparent rules in code, so the same module always gets the exact same score."
            className="flex flex-col justify-between"
          >
            <div className="flex flex-col justify-between space-y-4 rounded-[var(--radius-card)] bg-surface p-4 text-sm">
              <div className="space-y-3">
                {scoreRows.map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-ink">{row.label}</span>
                      <span className="font-mono text-xs text-ink-subtle tabular-nums">
                        {row.pts}/{row.max}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                      <div
                        className="h-full rounded-full bg-ink"
                        style={{ width: `${(row.pts / row.max) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-ink-muted">{row.reason}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="text-xs text-ink-muted">Same module = same score</span>
                <span className="inline-flex items-center gap-1.5">
                  <PriorityBadge priority="high" short />
                  <span className="font-mono text-xs font-semibold text-ink">88/100</span>
                </span>
              </div>
            </div>
          </Panel>

          {/* Proof 3: Strict separation of Sourced Facts vs. AI Suggestions */}
          <Panel
            label="Clear boundaries"
            title="You decide what changes"
            description="Sourced facts and optional AI drafts never look alike, and nothing changes without your approval."
            className="flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="rounded-[var(--radius-card)] bg-surface p-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-lapis-deep">
                  Verified source fact
                </p>
                <QuoteBlock size="sm" tone="source" caption="PHP Group · php.net">
                  The original MySQL extension was removed in PHP 7.0.0. Use MySQLi or PDO_MySQL.
                </QuoteBlock>
              </div>

              <AiSuggestion label="AI suggestion: not sourced. Review and edit before using.">
                <p className="text-xs leading-relaxed text-ink">
                  Optional Gemini rewrites are visually isolated and never mixed with citations. Nothing counts as
                  changed until you approve it.
                </p>
              </AiSuggestion>
            </div>
          </Panel>
        </div>
      </section>

      {/* 5 · Voices + Closing CTA */}
      <section className={`${section} space-y-20`}>
        <Panel className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-lapis">
            <MessageSquare size={22} aria-hidden />
          </span>
          <h2 className={sectionTitle}>Shaped by educators</h2>
          <p className="max-w-xl text-lg text-ink-muted">
            The problem was validated with IT faculty in the Philippines, and we're now testing with educators in more
            countries. Tried GroundEd? Your feedback directly shapes what we build next.
          </p>
          <ButtonLink to="/feedback" variant="secondary">Share feedback</ButtonLink>
        </Panel>

        <div className="mx-auto max-w-2xl space-y-5 text-center">
          <div className="flex justify-center"><Sprout size={56} /></div>
          <h2 className={sectionTitle}>Ready for next term?</h2>
          <p className="text-lg text-ink-muted">See what in your module may warrant review, in under a minute.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/analyze">Analyze a module</ButtonLink>
            <ButtonLink to="/methodology" variant="ghost">How GroundEd works →</ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
