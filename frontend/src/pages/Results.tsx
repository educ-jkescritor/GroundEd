import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, MessageSquare } from "lucide-react";
import { ApiError, api, errorMessage } from "../api";
import type { Analysis, FindingStatus } from "../types";
import FindingCard from "../components/FindingCard";
import { ExportButtons, PrintReport, sortFindings } from "../components/ReportExport";
import { Page } from "../components/Layout";
import { Notice } from "../components/ui/Notice";
import { ButtonLink } from "../components/ui/Button";
import { STATUS_META } from "../components/ui/StatusBadge";
import { useDecisions } from "../lib/decisions";
import { formatDate } from "../lib/format";
import { usePageTitle } from "../lib/usePageTitle";
import NotFound from "./NotFound";

const ORDER: FindingStatus[] = ["eol", "nearing_eol", "supported", "unverified"];

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState<FindingStatus | "all">("all");
  const { decisions, decide, undo } = useDecisions(id);
  usePageTitle(analysis ? `Review: ${analysis.source.filename}` : "Results");

  useEffect(() => {
    if (id) api.analysis(id).then(setAnalysis).catch(setError);
  }, [id]);

  const findings = useMemo(() => {
    if (!analysis) return [];
    const sorted = sortFindings(analysis);
    return filter === "all" ? sorted : sorted.filter((f) => f.status === filter);
  }, [analysis, filter]);

  if (error instanceof ApiError && error.status === 404) return <NotFound />;
  if (error) {
    return (
      <Page narrow>
        <Notice tone="error">{errorMessage(error)}</Notice>
        <ButtonLink to="/analyze" variant="secondary">Back to analyze</ButtonLink>
      </Page>
    );
  }
  if (!analysis) {
    return (
      <Page narrow>
        <p className="flex items-center gap-2 text-ink-muted" aria-live="polite">
          <Loader2 size={18} className="animate-spin" aria-hidden /> Loading results…
        </p>
      </Page>
    );
  }

  const decidedCount = Object.keys(decisions).length;
  const actionable = analysis.summary.eol + analysis.summary.nearing_eol;

  return (
    <>
      <div className="print:hidden">
        <Page>
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-ink-subtle">
                {analysis.source.kind === "sample" ? "Sample syllabus" : "Your syllabus"} · {analysis.source.pages} pages ·{" "}
                {formatDate(analysis.created_at)}
              </p>
              <h1 className="font-serif text-3xl font-semibold break-words">{analysis.source.filename}</h1>
              <p className="text-sm text-ink-muted">
                {decidedCount} decision{decidedCount === 1 ? "" : "s"} made · {actionable} item{actionable === 1 ? "" : "s"} need attention
              </p>
            </div>
            <ExportButtons analysis={analysis} decisions={decisions} />
          </header>

          {/* Summary + filter */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Filter findings by status">
            {ORDER.map((s) => {
              const meta = STATUS_META[s];
              const Icon = meta.icon;
              const active = filter === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(active ? "all" : s)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    active ? `border-current ${meta.bg} ${meta.text}` : "border-line bg-surface hover:border-ink/30"
                  }`}
                >
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${meta.text}`}>
                    <Icon size={16} aria-hidden /> {meta.label}
                  </span>
                  <span className="font-mono text-3xl tabular-nums text-ink">{analysis.summary[s]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-sm text-ink-muted">
            <p>
              {filter === "all" ? "All findings" : STATUS_META[filter].label}, highest priority first
            </p>
            {filter !== "all" && (
              <button type="button" className="font-medium text-brand" onClick={() => setFilter("all")}>
                Show all
              </button>
            )}
          </div>

          {findings.length === 0 ? (
            <Notice>
              {analysis.findings.length === 0
                ? "No technologies detected. If your syllabus names tools, the PDF may be scanned. Try a text-based PDF."
                : "No findings with this status."}
            </Notice>
          ) : (
            <div className="space-y-4">
              {findings.map((f) => (
                <FindingCard
                  key={f.id}
                  analysisId={analysis.id}
                  finding={f}
                  decision={decisions[f.id]}
                  onDecide={(d) => decide(f.id, d)}
                  onUndo={() => undo(f.id)}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:items-center">
            <MessageSquare size={20} className="text-brand" aria-hidden />
            <p className="flex-1">Was this review useful? Two minutes of feedback helps us improve GroundEd.</p>
            <Link to={`/feedback?analysis=${encodeURIComponent(analysis.id)}`} className="font-medium">
              Give feedback →
            </Link>
          </div>
        </Page>
      </div>
      <PrintReport analysis={analysis} decisions={decisions} />
    </>
  );
}
