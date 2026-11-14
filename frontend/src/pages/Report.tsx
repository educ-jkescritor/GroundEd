import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ApiError, api, errorMessage } from "../api";
import type { Analysis } from "../types";
import { Page } from "../components/Layout";
import FindingsPanel from "../components/FindingsPanel";
import ModuleView from "../components/ModuleView";
import { ExportButtons, PrintReport } from "../components/ReportExport";
import { ButtonLink } from "../components/ui/Button";
import { Notice } from "../components/ui/Notice";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { Sprout } from "../components/ui/Sprout";
import { useDecisions } from "../lib/decisions";
import { needsReview, priorityCounts } from "../lib/findings";
import { formatDate } from "../lib/format";
import { recordReport } from "../lib/history";
import { usePageTitle } from "../lib/usePageTitle";
import NotFound from "./NotFound";

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<unknown>(null);
  // Which finding is selected, and which side selected it (only the OTHER side scrolls, so two smooth scrolls don't cancel).
  const [selection, setSelection] = useState<{ id: string | null; from: "module" | "panel" }>({ id: null, from: "panel" });
  const selectedId = selection.id;
  const { decisions, decide, undo } = useDecisions(id);
  usePageTitle(analysis ? analysis.source.filename : "Report");

  useEffect(() => {
    if (!id) return;
    api.analysis(id)
      .then((a) => {
        setAnalysis(a);
        recordReport(a);
      })
      .catch(setError);
  }, [id]);

  if (error instanceof ApiError && error.status === 404) return <NotFound />;
  if (error) {
    return (
      <Page narrow>
        <Notice tone="error">{errorMessage(error)}</Notice>
        <ButtonLink to="/analyze" variant="secondary">Back to Analyze</ButtonLink>
      </Page>
    );
  }
  if (!analysis) {
    return (
      <Page narrow>
        <p className="flex items-center gap-2 text-ink-muted" aria-live="polite">
          <Loader2 size={18} className="animate-spin" aria-hidden /> Loading report…
        </p>
      </Page>
    );
  }

  const review = analysis.findings.filter(needsReview);
  const counts = priorityCounts(analysis);
  const decided = review.filter((f) => decisions[f.id]).length;
  const allDone = review.length > 0 && decided === review.length;
  const hasPages = (analysis.pages?.length ?? 0) > 0;

  return (
    <>
      <div className="print:hidden">
        <Page wide>
          {/* Header band */}
          <header className="space-y-4 rounded-[var(--radius-panel)] bg-panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm text-ink-subtle">
                <span className="font-semibold text-ink-muted">{analysis.source.filename}</span> · {analysis.source.pages} pages ·
                As of {formatDate(analysis.created_at)}
                {analysis.source.kind === "sample" && " · Sample module"}
              </p>
              <ExportButtons analysis={analysis} decisions={decisions} />
            </div>
            <h1 className="text-[32px] leading-tight">
              {review.length === 0 ? "No findings may warrant review" : `${review.length} finding${review.length === 1 ? "" : "s"} may warrant review`}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              {counts.high > 0 && <PriorityBadge priority="high" count={counts.high} />}
              {counts.medium > 0 && <PriorityBadge priority="medium" count={counts.medium} />}
              {counts.low > 0 && <PriorityBadge priority="low" count={counts.low} />}
              <span className="ml-1">· {decided} of {review.length} decided</span>
            </div>
          </header>

          {allDone && (
            <div className="flex flex-wrap items-center gap-4 rounded-[var(--radius-panel)] border border-line p-5">
              <Sprout />
              <div className="flex-1">
                <h2 className="text-lg">All {review.length} findings reviewed</h2>
                <p className="text-ink-muted">Your module is ready for next term. Export the report to share it.</p>
              </div>
              <ButtonLink to={`/feedback?analysis=${encodeURIComponent(analysis.id)}`} variant="secondary">Give feedback</ButtonLink>
            </div>
          )}

          {/* Side by side: module (left) + ranked findings (right) */}
          <div className={`grid gap-6 ${hasPages ? "lg:grid-cols-[minmax(0,1.45fr)_minmax(380px,1fr)]" : ""}`}>
            {hasPages && (
              <section aria-label="Your module" className="hidden min-w-0 lg:block">
                <ModuleView pages={analysis.pages!} findings={analysis.findings} selectedId={selectedId} scrollToSelected={selection.from === "panel"} onSelect={(fid) => setSelection({ id: fid, from: "module" })} />
              </section>
            )}
            <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
              <FindingsPanel
                analysisId={analysis.id}
                findings={analysis.findings}
                decisions={decisions}
                selectedId={selectedId}
                scrollToSelected={selection.from === "module"}
                onSelect={(fid) => setSelection({ id: fid, from: "panel" })}
                onDecide={decide}
                onUndo={undo}
              />
            </aside>
          </div>
        </Page>
      </div>
      <PrintReport analysis={analysis} decisions={decisions} />
    </>
  );
}
