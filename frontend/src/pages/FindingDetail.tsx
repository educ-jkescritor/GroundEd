import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Library, Loader2 } from "lucide-react";
import { ApiError, api, errorMessage } from "../api";
import type { Analysis } from "../types";
import { Page } from "../components/Layout";
import ScoreBreakdown from "../components/ScoreBreakdown";
import { AiSuggestion } from "../components/ui/AiSuggestion";
import { Button } from "../components/ui/Button";
import { Card, Label, Panel } from "../components/ui/Card";
import { DecisionControl } from "../components/ui/DecisionControl";
import { Notice } from "../components/ui/Notice";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { QuoteBlock } from "../components/ui/QuoteBlock";
import { SourceLink } from "../components/ui/SourceLink";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useDecisions } from "../lib/decisions";
import { KIND_LABEL, needsReview, rankFindings, sourceHost, summaryLine, usageLine } from "../lib/findings";
import { formatDate, relativeToNow } from "../lib/format";
import { priorityOf } from "../lib/priority";
import { usePageTitle } from "../lib/usePageTitle";
import NotFound from "./NotFound";

/** Full finding detail: module quote ⇄ source, why this priority, help, decision (DESIGN.md §10 anatomy). */
export default function FindingDetail() {
  const { id, fid } = useParams<{ id: string; fid: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const { decisions, decide, undo } = useDecisions(id);

  useEffect(() => {
    if (id) api.analysis(id).then(setAnalysis).catch(setError);
  }, [id]);
  useEffect(() => setDraft(null), [fid]);

  const finding = analysis?.findings.find((f) => f.id === fid);
  usePageTitle(finding ? finding.technology : "Finding");

  if (error instanceof ApiError && error.status === 404) return <NotFound />;
  if (error) return <Page narrow><Notice tone="error">{errorMessage(error)}</Notice></Page>;
  if (!analysis) {
    return (
      <Page narrow>
        <p className="flex items-center gap-2 text-ink-muted"><Loader2 size={18} className="animate-spin" aria-hidden /> Loading finding…</p>
      </Page>
    );
  }
  if (!finding) return <NotFound />;

  const order = rankFindings(analysis.findings).filter(needsReview);
  const index = order.findIndex((f) => f.id === finding.id);
  const prev = index > 0 ? order[index - 1] : null;
  const next = index >= 0 && index < order.length - 1 ? order[index + 1] : null;
  const base = `/reports/${encodeURIComponent(analysis.id)}`;
  const priority = finding.status === "supported" ? null : priorityOf(finding.score);
  const lc = finding.lifecycle;
  const decision = decisions[finding.id];

  async function requestDraft() {
    setDrafting(true);
    setDraftError(null);
    try {
      setDraft((await api.draft(analysis!.id, finding!.id)).text);
    } catch (e) {
      setDraftError(errorMessage(e));
    } finally {
      setDrafting(false);
    }
  }

  return (
    <Page>
      <nav className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Finding navigation">
        <Link to={base} className="inline-flex items-center gap-1 font-semibold"><ArrowLeft size={15} aria-hidden /> Back to report</Link>
        {index >= 0 && (
          <span className="flex items-center gap-3 text-ink-muted">
            Finding {index + 1} of {order.length}
            <Button size="sm" variant="secondary" disabled={!prev} onClick={() => prev && navigate(`${base}/findings/${prev.id}`)} aria-label="Previous finding"><ChevronLeft size={16} aria-hidden /></Button>
            <Button size="sm" variant="secondary" disabled={!next} onClick={() => next && navigate(`${base}/findings/${next.id}`)} aria-label="Next finding"><ChevronRight size={16} aria-hidden /></Button>
          </span>
        )}
      </nav>

      <header className="space-y-3">
        {finding.kind && <Label>{KIND_LABEL[finding.kind]}</Label>}
        <h1 className="text-[32px] leading-tight">
          {finding.technology}
          {finding.version && <span className="ml-2 font-mono text-2xl font-medium text-ink-muted">{finding.version}</span>}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={finding.status} />
          {priority && <PriorityBadge priority={priority} />}
          {finding.score && priority && <span className="font-mono text-sm tabular-nums">{finding.score.total}/100</span>}
          <span className="text-sm text-ink-subtle">{usageLine(finding)}</span>
        </div>
        <p className="text-ink-muted">{summaryLine(finding)}</p>
      </header>

      {/* Evidence, side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <Label className="mb-4">In your module</Label>
          <div className="space-y-4">
            {finding.citations.map((c, i) => (
              <QuoteBlock key={i} caption={<>Page {c.page} · <Link to={base}>View in module</Link></>}>{c.snippet}</QuoteBlock>
            ))}
          </div>
        </Panel>
        <Panel>
          <Label className="mb-4"><Library size={14} aria-hidden /> Source</Label>
          {lc ? (
            <div className="space-y-4">
              {lc.source_quote && <QuoteBlock tone="source">{lc.source_quote}</QuoteBlock>}
              <SourceLink href={lc.source_url}>{lc.source_name ?? sourceHost(lc.source_url)}</SourceLink>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                {lc.cycle && (<><dt className="text-ink-subtle">Version</dt><dd className="font-mono">{lc.cycle}</dd></>)}
                <dt className="text-ink-subtle">No longer supported</dt>
                <dd>{lc.eol_date ? <>{formatDate(lc.eol_date)} <span className="text-ink-subtle">({relativeToNow(lc.eol_date)})</span></> : "No end date announced"}</dd>
                {lc.latest_cycle && (<><dt className="text-ink-subtle">Latest</dt><dd className="font-mono">{lc.latest_cycle}</dd></>)}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No trusted source found. GroundEd does not guess. Please check this one yourself.</p>
          )}
        </Panel>
      </div>

      {finding.passages && finding.passages.length > 0 && (
        <Card className="space-y-4">
          <Label>From the source library</Label>
          <ul className="space-y-5">
            {finding.passages.map((p) => (
              <li key={`${p.doc_id}-${p.heading}`} className="space-y-2">
                <p className="text-sm">
                  <span className="mr-2 rounded-full bg-panel px-2 py-0.5 text-xs font-semibold text-ink-muted">
                    {p.role === "replacement" ? "What to use instead" : "Context"}
                  </span>
                  <strong>{p.title}</strong>
                  {p.heading && <span className="text-ink-subtle"> · {p.heading}</span>}
                </p>
                <QuoteBlock size="sm" tone="source" caption={<>{p.publisher} · saved {formatDate(p.fetched_at)} · <SourceLink href={p.url}>{sourceHost(p.url)}</SourceLink></>}>
                  {p.text.length > 420 ? `${p.text.slice(0, 420).trimEnd()}…` : p.text}
                </QuoteBlock>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {finding.score && priority && (
        <Card><ScoreBreakdown score={finding.score} /></Card>
      )}

      {needsReview(finding) && finding.status !== "unverified" && (
        <Card className="space-y-4">
          <Label>How can GroundEd help?</Label>
          {finding.upgrade && (
            <p>
              Suggested replacement: <strong>{finding.upgrade.target_cycle}</strong>{" "}
              (<SourceLink href={finding.upgrade.source_url}>{sourceHost(finding.upgrade.source_url)}</SourceLink>)
            </p>
          )}
          {draft === null ? (
            <div className="space-y-2">
              <p className="text-sm text-ink-muted">GroundEd can draft updated wording for this part of your module. The draft is written by AI and is not a sourced fact.</p>
              <Button size="sm" variant="ai" onClick={requestDraft} disabled={drafting}>{drafting ? "Drafting…" : "Draft updated wording"}</Button>
              {draftError && <Notice tone="error">{draftError}</Notice>}
            </div>
          ) : (
            <AiSuggestion>
              <label htmlFor="draft-text" className="sr-only">Draft text</label>
              <textarea id="draft-text" rows={4} className="w-full" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <p className="text-xs text-ink-muted">Choose <strong>Update</strong> below to approve this wording; it will be included in your report.</p>
            </AiSuggestion>
          )}
        </Card>
      )}

      {needsReview(finding) && (
        <Panel>
          <DecisionControl
            decision={decision}
            onSave={(d) => {
              decide(finding.id, d);
              if (next) navigate(`${base}/findings/${next.id}`);
            }}
            onUndo={() => undo(finding.id)}
            updateExtras={{ target: finding.upgrade?.target_cycle, text: draft ?? undefined }}
          />
          {!decision && next && <p className="mt-3 text-xs text-ink-subtle">Saving moves to the next finding.</p>}
        </Panel>
      )}
    </Page>
  );
}
