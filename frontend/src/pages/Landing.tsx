import { useState } from "react";
import { BookOpenCheck, Gauge, Hand, Link2, ShieldQuestion, MessageSquare } from "lucide-react";
import { ButtonLink } from "../components/ui/Button";
import { Panel } from "../components/ui/Card";
import { HorizonBand } from "../components/ui/HorizonBand";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { ProgressSteps } from "../components/ui/ProgressSteps";
import { QuoteBlock } from "../components/ui/QuoteBlock";
import { Sprout } from "../components/ui/Sprout";
import { StatusBadge } from "../components/ui/StatusBadge";
import { BrowserFrame, DecisionPreview, ReportPreview } from "../components/ProductPreview";
import { usePageTitle } from "../lib/usePageTitle";

const section = "mx-auto max-w-6xl px-4 sm:px-6";
const sectionTitle = "text-[32px] leading-[1.1] tracking-[-0.03em] sm:text-[44px]";

const steps = [
  { title: "Upload a module", body: "A syllabus, module or lesson guide as a PDF. Or start with a sample; no account needed." },
  { title: "Check the evidence", body: "Each finding shows the quote from your module beside the trusted source behind it." },
  { title: "Decide what to update", body: "Update, keep it on purpose, or dismiss it. Export a report for your chair." },
];

const principles = [
  { icon: Link2, title: "Every finding is cited", body: "A quote and page from your module, and a trusted source with its date." },
  { icon: ShieldQuestion, title: "No guessing", body: "If there's no trusted source, the item is marked Unverified, not filled in by AI." },
  { icon: Gauge, title: "Transparent priority", body: "Fixed scoring rules you can read, so the same module always gets the same result." },
  { icon: Hand, title: "You decide", body: "GroundEd advises. Nothing changes until you choose, and AI drafts are always labelled." },
];

export default function Landing() {
  usePageTitle();
  const [tab, setTab] = useState<"review" | "decide">("review");

  return (
    <div className="space-y-24 pb-8 md:space-y-[120px]">
      {/* 1 · Hero on the horizon band: before → after */}
      <section className="px-3 pt-6 sm:px-6">
        <HorizonBand>
          <div className="mx-auto max-w-5xl px-4 pb-12 pt-14 text-center sm:pt-20">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-surface/80 px-3.5 py-1.5 text-sm font-semibold text-lapis-deep">
              <BookOpenCheck size={16} aria-hidden /> For IT and computing courses
            </p>
            <h1 className="mx-auto mt-6 max-w-3xl text-[40px] leading-[1.05] tracking-[-0.035em] sm:text-[64px]">
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

            {/* Before → after */}
            <div className="relative mx-auto mt-14 grid max-w-3xl gap-4 text-left sm:grid-cols-2 sm:items-end">
              <figure className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:-rotate-2">
                <figcaption className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">In your module · page 4</figcaption>
                <p className="leading-relaxed text-ink">
                  Lab 3: Connect to the database using{" "}
                  <span className="rounded-[3px] bg-eol-soft px-0.5 underline decoration-eol decoration-2 underline-offset-[3px]">mysql_connect()</span>{" "}
                  and display the results in an HTML table.
                </p>
              </figure>
              <figure className="space-y-3 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-float)] sm:translate-y-4">
                <figcaption className="text-[11px] font-semibold uppercase tracking-[0.06em] text-lapis">With GroundEd</figcaption>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">Practice</span>
                  <span className="font-semibold">mysql_connect()</span>
                  <span className="ml-auto"><PriorityBadge priority="high" short /></span>
                </div>
                <StatusBadge status="eol" compact />
                <QuoteBlock size="sm" tone="source" caption="PHP Group · php.net · Official documentation">
                  The original MySQL extension was removed in PHP 7.0.0.
                </QuoteBlock>
              </figure>
            </div>
            <p className="mt-10 text-xs text-ink-subtle">Example finding, shown with a real source.</p>
          </div>
        </HorizonBand>
      </section>

      {/* 2 · Problem */}
      <section className={`${section} grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-center`}>
        <h2 className={sectionTitle}>Technology moves faster than curricula.</h2>
        <div className="space-y-4 text-lg text-ink-muted">
          <p>
            A 2023 study comparing university syllabi with six years of software job ads found industry demand for
            tools like Docker and Kubernetes rising faster than courses reflected it (Dobslaw et al., 2023). Tools
            already in a module can reach end-of-life within a few years.
          </p>
          <p>
            IT faculty we spoke with in the Philippines confirmed it: reviews are manual and infrequent, and checking
            every tool takes time they rarely have.
          </p>
        </div>
      </section>

      {/* 3 · Live mini-UI panels */}
      <section className={`${section} space-y-10`}>
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className={sectionTitle}>Review with confidence</h2>
          <p className="text-lg text-ink-muted">Everything you need to judge a finding, in one place.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Panel label="Progress" title="See every step">
            <div className="rounded-[var(--radius-card)] bg-surface p-5">
              <ProgressSteps
                steps={[
                  { label: "Reading the module", detail: "14 pages", state: "done" },
                  { label: "Finding technologies and practices", detail: "9 found", state: "done" },
                  { label: "Checking sources", detail: "5 of 9", state: "current" },
                  { label: "Scoring priorities", state: "waiting" },
                ]}
              />
            </div>
          </Panel>
          <Panel label="Evidence" title="Quote and source, side by side">
            <div className="space-y-4 rounded-[var(--radius-card)] bg-surface p-5">
              <QuoteBlock size="sm" caption="Your module · page 3">Pages are styled with Bootstrap 3</QuoteBlock>
              <QuoteBlock size="sm" tone="source" caption="endoflife.date · Support data">Bootstrap 3 · end of support 24 Jul 2019</QuoteBlock>
            </div>
          </Panel>
          <Panel label="Priority" title="Know why it ranks high">
            <div className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 text-sm">
              {[
                ["Lifecycle", 40, 40],
                ["Frequency", 12, 30],
                ["Labs", 20, 20],
                ["Activities", 10, 10],
              ].map(([label, pts, max]) => (
                <div key={label as string} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3">
                  <span className="font-medium">{label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                    <span className="block h-full rounded-full bg-ink" style={{ width: `${((pts as number) / (max as number)) * 100}%` }} />
                  </span>
                  <span className="text-right font-mono text-ink-subtle tabular-nums">{pts}/{max}</span>
                </div>
              ))}
              <p className="pt-1 text-ink-muted"><PriorityBadge priority="high" /> <span className="ml-1 font-mono">82/100</span></p>
            </div>
          </Panel>
          <Panel label="Your call" title="You decide what changes">
            {/* Illustration only: not interactive (landing cards are never clickable). */}
            <div className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5" aria-hidden>
              <div className="flex flex-wrap gap-2 text-sm font-semibold">
                <span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-lapis bg-sky px-3 py-1.5 text-lapis-deep">
                  <span className="h-3 w-3 rounded-full border-[4px] border-lapis" /> Update
                </span>
                <span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-line px-3 py-1.5">
                  <span className="h-3 w-3 rounded-full border-2 border-ink-subtle" /> Keep intentionally
                </span>
                <span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-line px-3 py-1.5">
                  <span className="h-3 w-3 rounded-full border-2 border-ink-subtle" /> Dismiss
                </span>
              </div>
              <p className="rounded-[var(--radius-control)] border border-line px-3 py-2 text-sm text-ink-subtle">Why? Students still maintain legacy systems</p>
            </div>
          </Panel>
        </div>
      </section>

      {/* 4 · See it work (demo video goes here once recorded) */}
      <section className={`${section} space-y-8`}>
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className={sectionTitle}>See it work</h2>
          <p className="text-lg text-ink-muted">Your module on the left, ranked findings on the right.</p>
        </div>
        <div className="flex justify-center">
          <div role="tablist" aria-label="Product preview" className="inline-flex rounded-full border border-line bg-panel p-1">
            {[
              { id: "review" as const, label: "Review a module" },
              { id: "decide" as const, label: "Decide on a finding" },
            ].map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                aria-controls="preview-panel"
                onClick={() => setTab(t.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t.id ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-muted hover:text-ink"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div id="preview-panel" role="tabpanel" className="mx-auto max-w-5xl">
          {/* TODO: replace with the recorded demo video (keep the BrowserFrame) */}
          <BrowserFrame url={tab === "review" ? "grounded.app/reports/web-systems" : "grounded.app/reports/web-systems/findings/f1"}>
            {tab === "review" ? <ReportPreview /> : <DecisionPreview />}
          </BrowserFrame>
        </div>
      </section>

      {/* 5 · How it works */}
      <section id="how-it-works" className={`${section} scroll-mt-24 space-y-10`}>
        <h2 className={`${sectionTitle} text-center`}>How it works</h2>
        <ol className="grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="space-y-4 rounded-[var(--radius-panel)] bg-panel p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lapis text-lg font-bold text-white" aria-hidden>
                {i + 1}
              </span>
              <h3 className="text-xl">
                <span className="sr-only">Step {i + 1}: </span>
                {s.title}
              </h3>
              <p className="text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 6 · Trust principles */}
      <section className={`${section} space-y-10`}>
        <h2 className={`${sectionTitle} text-center`}>Built to be trusted</h2>
        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {principles.map((p) => (
            <li key={p.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky text-lapis-deep">
                <p.icon size={20} aria-hidden />
              </span>
              <div>
                <h3 className="text-lg">{p.title}</h3>
                <p className="text-ink-muted">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 7 · Voices: real quotes only. Until we have consented quotes, show how it was validated. */}
      <section className={section}>
        <Panel className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-lapis"><MessageSquare size={22} aria-hidden /></span>
          <h2 className="text-[28px]">Shaped by educators</h2>
          <p className="max-w-xl text-ink-muted">
            The problem was validated with IT faculty in the Philippines, and we're now testing with educators in more
            countries. Tried GroundEd? Your feedback directly shapes what we build next.
          </p>
          <ButtonLink to="/feedback" variant="secondary">Share feedback</ButtonLink>
        </Panel>
      </section>

      {/* 8 · Closing CTA + product shot */}
      <section className={`${section} space-y-10 text-center`}>
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="flex justify-center"><Sprout size={56} /></div>
          <h2 className={sectionTitle}>Ready for next term?</h2>
          <p className="text-lg text-ink-muted">See what in your module may warrant review, in under a minute.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/analyze">Analyze a module</ButtonLink>
            <ButtonLink to="/methodology" variant="ghost">How GroundEd works →</ButtonLink>
          </div>
        </div>
        {/* Laptop: 16:10 screen in a bezel, on a base with a hinge notch. Illustration only. */}
        <div className="mx-auto max-w-4xl px-4" aria-hidden>
          <div className="rounded-[22px] bg-ink p-[12px] pb-[18px] shadow-[var(--shadow-float)]">
            <div className="mx-auto mb-2 h-1.5 w-1.5 rounded-full bg-[#3a4560]" />
            <div className="aspect-[16/10] overflow-hidden rounded-[6px] bg-canvas">
              <ReportPreview tall />
            </div>
          </div>
          <div className="relative mx-auto h-4 w-[112%] -translate-x-[5.4%] rounded-b-[18px] bg-gradient-to-b from-[#d6dae2] to-[#aeb4c0]">
            <div className="absolute left-1/2 top-0 h-1.5 w-28 -translate-x-1/2 rounded-b-[8px] bg-[#9aa1ae]" />
          </div>
        </div>
      </section>
    </div>
  );
}
