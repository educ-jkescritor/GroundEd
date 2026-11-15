import type { ReactNode } from "react";
import { ArrowRight, Check, ChevronDown, FileText, Sparkles, Upload } from "lucide-react";
import { HorizonMark } from "./ui/Logo";
import { PriorityBadge } from "./ui/PriorityBadge";

/**
 * Browser-style frame for the landing walkthrough.
 * Uses a fixed viewport height so switching between steps never shifts the page layout.
 */
export function BrowserFrame({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-float)]">
      <div aria-hidden className="flex items-center gap-2 border-b border-line bg-panel px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-3 truncate rounded-md bg-surface px-3 py-0.5 font-mono text-xs text-ink-subtle">{url}</span>
      </div>
      <div className="h-[400px] overflow-hidden bg-canvas sm:h-[440px]" aria-hidden>
        {children}
      </div>
    </div>
  );
}

/** Step 1 schematic: mirrors the /analyze page (floating pill header, dashed PDF dropzone, sample module cards). */
export function UploadPreview() {
  return (
    <div className="flex h-full flex-col justify-between bg-canvas p-4 sm:p-6">
      {/* Mini floating pill header */}
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between rounded-full border border-line bg-surface px-3.5 py-2 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <HorizonMark size={18} />
          <span className="h-2.5 w-16 rounded-full bg-ink/80" />
        </div>
        <span className="h-6 w-24 rounded-full bg-lapis" />
      </div>

      {/* Main /analyze container */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 py-3">
        {/* Page heading bars */}
        <div className="space-y-2">
          <div className="h-4 w-40 rounded-full bg-ink/85" />
          <div className="h-2.5 w-72 max-w-full rounded-full bg-line" />
        </div>

        {/* Dashed upload dropzone */}
        <div className="flex flex-col items-center justify-center gap-2.5 rounded-[var(--radius-panel)] border-2 border-dashed border-lapis/45 bg-panel px-6 py-7 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-lapis shadow-[var(--shadow-card)]">
            <Upload size={18} />
          </span>
          <p className="text-xs font-semibold text-ink">Drop your module PDF here, or choose a file</p>
          <div className="h-2 w-48 max-w-full rounded-full bg-line" />
          <span className="mt-1 inline-flex items-center rounded-[var(--radius-control)] bg-lapis px-4 py-1.5 text-xs font-semibold text-white">
            Choose a PDF
          </span>
        </div>

        {/* Sample cards row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">Sample modules</span>
            <span className="h-2 w-28 rounded-full bg-line" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Legacy PHP lab manual", tag: "Sample PDF" },
              { label: "Modern PHP lab manual", tag: "Sample PDF" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3 shadow-[var(--shadow-card)]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-sky text-lapis-deep">
                    <FileText size={15} />
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <p className="truncate text-xs font-semibold text-ink">{s.label}</p>
                    <div className="h-2 w-36 max-w-full rounded-full bg-line" />
                  </div>
                </div>
                <ArrowRight size={14} className="shrink-0 text-ink-subtle" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Step 2 schematic: mirrors the /reports/:id side-by-side workspace
 * (compact workspace top bar, left PDF viewer with highlight boxes, right findings pane with % reviewed & filter pills).
 */
export function ReportPreview() {
  return (
    <div className="flex h-full flex-col bg-canvas">
      {/* Workspace top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <HorizonMark size={18} />
          <span className="text-xs font-semibold text-ink">Legacy PHP lab manual</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden h-6 w-24 items-center justify-center rounded-[8px] border border-line bg-surface text-[11px] font-medium text-ink-muted sm:inline-flex">
            + New analysis
          </span>
          <span className="inline-flex h-6 items-center rounded-[8px] border border-line bg-surface px-2.5 text-[11px] font-medium text-ink-muted">
            Download ▾
          </span>
          <span className="inline-flex h-6 items-center rounded-[8px] border border-line bg-surface px-2.5 text-[11px] font-medium text-ink-muted">
            Details
          </span>
        </div>
      </div>

      {/* Split panes */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1.25fr_1fr]">
        {/* Left: PDF viewer pane */}
        <div className="flex flex-col border-b border-line bg-panel-strong md:border-b-0 md:border-r">
          {/* PDF viewer toolbar */}
          <div className="flex items-center justify-between border-b border-line bg-surface px-3 py-1.5 text-[11px] text-ink-muted">
            <span className="font-medium text-ink">‹ Finding 1 of 3 ›</span>
            <span className="font-mono">Page 4 / 5</span>
            <div className="flex items-center gap-1.5">
              <span className="h-4 w-4 rounded bg-panel" />
              <span className="h-4 w-8 rounded bg-panel" />
              <span className="h-4 w-4 rounded bg-panel" />
            </div>
          </div>

          {/* Rendered PDF page sheet */}
          <div className="relative flex flex-1 items-center justify-center p-4">
            <div className="w-full max-w-md space-y-3 rounded-[8px] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <span className="h-2 w-20 rounded-full bg-line" />
                <span className="font-mono text-[10px] text-ink-subtle">p. 4</span>
              </div>
              <div className="h-3.5 w-48 rounded-full bg-ink/80" />
              <div className="space-y-2 pt-1">
                <div className="h-2.5 w-full rounded-full bg-panel-strong" />
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-16 rounded-full bg-panel-strong" />
                  <span className="rounded-[4px] border-b-2 border-high bg-high-soft px-2 py-0.5 text-[11px] font-semibold text-ink outline-2 outline-offset-1 outline-lapis">
                    mysql_connect()
                  </span>
                  <span className="h-2.5 flex-1 rounded-full bg-panel-strong" />
                </div>
                <div className="h-2.5 w-11/12 rounded-full bg-panel-strong" />
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="h-2.5 w-24 rounded-full bg-panel-strong" />
                  <span className="rounded-[4px] border-b-2 border-medium bg-medium-soft px-2 py-0.5 text-[11px] font-medium text-ink">
                    PHP 5.6
                  </span>
                  <span className="h-2.5 flex-1 rounded-full bg-panel-strong" />
                </div>
                <div className="h-2.5 w-9/12 rounded-full bg-panel-strong" />
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="h-2.5 w-20 rounded-full bg-panel-strong" />
                  <span className="rounded-[4px] border-b-2 border-low bg-low-soft px-2 py-0.5 text-[11px] font-medium text-ink">
                    &lt;% %&gt; tags
                  </span>
                  <span className="h-2.5 w-16 rounded-full bg-panel-strong" />
                </div>
              </div>
            </div>

            {/* Scrollbar markers */}
            <div className="absolute right-1.5 top-6 bottom-6 flex w-1.5 flex-col justify-around">
              <span className="h-2.5 w-full rounded-full bg-high ring-2 ring-lapis" />
              <span className="h-2.5 w-full rounded-full bg-medium" />
              <span className="h-2.5 w-full rounded-full bg-low" />
            </div>
          </div>
        </div>

        {/* Right: Results list pane */}
        <div className="flex flex-col bg-surface">
          {/* Summary header & filter pills */}
          <div className="space-y-2.5 border-b border-line px-4 pt-3 pb-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg leading-tight text-ink">3 findings to be reviewed</p>
                <p className="text-[11px] text-ink-muted">Most important first.</p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl leading-none text-high">66%</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">outdated</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex h-7 items-center justify-center gap-1.5 rounded-full border border-ink bg-ink px-3 text-xs font-semibold text-white">
                <span>All</span>
                <span className="tabular-nums opacity-75">3</span>
              </span>
              <PriorityBadge priority="high" count={1} />
              <PriorityBadge priority="medium" count={1} />
              <PriorityBadge priority="low" count={1} />
            </div>
            <div className="flex gap-4 pt-1 text-xs font-semibold">
              <span className="border-b-2 border-ink pb-1 text-ink">Findings (3)</span>
              <span className="pb-1 text-ink-subtle">Sources</span>
            </div>
          </div>

          {/* Stacked finding cards (collapsed: only title + pages) */}
          <div className="space-y-2 p-3">
            {[
              { name: "mysql_connect()", pages: "Page 4", p: "high" as const, active: true },
              { name: "PHP 5.6", pages: "Pages 2, 4", p: "medium" as const, active: false },
              { name: "ASP-style <% %> tags", pages: "Page 4", p: "low" as const, active: false },
            ].map((item) => (
              <div
                key={item.name}
                className={`flex items-center justify-between gap-2 rounded-[12px] border p-3 ${
                  item.active ? "border-lapis bg-surface shadow-[0_0_0_1px_var(--color-lapis)]" : "border-line bg-surface"
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-xs font-semibold text-ink">{item.name}</p>
                  <p className="truncate text-[11px] text-ink-subtle">{item.pages}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <PriorityBadge priority={item.p} short />
                  <ChevronDown size={14} className="text-ink-subtle" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Step 3 schematic: mirrors an expanded FindingItem card inside /reports/:id
 * (3 key-fact tiles, side-by-side module & source quote blocks, AI suggestion box, and decision bar).
 */
export function DecisionPreview() {
  return (
    <div className="flex h-full flex-col bg-canvas">
      {/* Workspace top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <HorizonMark size={18} />
          <span className="text-xs font-semibold text-ink">Legacy PHP lab manual</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-[8px] bg-lapis px-2.5 text-[11px] font-semibold text-white">
            Download report ▾
          </span>
        </div>
      </div>

      {/* Split panes: Left PDF focused on quote, Right expanded finding card */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_1.35fr]">
        {/* Left: PDF pane focused on the selected highlight */}
        <div className="hidden flex-col justify-center border-r border-line bg-panel-strong p-4 md:flex">
          <div className="space-y-3 rounded-[8px] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between text-[10px] text-ink-subtle">
              <span className="font-semibold uppercase tracking-[0.06em]">Page 4</span>
              <span className="rounded-full bg-high-soft px-2 py-0.5 font-semibold text-high">Selected quote</span>
            </div>
            <div className="h-3 w-36 rounded-full bg-ink/80" />
            <div className="rounded-[6px] border-l-2 border-high bg-high-soft/70 p-2.5 outline-2 outline-high">
              <p className="text-xs font-medium text-ink">
                “Connect to the database using <span className="underline decoration-high decoration-2">mysql_connect()</span>”
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-2 w-full rounded-full bg-panel-strong" />
              <div className="h-2 w-10/12 rounded-full bg-panel-strong" />
              <div className="h-2 w-8/12 rounded-full bg-panel-strong" />
            </div>
          </div>
        </div>

        {/* Right: Expanded FindingItem card anatomy (Outdated card + Updated/Source card + AI draft + Decision) */}
        <div className="flex flex-col justify-between bg-surface p-4">
          <div className="space-y-3 rounded-[12px] border border-lapis p-3.5 shadow-[0_0_0_1px_var(--color-lapis)]">
            {/* Card header (title + page) */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-ink">mysql_connect()</p>
                <p className="text-[10px] text-ink-subtle">Page 4</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-lapis px-2 py-0.5 text-[11px] font-semibold text-white">
                  <Check size={11} strokeWidth={3} /> Updated
                </span>
                <PriorityBadge priority="high" short />
              </div>
            </div>

            {/* Clickable Outdated card + Clickable Updated/Source card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 rounded-[8px] border border-line bg-surface p-2.5">
                <div className="min-w-0 flex-1 space-y-1.5 border-l-2 border-clay pl-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">Outdated in your module</p>
                  <div className="h-2 w-10/12 rounded-full bg-ink/30" />
                </div>
                <span className="rounded-full border border-line bg-panel px-2 py-0.5 text-[10px] font-semibold text-lapis-deep">
                  Page 4
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-[8px] border border-line bg-surface p-2.5">
                <div className="min-w-0 flex-1 space-y-1.5 border-l-2 border-lapis pl-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-lapis-deep">Use PDO or mysqli instead</p>
                  <div className="h-2 w-11/12 rounded-full bg-lapis/30" />
                </div>
                <span className="rounded-full border border-line bg-panel px-2 py-0.5 text-[10px] font-semibold text-lapis-deep">
                  php.net ↗
                </span>
              </div>
            </div>

            {/* AI suggestion schematic */}
            <div className="space-y-1.5 rounded-[10px] border-2 border-dashed border-ai/40 bg-ai-soft p-2.5">
              <p className="flex items-center gap-1 text-[11px] font-medium text-ai">
                <Sparkles size={12} /> AI suggestion: not sourced. Review and edit before using.
              </p>
              <div className="h-2 w-11/12 rounded-full bg-ai/25" />
              <div className="h-2 w-7/12 rounded-full bg-ai/20" />
            </div>

            {/* Pinned decision control bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
              <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className="rounded-[8px] border border-lapis bg-sky px-2.5 py-1 text-lapis-deep">● Update</span>
                <span className="rounded-[8px] border border-line bg-surface px-2.5 py-1 text-ink">○ Keep intentionally</span>
                <span className="rounded-[8px] border border-line bg-surface px-2.5 py-1 text-ink">○ Dismiss</span>
              </div>
              <span className="text-[11px] font-semibold text-lapis-deep">Undo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
