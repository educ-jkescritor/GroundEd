import { BookOpen, CheckCheck, Database, Library, Scale, ShieldQuestion } from "lucide-react";
import { Page } from "../components/Layout";
import { ButtonLink } from "../components/ui/Button";
import { Card, Panel } from "../components/ui/Card";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { FindingStatus } from "../types";
import { usePageTitle } from "../lib/usePageTitle";

const tiers = [
  { n: 1, name: "Support data", proves: "A version is no longer supported", ex: "endoflife.date, vendor support pages" },
  { n: 2, name: "Official documentation", proves: "Something was removed or replaced, and by what", ex: "php.net, MDN, framework docs" },
  { n: 3, name: "Curriculum standards", proves: "What courses like this should cover", ex: "ACM/IEEE CS2023" },
  { n: 4, name: "Industry trends", proves: "Popularity only, never \"end-of-life\" on its own", ex: "Developer surveys" },
];

const scoring = [
  { factor: "Lifecycle", max: 40, rule: "Support stage from the lifecycle record: end-of-life scores highest" },
  { factor: "Frequency", max: 30, rule: "6 points for each page where the item appears, up to 30" },
  { factor: "Labs", max: 20, rule: "20 if students use it in a lab, confirmed by a quote from the module" },
  { factor: "Learning activities", max: 10, rule: "10 if it's part of an assignment or activity, confirmed by a quote" },
];

const statuses: { s: FindingStatus; meaning: string }[] = [
  { s: "eol", meaning: "No longer supported by its maintainers, according to a trusted source." },
  { s: "nearing_eol", meaning: "Support ends soon (within about two years)." },
  { s: "less_used", meaning: "Still supported, but industry use is declining. A hint, not a reason on its own." },
  { s: "supported", meaning: "Currently supported. No action needed." },
  { s: "unverified", meaning: "No trusted source found. GroundEd doesn't guess; please check it yourself." },
];

const steps = [
  { icon: BookOpen, title: "Read", body: "Extract the text of each page of your module." },
  { icon: Database, title: "Detect", body: "Find technologies and practices. AI suggests candidates; code matches them to known names." },
  { icon: Library, title: "Look up", body: "Get support dates directly from lifecycle records and official documentation, never from AI." },
  { icon: CheckCheck, title: "Verify", body: "Keep a finding only if its quote really appears in your module and the source really supports it." },
  { icon: Scale, title: "Score", body: "Apply fixed rules in code, so the same module always gets the same result." },
];

export default function Methodology() {
  usePageTitle("How GroundEd works");

  return (
    <Page narrow>
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-subtle">Methodology</p>
        <h1 className="text-[40px] leading-tight">How GroundEd works</h1>
        <p className="text-lg text-ink-muted">
          The principle: <strong className="text-ink">the AI can only say what the sources prove.</strong> Code finds,
          checks and scores the evidence; AI helps detect names and draft wording; you decide.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl">The five steps</h2>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-[var(--radius-card)] border border-line p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky font-bold text-lapis-deep">{i + 1}</span>
              <div>
                <h3 className="flex items-center gap-2 text-base"><s.icon size={16} aria-hidden className="text-ink-subtle" /> {s.title}</h3>
                <p className="text-ink-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="sources" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl">Where the facts come from</h2>
        <p className="text-ink-muted">Every source has a tier, shown in words next to it. A stronger tier wins when sources disagree.</p>
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-[0.06em] text-ink-subtle">
              <tr><th className="p-3">Tier</th><th className="p-3">Proves</th><th className="p-3">Examples</th></tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.n} className="border-t border-line">
                  <td className="p-3 font-semibold">{t.n} · {t.name}</td>
                  <td className="p-3 text-ink-muted">{t.proves}</td>
                  <td className="p-3 text-ink-muted">{t.ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="statuses" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl">What each status means</h2>
        <ul className="space-y-3">
          {statuses.map(({ s, meaning }) => (
            <li key={s} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="sm:w-56"><StatusBadge status={s} /></span>
              <span className="text-ink-muted">{meaning}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="scoring" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl">How the priority score works</h2>
        <p className="text-ink-muted">
          Each verified finding gets up to 100 points from fixed rules, never from AI. Unverified items are not scored.
          These are initial values and will be refined as we test with educators.
        </p>
        <Card className="divide-y divide-line p-0">
          {scoring.map((s) => (
            <div key={s.factor} className="flex gap-4 p-4">
              <span className="w-12 shrink-0 font-mono text-lg tabular-nums text-ink-subtle">{s.max}</span>
              <div>
                <p className="font-semibold">{s.factor}</p>
                <p className="text-sm text-ink-muted">{s.rule}</p>
              </div>
            </div>
          ))}
        </Card>
        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
          <PriorityBadge priority="high" /> 80 and above
          <PriorityBadge priority="medium" /> 50 to 79
          <PriorityBadge priority="low" /> below 50
        </div>
      </section>

      <section id="coverage" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl">What's covered, and the limits</h2>
        <Panel>
          <ul className="list-disc space-y-2 pl-5 text-ink-muted">
            <li><strong className="text-ink">Technology courses only</strong> for now: IT, computing and web development. Other subjects (for example general education) get "Not covered yet" instead of findings.</li>
            <li><strong className="text-ink">Text-based PDFs.</strong> Scanned pages can't be read yet.</li>
            <li><strong className="text-ink">Support changes over time.</strong> Every report says "as of" the date it was made.</li>
            <li><strong className="text-ink">Advisory only.</strong> GroundEd never edits your module. AI-drafted wording is always labelled and must be approved by you.</li>
          </ul>
        </Panel>
        <p className="flex items-start gap-2 text-sm text-ink-muted">
          <ShieldQuestion size={16} className="mt-0.5 shrink-0" aria-hidden />
          Privacy: your module's text is processed by Google Gemini to find technologies, and uploads are deleted after 24 hours.
        </p>
      </section>

      <div className="flex flex-wrap gap-3 pt-2">
        <ButtonLink to="/analyze">Analyze a module</ButtonLink>
        <ButtonLink to="/feedback" variant="secondary">Give feedback</ButtonLink>
      </div>
    </Page>
  );
}
