import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { Finding, FindingStatus } from "../types";
import { StatusBadge, STATUS_META } from "./ui/StatusBadge";
import { PriorityBadge } from "./ui/PriorityBadge";
import { QuoteBlock } from "./ui/QuoteBlock";
import { DecisionControl } from "./ui/DecisionControl";
import { SourceLink } from "./ui/SourceLink";
import { DECISION_DONE, type Decision, type Decisions } from "../lib/decisions";
import { KIND_LABEL, USAGE_LABEL, needsReview, pagesLabel, rankFindings, sourceHost, summaryLine } from "../lib/findings";
import { priorityOf } from "../lib/priority";

type Filter = "all" | "to-review" | FindingStatus;

interface Props {
  analysisId: string;
  findings: Finding[];
  decisions: Decisions;
  selectedId: string | null;
  /** Scroll the panel to the selected finding (when it was selected in the module). */
  scrollToSelected: boolean;
  onSelect: (id: string | null) => void;
  onDecide: (id: string, d: Decision) => void;
  onUndo: (id: string) => void;
}

/** Ranked findings, expandable in place (DESIGN.md §7: Report, right column). */
export default function FindingsPanel({ analysisId, findings, decisions, selectedId, scrollToSelected, onSelect, onDecide, onUndo }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showSupported, setShowSupported] = useState(false);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const ranked = useMemo(() => rankFindings(findings), [findings]);
  const review = ranked.filter(needsReview);
  const supported = ranked.filter((f) => !needsReview(f));

  const visible = review.filter((f) =>
    filter === "all" ? true : filter === "to-review" ? !decisions[f.id] : f.status === filter,
  );

  // Selecting a highlight in the module scrolls the panel to that finding.
  useEffect(() => {
    if (!selectedId) return;
    if (supported.some((f) => f.id === selectedId)) setShowSupported(true);
    if (filter !== "all" && !visible.some((f) => f.id === selectedId)) setFilter("all");
    if (scrollToSelected) requestAnimationFrame(() => itemRefs.current[selectedId]?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusesPresent = [...new Set(review.map((f) => f.status))];
  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: `All ${review.length}` },
    { id: "to-review", label: `To review ${review.filter((f) => !decisions[f.id]).length}` },
    ...statusesPresent.map((s) => ({ id: s as Filter, label: STATUS_META[s].label })),
  ];

  const renderItem = (f: Finding) => {
    const open = f.id === selectedId;
    const d = decisions[f.id];
    const priority = f.status === "supported" ? null : priorityOf(f.score);
    const panelId = `finding-panel-${f.id}`;
    return (
      <li key={f.id} ref={(el) => { itemRefs.current[f.id] = el; }}>
        <article
          className={`rounded-[var(--radius-card)] border bg-surface transition-shadow ${
            open ? "border-lapis shadow-[0_0_0_1px_var(--color-lapis)]" : "border-line hover:border-ink/30"
          }`}
        >
          <button
            type="button"
            onClick={() => onSelect(open ? null : f.id)}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex w-full flex-col gap-1.5 p-4 text-left"
          >
            <span className="flex w-full items-start gap-2">
              <span className="min-w-0 flex-1">
                {f.kind && <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">{KIND_LABEL[f.kind]}</span>}
                <span className="font-semibold text-ink">
                  {f.technology}
                  {f.version && <span className="ml-1 font-mono text-sm text-ink-muted">{f.version}</span>}
                </span>
              </span>
              {priority && <PriorityBadge priority={priority} short />}
              {f.score && priority && <span className="font-mono text-sm tabular-nums text-ink-muted">{f.score.total}</span>}
              <ChevronDown size={16} className={`mt-0.5 shrink-0 text-ink-subtle transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={f.status} compact />
              <span className="text-xs text-ink-subtle">
                {[f.usage && USAGE_LABEL[f.usage], pagesLabel(f)].filter(Boolean).join(" · ")}
              </span>
              {d && <span className="rounded-full bg-sky px-2 py-0.5 text-[11px] font-semibold text-lapis-deep">{DECISION_DONE[d.kind]}</span>}
            </span>
          </button>

          {open && (
            <div id={panelId} className="space-y-4 border-t border-line p-4">
              <p className="text-sm text-ink-muted">{summaryLine(f)}</p>
              {f.citations.slice(0, 2).map((c, i) => (
                <QuoteBlock key={i} size="sm" caption={`In your module · page ${c.page}`}>{c.snippet}</QuoteBlock>
              ))}
              {f.lifecycle && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-subtle">Source</p>
                  <SourceLink href={f.lifecycle.source_url}>{sourceHost(f.lifecycle.source_url)}</SourceLink>
                </div>
              )}
              {f.status !== "supported" && (
                <DecisionControl
                  compact
                  decision={d}
                  onSave={(dec) => onDecide(f.id, dec)}
                  onUndo={() => onUndo(f.id)}
                  updateExtras={f.upgrade ? { target: f.upgrade.target_cycle } : undefined}
                />
              )}
              <Link to={`/reports/${encodeURIComponent(analysisId)}/findings/${encodeURIComponent(f.id)}`} className="inline-flex items-center gap-1 text-sm font-semibold">
                Open full detail <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          )}
        </article>
      </li>
    );
  };

  return (
    <section aria-label="Findings" className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter findings">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={filter === c.id}
            onClick={() => setFilter(c.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              filter === c.id ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-muted hover:text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-surface p-4 text-sm text-ink-muted">No findings match this filter.</p>
      ) : (
        <ol className="space-y-2.5">{visible.map(renderItem)}</ol>
      )}

      {supported.length > 0 && (
        <div className="pt-2">
          <button type="button" className="text-sm font-semibold text-ink-muted hover:text-ink" onClick={() => setShowSupported(!showSupported)} aria-expanded={showSupported}>
            {showSupported ? "Hide" : "Show"} {supported.length} supported item{supported.length === 1 ? "" : "s"}
          </button>
          {showSupported && <ol className="mt-2.5 space-y-2.5">{supported.map(renderItem)}</ol>}
        </div>
      )}
    </section>
  );
}
