import { useState } from "react";
import { ChevronDown, Undo2 } from "lucide-react";
import { api, errorMessage } from "../api";
import type { Finding } from "../types";
import EvidencePanel from "./EvidencePanel";
import ScoreBreakdown from "./ScoreBreakdown";
import { Button } from "./ui/Button";
import { AiSuggestion } from "./ui/AiSuggestion";
import { Notice } from "./ui/Notice";
import { SourceLink } from "./ui/SourceLink";
import { StatusBadge } from "./ui/StatusBadge";
import { PriorityBadge } from "./ui/PriorityBadge";
import { priorityOf } from "../lib/priority";
import { DECISION_LABEL, type Decision } from "../lib/decisions";
import { formatDate } from "../lib/format";

type HelpLevel = "review" | "upgrade" | "draft";

export function summaryLine(f: Finding): string {
  const eol = f.lifecycle?.eol_date;
  switch (f.status) {
    case "eol":
      return eol ? `No longer supported since ${formatDate(eol)}; may warrant review.` : "No longer supported; may warrant review.";
    case "nearing_eol":
      return eol ? `Support ends ${formatDate(eol)}; may warrant review.` : "Support ends soon; may warrant review.";
    case "supported":
      return "Currently supported.";
    default:
      return "No source found. Please check manually.";
  }
}

interface Props {
  analysisId: string;
  finding: Finding;
  decision: Decision | undefined;
  onDecide: (d: Decision) => void;
  onUndo: () => void;
}

// Three help levels (DESIGN.md §7): review evidence → accept sourced upgrade → AI draft.
// Nothing is applied until the faculty member makes a decision.
export default function FindingCard({ analysisId, finding, decision, onDecide, onUndo }: Props) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<HelpLevel>("review");
  const [draftText, setDraftText] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actionable = finding.status === "eol" || finding.status === "nearing_eol";
  const priority = finding.status === "supported" ? null : priorityOf(finding.score);
  const pages = [...new Set(finding.citations.map((c) => c.page))];
  const panelId = `finding-${finding.id}`;

  async function requestDraft() {
    setDrafting(true);
    setError(null);
    try {
      const d = await api.draft(analysisId, finding.id);
      setDraftText(d.text);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDrafting(false);
    }
  }

  const levels: { id: HelpLevel; label: string; show: boolean }[] = [
    { id: "review", label: "Review evidence", show: true },
    { id: "upgrade", label: "Accept upgrade", show: !!finding.upgrade },
    { id: "draft", label: "Draft section", show: true },
  ];

  return (
    <article className="rounded-xl border border-line bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-5 text-left"
      >
        <StatusBadge status={finding.status} />
        <h3 className="text-lg font-semibold">
          {finding.technology}
          {finding.version && <span className="ml-1.5 font-mono text-base text-ink-muted">{finding.version}</span>}
        </h3>
        {decision && (
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
            {DECISION_LABEL[decision.kind]}
          </span>
        )}
        <span className="ml-auto flex items-center gap-3">
          {priority && <PriorityBadge priority={priority} />}
          {finding.status === "supported" ? (
            <span className="text-sm text-ink-subtle">No action needed</span>
          ) : finding.score ? (
            <span className="font-mono text-lg tabular-nums">
              {finding.score.total}
              <span className="text-sm text-ink-subtle">/100</span>
            </span>
          ) : (
            <span className="text-sm text-ink-subtle">Not scored</span>
          )}
          <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </span>
        <p className="w-full text-sm text-ink-muted">
          {summaryLine(finding)} · Page{pages.length > 1 ? "s" : ""} {pages.join(", ")}
        </p>
      </button>

      {open && (
        <div id={panelId} className="space-y-6 border-t border-line p-5">
          <EvidencePanel finding={finding} />
          {finding.score && finding.status !== "supported" && <ScoreBreakdown score={finding.score} />}

          {actionable && (
            <section className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">How much help do you want?</h4>

              <div role="tablist" className="inline-flex flex-wrap rounded-lg border border-line bg-canvas p-1">
                {levels.filter((l) => l.show).map((l) => (
                  <button
                    key={l.id}
                    role="tab"
                    type="button"
                    aria-selected={level === l.id}
                    onClick={() => setLevel(l.id)}
                    className={`min-h-9 rounded-md px-3 text-sm font-medium ${
                      level === l.id ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              {level === "review" && (
                <div className="space-y-3">
                  <p className="text-sm text-ink-muted">
                    Check the evidence above. When you're satisfied, mark this item as reviewed.
                  </p>
                  {!decision && <Button size="sm" variant="secondary" onClick={() => onDecide({ kind: "reviewed" })}>Mark as reviewed</Button>}
                </div>
              )}

              {level === "upgrade" && finding.upgrade && (
                <div className="space-y-3">
                  <p className="text-sm">
                    Suggested upgrade from the same lifecycle record:{" "}
                    <strong className="font-mono">{finding.upgrade.target_cycle}</strong>{" "}
                    (<SourceLink href={finding.upgrade.source_url}>source</SourceLink>)
                  </p>
                  {!decision && (
                    <Button size="sm" onClick={() => onDecide({ kind: "upgrade_accepted", target: finding.upgrade!.target_cycle })}>
                      Accept upgrade
                    </Button>
                  )}
                </div>
              )}

              {level === "draft" && (
                <div className="space-y-3">
                  {draftText === null ? (
                    <>
                      <p className="text-sm text-ink-muted">
                        GroundEd can draft an updated version of this part of your syllabus for you to edit. The draft is
                        written by AI and is not a sourced fact.
                      </p>
                      <Button size="sm" variant="ai" onClick={requestDraft} disabled={drafting}>
                        {drafting ? "Drafting…" : "Draft updated section"}
                      </Button>
                    </>
                  ) : (
                    <AiSuggestion>
                      <label className="sr-only" htmlFor={`${panelId}-draft`}>Draft text</label>
                      <textarea
                        id={`${panelId}-draft`}
                        className="w-full"
                        rows={4}
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        disabled={decision?.kind === "draft_approved"}
                      />
                      {!decision && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => onDecide({ kind: "draft_approved", text: draftText })}>Approve</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDraftText(null)}>Discard</Button>
                        </div>
                      )}
                    </AiSuggestion>
                  )}
                  {error && <Notice tone="error">{error}</Notice>}
                </div>
              )}
            </section>
          )}

          {decision && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-soft p-3 text-sm">
              <span>
                <strong>{DECISION_LABEL[decision.kind]}</strong>
                {decision.kind === "upgrade_accepted" && <> → {decision.target}</>}
              </span>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={onUndo}>
                <Undo2 size={14} aria-hidden /> Undo
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
