import type { ReactNode } from "react";
import { StatusBadge } from "./ui/StatusBadge";
import { PriorityBadge } from "./ui/PriorityBadge";
import { QuoteBlock } from "./ui/QuoteBlock";

/** Browser-style frame for previews and (later) the demo video. Decorative chrome is hidden from screen readers. */
export function BrowserFrame({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-float)]">
      <div aria-hidden className="flex items-center gap-2 border-b border-line bg-panel px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-3 truncate rounded-md bg-surface px-3 py-0.5 font-mono text-[11px] text-ink-subtle">{url}</span>
      </div>
      {children}
    </div>
  );
}

const hl = "rounded-[3px] px-0.5 underline decoration-2 underline-offset-[3px]";

/**
 * Static example of the Report (module + ranked findings). Example content, not a real analysis.
 * `tall` fills a 16:10 screen (the laptop shot): adds the report header, a second page and more findings.
 */
export function ReportPreview({ tall = false }: { tall?: boolean }) {
  if (tall) return <ReportPreviewTall />;
  return (
    <div className="grid gap-4 bg-canvas p-4 text-left text-sm md:grid-cols-[1.4fr_1fr] sm:p-5">
      <div className="space-y-3 rounded-[var(--radius-card)] border border-line p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">Page 4</p>
        <p className="font-semibold">Lab 3: Database connectivity</p>
        <p className="leading-relaxed text-ink-muted">
          <span className={`${hl} bg-eol-soft decoration-eol text-ink outline-2 outline-offset-1 outline-lapis`}>Connect to the database using mysql_connect()</span>{" "}
          and display the results in an HTML table. Activity: build the catalog page using{" "}
          <span className={`${hl} bg-declining-soft decoration-declining text-ink`}>table-based layouts</span>.
        </p>
        <div className="space-y-1.5 pt-1" aria-hidden>
          <div className="h-2 w-11/12 rounded bg-panel-strong" />
          <div className="h-2 w-9/12 rounded bg-panel-strong" />
        </div>
      </div>
      <div className="space-y-2.5">
        <div className="space-y-2 rounded-[var(--radius-card)] border border-lapis p-3 shadow-[0_0_0_1px_var(--color-lapis)]">
          <div className="flex items-center gap-2">
            <span className="flex-1 font-semibold">mysql_connect()</span>
            <PriorityBadge priority="high" short />
          </div>
          <StatusBadge status="eol" compact />
          <QuoteBlock size="sm" tone="source" caption="php.net · Official documentation">
            The original MySQL extension was removed in PHP 7.0.0.
          </QuoteBlock>
        </div>
        {[
          { name: "PHP 5.6", status: "eol" as const, p: "medium" as const },
          { name: "Table-based layouts", status: "less_used" as const, p: "low" as const },
        ].map((r) => (
          <div key={r.name} className="flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-line p-3">
            <span className="flex-1 font-semibold">{r.name}</span>
            <StatusBadge status={r.status} compact />
            <PriorityBadge priority={r.p} short />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportPreviewTall() {
  const rows = [
    { name: "PHP 5.6", status: "eol" as const, p: "medium" as const },
    { name: "AngularJS 1.x", status: "eol" as const, p: "low" as const },
    { name: "Bootstrap 3", status: "eol" as const, p: "low" as const },
    { name: "Node.js 22", status: "nearing_eol" as const, p: "low" as const },
    { name: "Table-based layouts", status: "less_used" as const, p: "low" as const },
  ];
  return (
    <div className="flex h-full flex-col gap-3 bg-canvas p-4 text-left text-[11px] leading-snug sm:text-xs">
      {/* Mini header band */}
      <div className="flex items-center gap-3 rounded-[12px] bg-panel px-4 py-3">
        <div className="flex-1">
          <p className="text-[10px] text-ink-subtle">Web Systems and Technologies.pdf · 5 pages · As of 14 Nov 2026</p>
          <p className="text-sm font-bold sm:text-base">7 findings may warrant review</p>
        </div>
        <PriorityBadge priority="high" count={1} />
        <PriorityBadge priority="medium" count={1} />
        <PriorityBadge priority="low" count={4} />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1.35fr_1fr] gap-3">
        {/* Module pages */}
        <div className="space-y-2.5 overflow-hidden">
          {[
            { n: 2, title: "Weeks 1 to 3: Server-side programming", body: <><span className={`${hl} bg-eol-soft decoration-eol`}>All laboratory exercises use PHP 5.6</span> running on a local XAMPP server.</> },
            { n: 4, title: "Lab 3: Database connectivity", body: <><span className={`${hl} bg-eol-soft decoration-eol outline-2 outline-offset-1 outline-lapis`}>Connect to the database using mysql_connect()</span> and display the results in an HTML table. Activity: use <span className={`${hl} bg-declining-soft decoration-declining`}>table-based layouts</span>.</> },
            { n: 5, title: "Week 8: Modern tooling preview", body: <>Students install <span className={`${hl} bg-nearing-soft decoration-nearing`}>Node.js 22</span> to run build tools; the final project is built with React.</> },
          ].map((p) => (
            <div key={p.n} className="space-y-1 rounded-[10px] border border-line p-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">Page {p.n}</p>
              <p className="font-semibold">{p.title}</p>
              <p className="text-ink-muted">{p.body}</p>
            </div>
          ))}
        </div>
        {/* Ranked findings */}
        <div className="space-y-2 overflow-hidden">
          <div className="space-y-1.5 rounded-[10px] border border-lapis p-2.5 shadow-[0_0_0_1px_var(--color-lapis)]">
            <div className="flex items-center gap-2">
              <span className="flex-1 font-semibold">mysql_connect()</span>
              <PriorityBadge priority="high" short />
            </div>
            <StatusBadge status="eol" compact />
            <p className="border-l-2 border-lapis pl-2">“The original MySQL extension was removed in PHP 7.0.0.”</p>
          </div>
          {rows.map((r) => (
            <div key={r.name} className="flex items-center gap-1.5 rounded-[10px] border border-line px-2.5 py-2">
              <span className="flex-1 truncate font-semibold">{r.name}</span>
              <StatusBadge status={r.status} compact />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Static example of a finding decision. */
export function DecisionPreview() {
  return (
    <div className="grid gap-4 bg-canvas p-4 text-left text-sm sm:p-5 md:grid-cols-2">
      <div className="space-y-3 rounded-[var(--radius-panel)] bg-panel p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">In your module · page 4</p>
        <QuoteBlock size="sm">Lab 3: Connect to the database using mysql_connect()</QuoteBlock>
      </div>
      <div className="space-y-3 rounded-[var(--radius-panel)] bg-panel p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">Source · Official documentation</p>
        <QuoteBlock size="sm" tone="source" caption="PHP Group · php.net">The original MySQL extension was removed in PHP 7.0.0.</QuoteBlock>
      </div>
      <div className="space-y-3 rounded-[var(--radius-card)] border border-line p-4 md:col-span-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">Your decision</p>
        <div className="flex flex-wrap gap-2" aria-hidden>
          <span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-lapis bg-sky px-3 py-1.5 font-semibold text-lapis-deep">● Update</span>
          <span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-line px-3 py-1.5 font-semibold">○ Keep intentionally</span>
          <span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-line px-3 py-1.5 font-semibold">○ Dismiss</span>
        </div>
        <p className="text-ink-muted">Suggested replacement: <strong className="text-ink">PDO or mysqli</strong> (php.net)</p>
      </div>
    </div>
  );
}
