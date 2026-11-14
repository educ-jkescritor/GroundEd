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

/** Static example of the Report (module + ranked findings). Example content, not a real analysis. */
export function ReportPreview() {
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
