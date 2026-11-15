import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Crosshair, ExternalLink, RotateCcw, Sparkles, X } from "lucide-react";
import { api, errorMessage } from "../api";
import type { Finding } from "../types";
import { DecisionControl } from "./ui/DecisionControl";
import { Notice } from "./ui/Notice";
import { PriorityBadge } from "./ui/PriorityBadge";
import { DECISION_DONE, type Decision } from "../lib/decisions";
import { formatDate } from "../lib/format";
import { pagesOf, sourceHost, sourceShortName, statusShort, summaryLine, toneOf } from "../lib/findings";

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

const LABEL = "font-sans text-xs font-bold uppercase tracking-[0.06em] text-ink [-webkit-text-stroke:0]";

/** Review-state pill: Updated = solid blue, Kept = solid slate, Dismissed = grey. */
const STATE_PILL: Record<Decision["kind"], string> = {
  update: "bg-lapis text-white",
  keep: "bg-unverified text-white",
  dismiss: "bg-panel-strong text-ink-muted",
};

export function StatePill({ decision }: { decision: Decision }) {
  return (
    <span className={`inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold ${STATE_PILL[decision.kind]}`}>
      <Check size={12} strokeWidth={3} aria-hidden /> {DECISION_DONE[decision.kind]}
    </span>
  );
}

/**
 * One finding card in the Results workspace.
 * - Collapsed (Progressive Disclosure / Hick's Law): shows only the finding title and the page(s) where it appears.
 * - Expanded (Fitts's Law & Clear Affordances):
 *   1. Full-card clickable items for each outdated mention in the module (scrolls PDF viewer to the exact page & quote).
 *   2. Full-card clickable card for the updated information & official documentation (opens external source URL).
 *   3. Cohesive AI rewrite suggestion card (dashed violet boundary) & static faculty decision footer.
 */
export default function FindingItem({
  analysisId,
  finding: f,
  decision,
  open,
  aiAvailable,
  onToggle,
  onDecide,
  onUndo,
  onShowInDocument,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const tone = toneOf(f);
  const pages = pagesOf(f);
  const lc = f.lifecycle;
  const replacement = f.upgrade?.target_cycle;
  const sourceUrl = f.upgrade?.source_url ?? lc?.source_url;
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
    <article
      className={`rounded-[var(--radius-card)] border bg-surface transition-shadow ${
        open ? "border-lapis shadow-[0_0_0_1px_var(--color-lapis),var(--shadow-float)]" : "border-line hover:border-ink/30"
      }`}
    >
      {/* Collapsed header: ONLY title + pages where the outdated content appears */}
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="grid min-w-0 flex-1 gap-1 text-left"
        >
          <span
            className={`text-[15.5px] font-semibold leading-snug ${
              decision?.kind === "dismiss" && !open ? "text-ink-muted line-through decoration-ink-subtle" : "text-ink"
            }`}
          >
            {f.technology}
            {f.version && <span className="ml-1 font-mono text-sm font-medium text-ink-muted">{f.version}</span>}
          </span>
          <span className="text-xs text-ink-subtle">
            {pages.length > 1 ? "Pages" : "Page"} {pages.join(", ")}
          </span>
        </button>

        <span className="flex shrink-0 items-center gap-1.5">
          {decision && !open ? (
            <StatePill decision={decision} />
          ) : (
            <PriorityBadge priority={tone} short score={f.score} />
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? "Collapse" : "Expand"}
            className="flex h-6 w-6 items-center justify-center rounded-full text-ink-subtle hover:bg-panel"
          >
            <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          </button>
        </span>
      </div>

      {open && (
        <div id={panelId} className="border-t border-line">
          <div className="space-y-5 p-4">
            {/* 1 · OUTDATED MENTIONS IN THE MODULE (entire card is clickable -> scrolls to page) */}
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className={`${LABEL} flex items-center gap-2`}>
                  <span aria-hidden className="h-2 w-2 rounded-full bg-clay" />
                  Outdated in your module
                </h4>
                <span className="text-xs font-medium text-ink-subtle">Click to view in page</span>
              </div>
              <div className="space-y-2">
                {f.citations.slice(0, 3).map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onShowInDocument(i)}
                    className="group flex w-full cursor-pointer items-start justify-between gap-3 rounded-[var(--radius-control)] border border-line bg-surface p-3.5 text-left transition-all hover:border-lapis hover:bg-panel/60 hover:shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lapis"
                  >
                    <blockquote className="min-w-0 flex-1 border-l-2 border-clay pl-3 text-[15px] leading-snug text-ink">
                      “{c.snippet}”
                    </blockquote>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-panel px-2.5 py-1 text-xs font-semibold text-lapis-deep transition-colors group-hover:border-lapis group-hover:bg-sky">
                      <Crosshair size={12} aria-hidden /> Page {c.page}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* 2 · UPDATED INFORMATION & SOURCE (entire card is clickable -> opens external source URL) */}
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className={`${LABEL} flex items-center gap-2`}>
                  <span aria-hidden className="h-2 w-2 rounded-full bg-lapis" />
                  Updated information &amp; source
                </h4>
                {sourceUrl && <span className="text-xs font-medium text-ink-subtle">Opens official source</span>}
              </div>
              {lc && sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block w-full rounded-[var(--radius-control)] border border-line bg-surface p-3.5 text-left no-underline transition-all hover:border-lapis hover:bg-panel/60 hover:no-underline hover:shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lapis"
                >
                  <div className="mb-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {replacement ? (
                          <>
                            Use <span className="text-lapis-deep underline decoration-lapis/40 underline-offset-2">{replacement}</span> instead
                          </>
                        ) : (
                          statusShort(f)
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {statusShort(f)}
                        {lc.eol_date ? ` (${formatDate(lc.eol_date)})` : ""}
                        {who ? ` · ${who}` : ""}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-panel px-2.5 py-1 text-xs font-semibold text-lapis-deep transition-colors group-hover:border-lapis group-hover:bg-sky">
                      {sourceHost(sourceUrl)}
                      <ExternalLink size={12} aria-hidden />
                    </span>
                  </div>

                  <blockquote className="border-l-2 border-lapis pl-3 text-[15px] leading-snug text-ink">
                    “{lc.source_quote ?? summaryLine(f)}”
                  </blockquote>
                </a>
              ) : (
                <p className="rounded-[var(--radius-control)] border border-dashed border-line p-3.5 text-sm text-ink-muted">
                  No trusted source was found, so GroundEd makes no claim. Please check this one yourself.
                </p>
              )}
            </section>

            {/* 3 · OPTIONAL AI REWRITE SUGGESTION (cohesive dashed card matching the evidence cards above) */}
            {lc && (
              <section className="space-y-2">
                {draft === null ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-dashed border-ai/45 bg-ai-soft/60 p-3.5">
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-ai shadow-[var(--shadow-card)]" aria-hidden>
                        <Sparkles size={14} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">Draft updated wording</p>
                        <p className="text-xs text-ink-muted">
                          {aiAvailable === false
                            ? "AI drafts aren't configured on this server yet."
                            : "Generate an editable rewrite based on the verified source above."}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={requestDraft}
                      disabled={drafting || aiAvailable === false}
                      className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-ai/50 bg-surface px-3.5 text-sm font-semibold text-ai shadow-[var(--shadow-card)] transition-colors hover:border-ai hover:bg-ai hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles size={15} aria-hidden />
                      {drafting ? "Generating…" : "Generate draft"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 rounded-[var(--radius-control)] border-2 border-dashed border-ai/45 bg-ai-soft/70 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ai">
                        <Sparkles size={13} aria-hidden />
                        AI suggestion · Not a sourced fact
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={requestDraft}
                          disabled={drafting}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-ai hover:bg-surface/80 disabled:opacity-50"
                          title="Regenerate draft"
                        >
                          <RotateCcw size={12} aria-hidden />
                          {drafting ? "Generating…" : "Regenerate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraft(null)}
                          className="inline-flex items-center gap-1 rounded-full p-1 text-ink-subtle hover:bg-surface/80 hover:text-ink"
                          aria-label="Close AI draft"
                          title="Close draft"
                        >
                          <X size={13} aria-hidden />
                        </button>
                      </div>
                    </div>
                    <label htmlFor={`${panelId}-draft`} className="sr-only">Editable AI draft text</label>
                    <textarea
                      id={`${panelId}-draft`}
                      rows={3}
                      className="w-full rounded-[8px] border border-ai/30 bg-surface p-2.5 text-sm leading-relaxed text-ink focus-visible:outline-ai"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <p className="text-xs text-ink-muted">
                      Review and edit before using. Choose <strong>Update</strong> below to include this wording in your report.
                    </p>
                  </div>
                )}
                {draftError && <Notice tone="error">{draftError}</Notice>}
              </section>
            )}
          </div>

          {/* 4 · YOUR DECISION: static footer in place at the bottom of the card (not sticky) */}
          <div className="rounded-b-[var(--radius-card)] border-t border-line bg-panel/50 p-4">
            <p className={`${LABEL} mb-2 flex items-center gap-1.5`}>Your decision <ArrowRight size={12} aria-hidden /></p>
            <DecisionControl compact decision={decision} onSave={onDecide} onUndo={onUndo} updateExtras={{ target: replacement, text: draft ?? undefined }} />
          </div>
        </div>
      )}
    </article>
  );
}
