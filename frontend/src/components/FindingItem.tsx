import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Crosshair, Sparkles } from "lucide-react";
import { api, errorMessage } from "../api";
import type { Finding } from "../types";
import { AiSuggestion } from "./ui/AiSuggestion";
import { DecisionControl } from "./ui/DecisionControl";
import { Notice } from "./ui/Notice";
import { PRIORITY_STYLE, PriorityBadge } from "./ui/PriorityBadge";
import { PriorityInfo } from "./ui/PriorityInfo";
import { SourceLink } from "./ui/SourceLink";
import { DECISION_DONE, type Decision } from "../lib/decisions";
import { formatDate } from "../lib/format";
import { pagesOf, sourceHost, sourceShortName, statusShort, summaryLine, toneOf, usagePhrase } from "../lib/findings";

interface Props {
  analysisId: string;
  finding: Finding;
  decision: Decision | undefined;
  open: boolean;
  aiAvailable: boolean | null; // null = unknown yet
  onToggle: () => void;
  onDecide: (d: Decision) => void;
  onUndo: () => void;
  onShowInDocument: (cite: number) => void;
}

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-subtle";

/** Review-state pill: Updated = solid blue, Kept = solid slate, Dismissed = grey. */
const STATE_PILL: Record<Decision["kind"], string> = {
  update: "bg-lapis text-white",
  keep: "bg-unverified text-white",
  dismiss: "bg-panel-strong text-ink-muted",
};

export function StatePill({ decision }: { decision: Decision }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_PILL[decision.kind]}`}>
      <Check size={12} strokeWidth={3} aria-hidden /> {DECISION_DONE[decision.kind]}
    </span>
  );
}

/**
 * One finding (DESIGN.md §10). Hierarchy, so it can be understood without reading everything:
 *   collapsed: name + priority tag → bold status · what to use instead → pages and decision state
 *   expanded:  three KEY FACTS (status · in your module · use instead, values in bold)
 *              → THE EVIDENCE (what your module says ⇄ what the source says)
 *              → help (AI draft) → YOUR DECISION (pinned at the bottom). "Why this priority" is a tooltip on the tag.
 */
export default function FindingItem({ analysisId, finding: f, decision, open, aiAvailable, onToggle, onDecide, onUndo, onShowInDocument }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const tone = toneOf(f);
  const pages = pagesOf(f);
  const lc = f.lifecycle;
  const replacement = f.upgrade?.target_cycle;
  const who = sourceShortName(f);
  const panelId = `finding-${f.id}`;

  async function requestDraft() {
    setDrafting(true);
    setDraftError(null);
    try {
      setDraft((await api.draft(analysisId, f.id)).text);
    } catch (e) {
      setDraftError(errorMessage(e));
    } finally {
      setDrafting(false);
    }
  }

  return (
    <article className={`rounded-[var(--radius-card)] border bg-surface transition-shadow ${open ? "border-lapis shadow-[0_0_0_1px_var(--color-lapis),var(--shadow-float)]" : "border-line hover:border-ink/30"}`}>
      {/* Collapsed: what, how urgent, what to do. The text area toggles; the tag cluster sits beside it. */}
      <div className="flex items-start gap-2 p-4">
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className="grid min-w-0 flex-1 gap-1.5 text-left">
          <span className={`text-[15.5px] font-semibold leading-snug ${decision?.kind === "dismiss" && !open ? "text-ink-muted line-through decoration-ink-subtle" : "text-ink"}`}>
            {f.technology}
            {f.version && <span className="ml-1 font-mono text-sm font-medium text-ink-muted">{f.version}</span>}
          </span>
          {(!decision || open) && <span className="text-sm leading-snug">
            <span className="font-medium text-ink">{statusShort(f)}</span>
            {replacement && (
              <span className="text-ink-muted"> · Use <span className="font-semibold text-ink">{replacement}</span> instead</span>
            )}
          </span>}
          {(!decision || open) && (
            <span className="text-xs text-ink-subtle">{pages.length > 1 ? "Pages" : "Page"} {pages.join(", ")}</span>
          )}
        </button>
        <span className="flex shrink-0 items-center gap-0.5">
          {decision && !open ? (
            <StatePill decision={decision} />
          ) : (
            <>
              <PriorityBadge priority={tone} short />
              <PriorityInfo score={f.score} tone={tone} />
            </>
          )}
          <button type="button" onClick={onToggle} aria-label={open ? "Collapse" : "Expand"} className="flex h-6 w-6 items-center justify-center rounded-full text-ink-subtle hover:bg-panel">
            <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          </button>
        </span>
      </div>

      {open && (
        <div id={panelId} className="border-t border-line">
          <div className="space-y-5 p-4">
            {/* KEY FACTS: readable in 5 seconds */}
            <dl className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-[var(--radius-control)] bg-panel p-3">
                <dt className={LABEL}>Status</dt>
                <dd className={`mt-1 font-semibold leading-snug ${tone === "unverified" ? "text-ink" : PRIORITY_STYLE[tone].cls.split(" ").find((c) => c.startsWith("text-"))}`}>
                  {statusShort(f)}
                </dd>
                {lc?.eol_date && <dd className="mt-0.5 text-xs text-ink-subtle">{formatDate(lc.eol_date)}</dd>}
              </div>
              <div className="rounded-[var(--radius-control)] bg-panel p-3">
                <dt className={LABEL}>In your module</dt>
                <dd className="mt-1 font-semibold leading-snug text-ink">{usagePhrase(f) ?? "Mentioned"}</dd>
                <dd className="mt-0.5 text-xs text-ink-subtle">
                  {pages.length > 1 ? "Pages" : "Page"} {pages.join(", ")}{f.hands_on ? " · on a lab page" : ""}
                </dd>
              </div>
              <div className="rounded-[var(--radius-control)] bg-panel p-3">
                <dt className={LABEL}>Use instead</dt>
                <dd className="mt-1 font-semibold leading-snug text-ink">{replacement ?? "No sourced replacement"}</dd>
                {f.upgrade && <dd className="mt-0.5 text-xs text-ink-subtle">{sourceHost(f.upgrade.source_url)}</dd>}
              </div>
            </dl>

            {/* THE EVIDENCE: for checking */}
            <section className="space-y-3">
              <h4 className={LABEL}>The evidence</h4>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink-muted">Your module says</p>
                {f.citations.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-[var(--radius-control)] border border-line p-3">
                    <blockquote className="min-w-0 flex-1 border-l-2 border-clay pl-3 text-[15px] leading-snug text-ink">“{c.snippet}”</blockquote>
                    <button
                      type="button"
                      onClick={() => onShowInDocument(i)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-lapis-deep hover:border-lapis"
                      title="Show this text in the document"
                    >
                      <Crosshair size={12} aria-hidden /> p. {c.page}
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink-muted">{who ? `${who} says` : "Source"}</p>
                {lc ? (
                  <div className="rounded-[var(--radius-control)] border border-line p-3">
                    <blockquote className="border-l-2 border-lapis pl-3 text-[15px] leading-snug text-ink">
                      “{lc.source_quote ?? summaryLine(f)}”
                    </blockquote>
                    <p className="mt-2 text-xs text-ink-subtle">
                      <SourceLink href={lc.source_url}>{lc.source_name ?? sourceHost(lc.source_url)}</SourceLink>
                    </p>
                  </div>
                ) : (
                  <p className="rounded-[var(--radius-control)] border border-dashed border-line p-3 text-sm text-ink-muted">
                    No trusted source was found, so GroundEd makes no claim. Please check this one yourself.
                  </p>
                )}
              </div>
            </section>

            {/* HELP: AI draft (secondary, clearly labelled) */}
            {lc && (
              <section className="space-y-2">
                {draft === null ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={requestDraft}
                      disabled={drafting || aiAvailable === false}
                      className="inline-flex min-h-9 items-center gap-2 rounded-[var(--radius-control)] border border-ai/50 bg-ai-soft px-3.5 text-sm font-semibold text-ai hover:border-ai disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles size={14} aria-hidden /> {drafting ? "Drafting…" : "Draft updated wording"}
                    </button>
                    <span className="text-xs text-ink-subtle">
                      {aiAvailable === false ? "AI drafts aren't switched on for this server yet." : "Written by AI, for you to edit and approve."}
                    </span>
                  </div>
                ) : (
                  <AiSuggestion>
                    <label htmlFor={`${panelId}-draft`} className="sr-only">Draft text</label>
                    <textarea id={`${panelId}-draft`} rows={4} className="w-full text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} />
                    <p className="text-xs text-ink-muted">Choose <strong>Update</strong> below to approve this wording; it goes into your report.</p>
                  </AiSuggestion>
                )}
                {draftError && <Notice tone="error">{draftError}</Notice>}
              </section>
            )}

          </div>

          {/* YOUR DECISION: pinned to the bottom of the open card while you read */}
          <div className="sticky bottom-0 z-[1] rounded-b-[var(--radius-card)] border-t border-line bg-surface/95 p-4 backdrop-blur">
            <p className={`${LABEL} mb-2 flex items-center gap-1.5`}>Your decision <ArrowRight size={12} aria-hidden /></p>
            <DecisionControl compact decision={decision} onSave={onDecide} onUndo={onUndo} updateExtras={{ target: replacement, text: draft ?? undefined }} />
          </div>
        </div>
      )}
    </article>
  );
}
