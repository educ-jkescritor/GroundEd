import { useState, type ReactNode } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { api, errorMessage } from "../api";
import type { Finding } from "../types";
import ScoreBreakdown from "./ScoreBreakdown";
import { AiSuggestion } from "./ui/AiSuggestion";
import { Button } from "./ui/Button";
import { DecisionControl } from "./ui/DecisionControl";
import { Notice } from "./ui/Notice";
import { PriorityBadge } from "./ui/PriorityBadge";
import { QuoteBlock } from "./ui/QuoteBlock";
import { SourceLink } from "./ui/SourceLink";
import { DECISION_DONE, type Decision } from "../lib/decisions";
import { pagesOf, sourceHost, summaryLine, toneOf, verdict } from "../lib/findings";

interface Props {
  analysisId: string;
  finding: Finding;
  decision: Decision | undefined;
  open: boolean;
  onToggle: () => void;
  onDecide: (d: Decision) => void;
  onUndo: () => void;
  onShowInDocument: (page: number) => void;
}

function Block({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-subtle [-webkit-text-stroke:0]">
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-panel text-[10px] text-ink-muted">{n}</span>
        {title}
      </h4>
      {children}
    </section>
  );
}

/**
 * One finding (DESIGN.md §10). Collapsed: priority, name, plain-language verdict, pages and decision state.
 * Expanded: ① in your module ② why it may need updating ③ what to use instead ④ your decision, then the score.
 */
export default function FindingItem({ analysisId, finding: f, decision, open, onToggle, onDecide, onUndo, onShowInDocument }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const pages = pagesOf(f);
  const lc = f.lifecycle;
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
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className="grid w-full gap-1 p-4 text-left">
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1 font-semibold leading-snug text-ink">
            {f.technology}
            {f.version && <span className="ml-1 font-mono text-sm font-medium text-ink-muted">{f.version}</span>}
          </span>
          <PriorityBadge priority={toneOf(f)} short />
          <ChevronDown size={16} className={`mt-0.5 shrink-0 text-ink-subtle transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </span>
        <span className="text-sm text-ink-muted">{verdict(f)}</span>
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-subtle">
          <span>{pages.length > 1 ? "Pages" : "Page"} {pages.join(", ")}</span>
          <span aria-hidden>·</span>
          {decision ? (
            <span className="inline-flex items-center gap-1 font-semibold text-lapis-deep"><Check size={13} aria-hidden /> {DECISION_DONE[decision.kind]}</span>
          ) : (
            <span>To review</span>
          )}
        </span>
      </button>

      {open && (
        <div id={panelId} className="space-y-5 border-t border-line p-4">
          <Block n={1} title="In your module">
            <div className="space-y-3">
              {f.citations.slice(0, 2).map((c, i) => (
                <QuoteBlock
                  key={i}
                  size="sm"
                  caption={
                    <>Page {c.page} · <button type="button" className="font-semibold text-lapis-deep hover:underline" onClick={() => onShowInDocument(c.page)}>Show in document</button></>
                  }
                >
                  {c.snippet}
                </QuoteBlock>
              ))}
            </div>
          </Block>

          <Block n={2} title="Why it may need updating">
            {lc ? (
              <div className="space-y-2">
                {lc.source_quote ? <QuoteBlock size="sm" tone="source">{lc.source_quote}</QuoteBlock> : <p className="text-sm text-ink">{summaryLine(f)}</p>}
                <p className="text-xs text-ink-subtle">
                  {lc.source_name ?? sourceHost(lc.source_url)} · <SourceLink href={lc.source_url}>Open source</SourceLink>
                </p>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No trusted source was found for this item, so GroundEd doesn't make a claim. Please check it yourself.</p>
            )}
          </Block>

          {lc && f.status !== "supported" && (
            <Block n={3} title="What to use instead">
              <div className="space-y-3 rounded-[var(--radius-control)] bg-panel p-3 text-sm">
                {f.upgrade ? (
                  <p>
                    <strong>{f.upgrade.target_cycle}</strong>{" "}
                    <span className="text-xs text-ink-subtle">(<SourceLink href={f.upgrade.source_url}>{sourceHost(f.upgrade.source_url)}</SourceLink>)</span>
                  </p>
                ) : (
                  <p className="text-ink-muted">No sourced replacement on record.</p>
                )}
                {draft === null ? (
                  <Button size="sm" variant="ai" onClick={requestDraft} disabled={drafting}>
                    <Sparkles size={14} aria-hidden /> {drafting ? "Drafting…" : "Draft updated wording"}
                  </Button>
                ) : (
                  <AiSuggestion>
                    <label htmlFor={`${panelId}-draft`} className="sr-only">Draft text</label>
                    <textarea id={`${panelId}-draft`} rows={4} className="w-full text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} />
                    <p className="text-xs text-ink-muted">Choose <strong>Update</strong> below to approve this wording; it goes into your report.</p>
                  </AiSuggestion>
                )}
                {draftError && <Notice tone="error">{draftError}</Notice>}
              </div>
            </Block>
          )}

          <Block n={lc ? 4 : 3} title="Your decision">
            <DecisionControl
              compact
              decision={decision}
              onSave={onDecide}
              onUndo={onUndo}
              updateExtras={{ target: f.upgrade?.target_cycle, text: draft ?? undefined }}
            />
          </Block>

          {f.score && (
            <details className="group rounded-[var(--radius-control)] border border-line px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold text-ink-muted">
                Why is this {toneOf(f) === "unverified" ? "not scored" : `${toneOf(f)} priority`}? ({f.score.total} of {f.score.max})
              </summary>
              <div className="pt-3"><ScoreBreakdown score={f.score} /></div>
            </details>
          )}
        </div>
      )}
    </article>
  );
}
