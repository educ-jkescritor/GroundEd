import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, ChevronDown, CircleSlash, Copy, Download, FileText, Info, Loader2, Plus, Printer } from "lucide-react";
import { ApiError, api, errorMessage } from "../api";
import type { Analysis } from "../types";
import { AccountMenu } from "../components/Layout";
import DetailsDialog from "../components/DetailsDialog";
import FindingItem from "../components/FindingItem";
import ModuleView from "../components/ModuleView";
import type { PdfSource } from "../components/PdfViewer";

// PDF.js is large, so the viewer loads only on this page (keeps the landing page fast).
const PdfViewer = lazy(() => import("../components/PdfViewer"));
import { PrintReport, buildMarkdown } from "../components/ReportExport";
import SourcesList from "../components/SourcesList";
import { ButtonLink, buttonClass } from "../components/ui/Button";
import { HorizonMark } from "../components/ui/Logo";
import { Notice } from "../components/ui/Notice";
import { PRIORITY_STYLE, PriorityBadge } from "../components/ui/PriorityBadge";
import { Sprout } from "../components/ui/Sprout";
import { useDecisions } from "../lib/decisions";
import { recallFile } from "../lib/fileStore";
import { needsReview, rankFindings, toneOf, type Tone } from "../lib/findings";
import { formatDate } from "../lib/format";
import { getDemoUser, recordReport, useStored } from "../lib/history";
import { usePageTitle } from "../lib/usePageTitle";
import NotFound from "./NotFound";

type Selection = { id: string | null; from: "document" | "panel" };
type Filter = "all" | "to-review" | Tone;
const TONES: Tone[] = ["high", "medium", "low", "unverified"];

/**
 * Results workspace (DESIGN.md §7: Report). A compact top bar replaces the site navigation; the real module on the
 * left and the findings on the right each scroll independently. Below 1024 px a switch shows one pane at a time.
 */
export default function Report() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [sampleTitle, setSampleTitle] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ id: null, from: "panel" });
  const [tab, setTab] = useState<"findings" | "sources">("findings");
  const [filter, setFilter] = useState<Filter>("all");
  const [mobilePane, setMobilePane] = useState<"document" | "findings">("findings");
  const [pdfFailed, setPdfFailed] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { decisions, decide, undo } = useDecisions(id);
  const user = useStored(getDemoUser);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    api.analysis(id).then((a) => {
      setAnalysis(a);
      recordReport(a);
    }).catch(setError);
  }, [id]);

  // Samples: show the sample's title; the backend names sample files "<sample-id>.pdf".
  const sampleId = analysis?.source.kind === "sample" ? analysis.source.filename.replace(/\.pdf$/i, "") : null;
  useEffect(() => {
    if (!sampleId) return;
    api.samples().then((list) => setSampleTitle(list.find((s) => s.id === sampleId)?.title.replace(/\s*\(sample\)$/i, "") ?? null)).catch(() => undefined);
  }, [sampleId]);

  const title = sampleTitle ?? analysis?.source.filename.replace(/\.pdf$/i, "") ?? "Report";
  usePageTitle(analysis ? title : "Report");

  // The real PDF: a sample from the server, or the uploaded file kept in this tab's memory.
  const pdfSource = useMemo<PdfSource | null>(() => {
    if (!analysis) return null;
    if (sampleId) return { url: api.sampleFileUrl(sampleId) };
    const file = recallFile(analysis.id);
    return file ? { file } : null;
  }, [analysis, sampleId]);

  const ranked = useMemo(() => (analysis ? rankFindings(analysis.findings).filter(needsReview) : []), [analysis]);

  // Selecting a box in the document scrolls the findings list to that card.
  useEffect(() => {
    if (selection.from !== "document" || !selection.id) return;
    setTab("findings");
    setMobilePane("findings");
    if (filter !== "all") setFilter("all");
    const t = setTimeout(() => document.getElementById(`card-${selection.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
    return () => clearTimeout(t);
  }, [selection]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error instanceof ApiError && error.status === 404) return <NotFound />;
  if (error) return <div className="mx-auto max-w-xl p-8"><Notice tone="error">{errorMessage(error)}</Notice></div>;
  if (!analysis) {
    return <p className="flex h-dvh items-center justify-center gap-2 text-ink-muted" aria-live="polite"><Loader2 size={18} className="animate-spin" aria-hidden /> Loading report…</p>;
  }

  const counts = Object.fromEntries(TONES.map((t) => [t, ranked.filter((f) => toneOf(f) === t).length])) as Record<Tone, number>;
  const decided = ranked.filter((f) => decisions[f.id]).length;
  const visible = ranked.filter((f) => filter === "all" ? true : filter === "to-review" ? !decisions[f.id] : toneOf(f) === filter);
  const notCovered = analysis.coverage === "not_covered";

  function select(fid: string | null) {
    setSelection({ id: fid, from: "panel" });
  }

  // After a decision, open the next finding that still needs one (goal gradient: keep the review moving).
  function decideAndAdvance(fid: string, d: Parameters<typeof decide>[1]) {
    decide(fid, d);
    const next = ranked.find((f) => f.id !== fid && !decisions[f.id]);
    if (next) {
      select(next.id);
      setTimeout(() => document.getElementById(`card-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
    }
  }

  const pane = (which: "document" | "findings") => (mobilePane === which ? "flex" : "hidden lg:flex");

  return (
    <>
      <div className="flex h-dvh flex-col overflow-hidden print:hidden">
        {/* Workspace top bar */}
        <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
          <Link to="/" aria-label="GroundEd home" className="shrink-0"><HorizonMark size={30} /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[22px] leading-tight">{title}</h1>
            <p className="truncate text-xs text-ink-subtle">
              {analysis.source.pages} pages · analysed {formatDate(analysis.provenance?.analysis_date ?? analysis.created_at)}
              {sampleId && " · sample module"}
            </p>
          </div>
          <ButtonLink to="/analyze" variant="secondary" size="sm" className="hidden md:inline-flex"><Plus size={15} aria-hidden /> New analysis</ButtonLink>
          <DownloadMenu analysis={analysis} decisions={decisions} />
          <button type="button" onClick={() => setShowDetails(true)} className={buttonClass("secondary", "sm")}>
            <Info size={15} aria-hidden /> <span className="hidden sm:inline">Details</span>
          </button>
          {user ? <AccountMenu name={user.name} /> : <ButtonLink to="/sign-in" variant="ghost" size="sm" className="hidden sm:inline-flex">Sign in</ButtonLink>}
        </header>

        {/* Small screens: one pane at a time */}
        <div className="flex gap-1 border-b border-line bg-panel p-1.5 lg:hidden" role="tablist" aria-label="View">
          {(["findings", "document"] as const).map((p) => (
            <button key={p} type="button" role="tab" aria-selected={mobilePane === p} onClick={() => setMobilePane(p)}
              className={`flex-1 rounded-[8px] py-1.5 text-sm font-semibold ${mobilePane === p ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-muted"}`}>
              {p === "findings" ? "Findings" : "Document"}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(400px,1fr)]">
          {/* Left: the module */}
          <section aria-label="Your module" className={`${pane("document")} min-h-0 flex-col border-r border-line`}>
            {pdfSource && !pdfFailed ? (
              <Suspense fallback={<p className="flex flex-1 items-center justify-center gap-2 bg-[#e9ecf1] text-ink-muted"><Loader2 size={18} className="animate-spin" aria-hidden /> Opening the module…</p>}>
              <PdfViewer
                source={pdfSource}
                findings={ranked}
                selectedId={selection.id}
                scrollToSelected={selection.from === "panel"}
                onSelect={(fid) => setSelection({ id: fid, from: "document" })}
                onError={setPdfFailed}
              />
              </Suspense>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col bg-panel">
                <p className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-xs text-ink-muted">
                  <FileText size={14} aria-hidden />
                  {pdfFailed
                    ? "The PDF couldn't be displayed, so this shows the module's text."
                    : "Your original file is only kept while this tab is open (it isn't stored anywhere). Showing the module's text."}
                </p>
                <div className="min-h-0 flex-1 overflow-auto p-4">
                  {analysis.pages?.length ? (
                    <ModuleView pages={analysis.pages} findings={ranked} selectedId={selection.id} scrollToSelected={selection.from === "panel"} onSelect={(fid) => setSelection({ id: fid, from: "document" })} />
                  ) : (
                    <p className="p-6 text-center text-ink-muted">The module's text isn't available for this report.</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Right: results */}
          <aside aria-label="Findings and sources" className={`${pane("findings")} min-h-0 flex-col bg-surface`}>
            {notCovered ? (
              <div className="m-5 space-y-4 rounded-[var(--radius-panel)] bg-panel p-6 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-unverified"><CircleSlash size={14} aria-hidden /> Not covered yet</span>
                <h2 className="text-2xl">This module looks like it's outside technology courses</h2>
                <p className="text-ink-muted">GroundEd covers IT and computing courses for now, so there's nothing to report. We'd rather say nothing than invent findings.</p>
                <ButtonLink to="/analyze">Analyze another module</ButtonLink>
              </div>
            ) : (
              <>
                {/* Main result */}
                <div className="space-y-3 px-5 pt-5">
                  <h2 className="text-[28px] leading-tight">
                    {ranked.length === 0 ? "Nothing here may warrant review" : `${ranked.length} finding${ranked.length === 1 ? "" : "s"} may warrant review`}
                  </h2>
                  {ranked.length > 0 && (
                    <>
                      <div className="flex h-2.5 overflow-hidden rounded-full bg-panel" aria-hidden>
                        {TONES.map((t) => counts[t] > 0 && <span key={t} className={PRIORITY_STYLE[t].bar} style={{ width: `${(counts[t] / ranked.length) * 100}%` }} />)}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {TONES.map((t) => counts[t] > 0 && <PriorityBadge key={t} priority={t} count={counts[t]} />)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-ink-muted">
                        <span className="shrink-0">{decided} of {ranked.length} decided</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel" aria-hidden>
                          <span className="block h-full rounded-full bg-lapis transition-[width]" style={{ width: `${(decided / ranked.length) * 100}%` }} />
                        </span>
                      </div>
                    </>
                  )}
                  {(ranked.length === 0 || decided === ranked.length) && (
                    <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-panel p-3 text-sm">
                      <Sprout size={36} />
                      <p>{ranked.length === 0 ? "We didn't find tools or practices that may be outdated." : "All findings reviewed. Your module is ready for next term."}</p>
                    </div>
                  )}
                  {!user && <p className="text-xs text-ink-subtle"><Link to="/sign-in">Sign in</Link> to keep this report in My reports.</p>}
                </div>

                {/* Tabs */}
                <div className="mt-3 flex gap-6 border-b border-line px-5" role="tablist" aria-label="Report sections">
                  {(["findings", "sources"] as const).map((t) => (
                    <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                      className={`-mb-px border-b-2 py-2.5 text-sm font-semibold ${tab === t ? "border-ink text-ink" : "border-transparent text-ink-subtle hover:text-ink"}`}>
                      {t === "findings" ? `Findings (${ranked.length})` : "Sources"}
                    </button>
                  ))}
                </div>

                {/* Independent scroll */}
                <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4" role="tabpanel">
                  {tab === "sources" ? (
                    <SourcesList analysis={analysis} />
                  ) : (
                    <div className="space-y-3">
                      {ranked.length > 0 && (
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter findings">
                          {([
                            ["all", `All ${ranked.length}`],
                            ["to-review", `To review ${ranked.length - decided}`],
                            ...TONES.filter((t) => counts[t] > 0).map((t) => [t, PRIORITY_STYLE[t].short]),
                          ] as [Filter, string][]).map(([k, label]) => (
                            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === k ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-muted hover:text-ink"}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                      {visible.length === 0 && ranked.length > 0 && <p className="rounded-[var(--radius-card)] bg-panel p-4 text-sm text-ink-muted">No findings match this filter.</p>}
                      <ol className="space-y-2.5">
                        {visible.map((f) => (
                          <li key={f.id} id={`card-${f.id}`} className="scroll-mt-3">
                            <FindingItem
                              analysisId={analysis.id}
                              finding={f}
                              decision={decisions[f.id]}
                              open={selection.id === f.id}
                              onToggle={() => select(selection.id === f.id ? null : f.id)}
                              onDecide={(d) => decideAndAdvance(f.id, d)}
                              onUndo={() => undo(f.id)}
                              onShowInDocument={() => {
                                setMobilePane("document");
                                setSelection({ id: f.id, from: "panel" });
                              }}
                            />
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>
        </div>
      </div>

      {showDetails && <DetailsDialog analysis={analysis} onClose={() => setShowDetails(false)} />}
      <PrintReport analysis={analysis} decisions={decisions} />
    </>
  );
}

/** Download ▾ → report as PDF (print) or copy as Markdown. */
function DownloadMenu({ analysis, decisions }: { analysis: Analysis; decisions: Parameters<typeof buildMarkdown>[1] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildMarkdown(analysis, decisions));
      setCopied(true);
      setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
    } catch {
      setOpen(false);
    }
  }

  const item = "flex w-full items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm text-ink hover:bg-panel";
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} className={buttonClass("primary", "sm")}>
        <Download size={15} aria-hidden /> <span className="hidden sm:inline">Download</span> <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 w-60 rounded-[var(--radius-card)] border border-line bg-surface p-1.5 shadow-[var(--shadow-float)]">
          <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); setTimeout(() => window.print(), 50); }}>
            <Printer size={15} aria-hidden /> Report as PDF
          </button>
          <button role="menuitem" type="button" className={item} onClick={copy}>
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? "Copied" : "Copy as Markdown"}
          </button>
          <p className="px-3 pb-1 pt-1.5 text-xs text-ink-subtle">Includes every finding, its sources and your decisions.</p>
        </div>
      )}
    </div>
  );
}
