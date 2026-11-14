import { BookOpenCheck, FileSearch, Gauge, Hand, Link2, ShieldQuestion, Upload, UserCheck } from "lucide-react";
import { ButtonLink } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/StatusBadge";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { usePageTitle } from "../lib/usePageTitle";

const steps = [
  { icon: Upload, title: "Upload your syllabus", body: "Drop in a PDF, or try one of our sample syllabi. No account needed." },
  { icon: FileSearch, title: "Get cited findings", body: "GroundEd finds technologies and practices, then checks each against lifecycle records and official documentation." },
  { icon: UserCheck, title: "You decide", body: "Review the evidence, accept a suggested upgrade, or ask for a draft. Nothing changes without your approval." },
];

const principles = [
  { icon: Link2, title: "Every finding is cited", body: "The syllabus page where the tool appears, and the lifecycle record behind it." },
  { icon: ShieldQuestion, title: "No guessing", body: "If there's no source, the item is marked Unverified, not filled in by AI." },
  { icon: Gauge, title: "Transparent priority", body: "A 100-point score with a visible breakdown, so you see why each item ranks where it does." },
  { icon: Hand, title: "You stay in control", body: "AI drafts are clearly labelled suggestions. You edit and approve every change." },
];

// Mirrors docs/design-brief.md §5.2 (initial defaults, to be refined after evaluation).
const scoring = [
  { factor: "Lifecycle", max: 40, rule: "Support stage from the lifecycle record: the further past end-of-life, the higher" },
  { factor: "Frequency", max: 30, rule: "6 points for each page where the item appears, up to 30" },
  { factor: "Labs", max: 20, rule: "20 if students use it in a lab, confirmed by a quote from the syllabus" },
  { factor: "Learning activities", max: 10, rule: "10 if it's part of an assignment or activity, confirmed by a quote" },
];

export default function Landing() {
  usePageTitle();
  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand">
            <BookOpenCheck size={16} aria-hidden /> For web development courses
          </p>
          <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">
            Keep your syllabus current, with sources you can check.
          </h1>
          <p className="max-w-xl text-lg text-ink-muted">
            GroundEd reads your web development syllabus and finds languages, frameworks, tools and practices that
            may be outdated. Every finding cites the page it came from and a trusted source. Nothing changes without
            your approval.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/analyze">Analyze a syllabus</ButtonLink>
            <ButtonLink to="/analyze#samples" variant="secondary">Try a sample</ButtonLink>
          </div>
        </div>

        {/* Product preview: a static example finding */}
        <Card className="space-y-4" aria-label="Example finding">
          <div className="flex items-center gap-3">
            <StatusBadge status="eol" />
            <span className="ml-auto flex items-center gap-2">
              <PriorityBadge priority="high" />
              <span className="font-mono text-sm tabular-nums">82/100</span>
            </span>
          </div>
          <h2 className="text-lg font-semibold">Python 2.7</h2>
          <blockquote className="border-l-2 border-line pl-3 font-serif italic text-ink-muted">
            “Lab exercises use Python 2.7” <span className="not-italic text-ink-subtle">(p. 2)</span>
          </blockquote>
          <p className="text-sm text-ink-muted">
            No longer supported since 1 Jan 2020; may warrant review · source:{" "}
            <a href="https://endoflife.date/python" target="_blank" rel="noreferrer">endoflife.date/python</a>
          </p>
        </Card>
      </section>

      {/* Problem */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-3">
          <h2 className="font-serif text-3xl font-semibold lg:col-span-1">Technology moves faster than curricula.</h2>
          <div className="space-y-4 text-ink-muted lg:col-span-2">
            <p>
              A 2023 study comparing university syllabi with six years of software job ads found rising industry
              demand for tools such as Docker and Kubernetes that curricula didn't reflect to the same degree
              (Dobslaw et al., 2023). Meanwhile, tools already in a syllabus can reach end-of-life within a few years,
              so students spend lab hours on software the industry has left behind.
            </p>
            <p>
              Faculty we spoke with in the Philippines confirmed it: syllabus reviews are manual and infrequent, and
              checking every tool against a fast-moving industry takes time they rarely have.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 space-y-10 px-4 py-16 sm:px-6">
        <h2 className="font-serif text-3xl font-semibold">How it works</h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <s.icon size={18} aria-hidden />
                  </span>
                  <span className="font-mono text-sm text-ink-subtle">0{i + 1}</span>
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-ink-muted">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Principles */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6">
          <h2 className="font-serif text-3xl font-semibold">Built to be trusted</h2>
          <ul className="grid gap-8 sm:grid-cols-2">
            {principles.map((p) => (
              <li key={p.title} className="flex gap-4">
                <p.icon size={22} className="mt-1 shrink-0 text-brand" aria-hidden />
                <div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="text-ink-muted">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Scoring */}
      <section id="scoring" className="mx-auto max-w-3xl scroll-mt-20 space-y-6 px-4 py-16 sm:px-6">
        <h2 className="font-serif text-3xl font-semibold">How the priority score works</h2>
        <p className="text-ink-muted">
          Each verified item gets up to 100 points from fixed rules in code, never from AI, so the same syllabus
          always gets the same score. Unverified items are not scored; they are flagged for a manual check.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <PriorityBadge priority="high" /> <span className="text-ink-muted">80 and above</span>
          <PriorityBadge priority="medium" /> <span className="text-ink-muted">50–79</span>
          <PriorityBadge priority="low" /> <span className="text-ink-muted">below 50</span>
        </div>
        <Card className="divide-y divide-line p-0">
          {scoring.map((s) => (
            <div key={s.factor} className="flex gap-4 p-4">
              <span className="w-12 shrink-0 font-mono tabular-nums text-ink-subtle">{s.max}</span>
              <div>
                <p className="font-semibold">{s.factor}</p>
                <p className="text-sm text-ink-muted">{s.rule}</p>
              </div>
            </div>
          ))}
        </Card>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Card className="flex flex-col items-start gap-4 bg-ink p-8 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold">See it on a real syllabus</h2>
            <p className="text-white/75">Takes under a minute. No account required.</p>
          </div>
          <ButtonLink to="/analyze" variant="secondary">Analyze a syllabus</ButtonLink>
        </Card>
      </section>
    </>
  );
}
