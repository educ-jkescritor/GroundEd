import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, ChevronDown, CircleSlash, Copy, Download, FileText, Info, Loader2, Plus, Printer, X } from "lucide-react";
import { ApiError, api, errorMessage } from "../api";
import type { Analysis } from "../types";
import DetailsDialog from "../components/DetailsDialog";
import FindingItem from "../components/FindingItem";
import ModuleView from "../components/ModuleView";
import type { Focus, PdfSource } from "../components/PdfViewer";
import { PrintReport, buildMarkdown } from "../components/ReportExport";
import SourcesList from "../components/SourcesList";
import { Button, ButtonLink, buttonClass } from "../components/ui/Button";
import { HorizonMark } from "../components/ui/Logo";
import { Notice } from "../components/ui/Notice";
import { PRIORITY_STYLE, PRIORITY_TAG_BASE, PriorityIcon } from "../components/ui/PriorityBadge";
import { Sprout } from "../components/ui/Sprout";
import { useDecisions, type Decision } from "../lib/decisions";
import { recallFile } from "../lib/fileStore";
import { needsReview, rankFindings, toneOf, type Tone } from "../lib/findings";
import { getDemoUser, recordReport, signOutDemo, useStored } from "../lib/history";
import { usePageTitle } from "../lib/usePageTitle";
import NotFound from "./NotFound";

// PDF.js is large, so the viewer loads only on this page (keeps the landing page fast).
const PdfViewer = lazy(() => import("../components/PdfViewer"));

const TONES: Tone[] = ["high", "medium", "low", "unverified"];
const NUDGE_KEY = "grounded:signin-nudge-dismissed";

/**
 * Results workspace (DESIGN.md §7). Compact top bar instead of the site navigation; the real module on the left and
 * the results on the right scroll independently; the page itself never scrolls. Below 1024 px one pane at a time.
 */
export default function Report() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [sampleTitle, setSampleTitle] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null); // where the document pane should scroll
  const [tab, setTab] = useState<"findings" | "sources">("findings");
  const [tone, setTone] = useState<Tone | "all">("all");
  const [showReviewed, setShowReviewed] = useState(false);
  const [mobilePane, setMobilePane] = useState<"document" | "findings">("findings");
  const [pdfFailed, setPdfFailed] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(() => {
    try { return localStorage.getItem(NUDGE_KEY) === "1"; } catch { return false; }
  });
  const { decisions, decide, undo } = useDecisions(id);
  const user = useStored(getDemoUser);
  const listRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // The page never scrolls here, so don't reserve scrollbar space (fixes the empty strip).
  useEffect(() => {
    document.documentElement.classList.add("workspace");
    return () => document.documentElement.classList.remove("workspace");
  }, []);

  useEffect(() => {
    if (!id) return;
    api.analysis(id).then((a) => { setAnalysis(a); recordReport(a); }).catch(setError);
    api.health().then((h) => setAiAvailable(h.gemini_configured)).catch(() => setAiAvailable(null));
  }, [id]);

  const sampleId = analysis?.source.kind === "sample" ? analysis.source.filename.replace(/\.pdf$/i, "") : null;
  useEffect(() => {
    if (!sampleId) return;
    api.samples().then((list) => setSampleTitle(list.find((s) => s.id === sampleId)?.title.replace(/\s*\(sample\)$/i, "") ?? null)).catch(() => undefined);
  }, [sampleId]);

  const title = sampleTitle ?? analysis?.source.filename.replace(/\.pdf$/i, "") ?? "Report";
  usePageTitle(analysis ? title : "Report");

  const pdfSource = useMemo<PdfSource | null>(() => {
    if (!analysis) return null;
    if (sampleId) return { url: api.sampleFileUrl(sampleId) };
    const file = recallFile(analysis.id);
    return file ? { file } : null;
  }, [analysis, sampleId]);

  const ranked = useMemo(() => (analysis ? rankFindings(analysis.findings).filter(needsReview) : []), [analysis]);
  const visible = ranked.filter((f) => tone === "all" || toneOf(f) === tone);
  const toReview = visible.filter((f) => !decisions[f.id]);
  const reviewed = visible.filter((f) => decisions[f.id]);
  // The Reviewed section opens on request, or automatically when the selected finding is in it.
  const reviewedOpen = showReviewed || reviewed.some((f) => f.id === selectedId);

  const scrollCardIntoView = (fid: string) =>
    setTimeout(() => document.getElementById(`card-${fid}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);

  /** Select a finding from the results side: open it, and scroll the document to it (optionally a specific quote). */
  const openFinding = useCallback((fid: string, cite = 0) => {
    setSelectedId(fid);
    setFocus({ id: fid, cite, nonce: Date.now() + Math.random() });
  }, []);

  /** Select from the document side: open the card and scroll the list to it (document stays where it is). */
  function pickFromDocument(fid: string) {
    setSelectedId(fid);
    setTab("findings");
    setMobilePane("findings");
    if (tone !== "all" && ranked.find((f) => f.id === fid) && toneOf(ranked.find((f) => f.id === fid)!) !== tone) setTone("all");
    scrollCardIntoView(fid);
  }

  function step(dir: -1 | 1) {
    const list = visible.length ? visible : ranked;
    if (!list.length) return;
    const i = list.findIndex((f) => f.id === selectedId);
    const next = list[(i + dir + list.length) % list.length];
    openFinding(next.id);
    scrollCardIntoView(next.id);
  }

  // Cold start: open on the top finding instead of a page with nothing on it.
  useEffect(() => {
    if (started.current || !ranked.length) return;
    started.current = true;
    openFinding(ranked[0].id);
  }, [ranked, openFinding]);

  // J / K = next / previous finding (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable) return;
      if (e.key === "j") step(1);
      if (e.key === "k") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (error instanceof ApiError && error.status === 404) return <NotFound />;
  if (error) return <div className="mx-auto max-w-xl p-8"><Notice tone="error">{errorMessage(error)}</Notice></div>;
  if (!analysis) {
    return <p className="flex h-dvh items-center justify-center gap-2 text-ink-muted" aria-live="polite"><Loader2 size={18} className="animate-spin" aria-hidden /> Loading report…</p>;
  }

  const counts = Object.fromEntries(TONES.map((t) => [t, ranked.filter((f) => toneOf(f) === t).length])) as Record<Tone, number>;
  const decided = ranked.filter((f) => decisions[f.id]).length;
  const allDone = ranked.length > 0 && decided === ranked.length;
  const findingWeight = (f: (typeof ranked)[number]) => f.score?.total ?? 30;
  const remainingOutdated = ranked.reduce((sum, f) => {
    const d = decisions[f.id];
    if (d?.kind === "update" || d?.kind === "dismiss") return sum;
    return sum + findingWeight(f);
  }, 0);
  const outdatedPct = ranked.length ? Math.round(remainingOutdated / ranked.length) : 0;
  const outdatedColor = outdatedPct === 0 ? "text-supported" : outdatedPct >= 50 ? "text-high" : "text-medium";
  const notCovered = analysis.coverage === "not_covered";
  const showNudge = !user && !nudgeDismissed && decided > 0;

  function decideAndAdvance(fid: string, d: Decision) {
    decide(fid, d);
    const next = ranked.find((f) => f.id !== fid && !decisions[f.id]);
    if (next) {
      openFinding(next.id);
      scrollCardIntoView(next.id);
    }
  }

  const renderCard = (f: (typeof ranked)[number]) => (
    <li key={f.id} id={`card-${f.id}`} className="scroll-mt-14">
      <FindingItem
        analysisId={analysis.id}
        finding={f}
        decision={decisions[f.id]}
        open={selectedId === f.id}
        aiAvailable={aiAvailable}
        onToggle={() => (selectedId === f.id ? setSelectedId(null) : openFinding(f.id))}
        onDecide={(d) => decideAndAdvance(f.id, d)}
        onUndo={() => undo(f.id)}
        onShowInDocument={(cite) => { setMobilePane("document"); openFinding(f.id, cite); }}
      />
    </li>
  );

  function dismissNudge() {
    setNudgeDismissed(true);
    try { localStorage.setItem(NUDGE_KEY, "1"); } catch { /* fine */ }
  }

  const pane = (which: "document" | "findings") => (mobilePane === which ? "flex" : "hidden lg:flex");

  return (
    <>
      <div className="flex h-dvh flex-col overflow-hidden print:hidden">
        {/* Workspace top bar: Left = document identity & metadata; Right = secondary nav, primary export CTA, session */}
        <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Link to="/" aria-label="GroundEd home" className="shrink-0"><HorizonMark size={30} /></Link>
            <h1 className="truncate text-[24px] leading-tight text-ink">{title}</h1>
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              title="View report metadata & methodology"
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 text-xs font-semibold text-ink-muted transition-colors hover:border-ink/30 hover:bg-panel-strong hover:text-ink"
            >
              <Info size={13.5} aria-hidden />
              <span className="hidden sm:inline">Report info</span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ButtonLink to="/analyze" variant="secondary" size="sm" className="hidden md:inline-flex">
              <Plus size={15} aria-hidden /> New analysis
            </ButtonLink>
            <DownloadMenu analysis={analysis} decisions={decisions} />
            <span aria-hidden className="mx-1 hidden h-5 w-px bg-line sm:inline-block" />
            {user ? (
              <Button variant="ghost" size="sm" onClick={() => signOutDemo()} className="hidden text-ink-muted hover:text-ink sm:inline-flex">
                Log out
              </Button>
            ) : (
              <ButtonLink to="/sign-in" variant="ghost" size="sm" className="hidden text-ink-muted hover:text-ink sm:inline-flex">
                Log in
              </ButtonLink>
            )}
          </div>
        </header>

        <div className="flex gap-1 border-b border-line bg-panel p-1.5 lg:hidden" role="tablist" aria-label="View">
          {(["findings", "document"] as const).map((p) => (
            <button key={p} type="button" role="tab" aria-selected={mobilePane === p} onClick={() => setMobilePane(p)}
              className={`flex-1 rounded-[8px] py-1.5 text-sm font-semibold ${mobilePane === p ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-muted"}`}>
              {p === "findings" ? "Findings" : "Document"}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(420px,1fr)]">
          {/* Left: the module */}
          <section aria-label="Your module" className={`${pane("document")} min-h-0 flex-col border-r border-line`}>
            {pdfSource && !pdfFailed ? (
              <Suspense fallback={<p className="flex flex-1 items-center justify-center gap-2 bg-[#e9ecf1] text-ink-muted"><Loader2 size={18} className="animate-spin" aria-hidden /> Opening the module…</p>}>
                <PdfViewer
                  source={pdfSource}
                  findings={ranked}
                  selectedId={selectedId}
                  focus={focus}
                  onSelect={pickFromDocument}
                  onStep={step}
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
                    <ModuleView pages={analysis.pages} findings={ranked} selectedId={selectedId} scrollToSelected focusNonce={focus?.nonce} onSelect={pickFromDocument} />
                  ) : (
                    <p className="p-6 text-center text-ink-muted">The module's text isn't available for this report.</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Right: results. The top (summary, filters, tabs) is fixed; only the findings / sources list scrolls. */}
          <aside aria-label="Results" className={`${pane("findings")} min-h-0 flex-col bg-surface`}>
              {notCovered ? (
                <div className="m-5 space-y-4 rounded-[var(--radius-panel)] bg-panel p-6 text-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-unverified"><CircleSlash size={14} aria-hidden /> Not covered yet</span>
                  <h2 className="text-2xl">This module looks like it's outside technology courses</h2>
                  <p className="text-ink-muted">GroundEd covers IT and computing courses for now, so there's nothing to report. We'd rather say nothing than invent findings.</p>
                  <ButtonLink to="/analyze">Analyze another module</ButtonLink>
                </div>
              ) : (
                <>
                  {/* Fixed top: summary */}
                  <div className="shrink-0 space-y-3 px-5 pb-3 pt-4">
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-[28px] leading-[1.1]">
                          {ranked.length === 0 ? "Nothing to review" : allDone ? `All ${ranked.length} findings reviewed` : `${ranked.length - decided} finding${ranked.length - decided === 1 ? "" : "s"} to be reviewed`}
                        </h2>
                        <p className="mt-1 text-sm text-ink-muted">
                          {ranked.length === 0 ? "We didn't find tools or practices that may be outdated." : "Most important first."}
                        </p>
                      </div>
                      <div className="shrink-0 text-right" aria-label={`${outdatedPct}% outdated`}>
                        <p className={`font-display text-[40px] leading-none [-webkit-text-stroke:0.02em_currentColor] transition-colors ${outdatedColor}`}>
                          {outdatedPct}%
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.06em] text-ink-subtle">outdated</p>
                      </div>
                    </div>

                    {/* Summary by priority = the filters: identical pills */}
                    {ranked.length > 0 && (
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Show findings by priority">
                        <FilterPill active={tone === "all"} onClick={() => setTone("all")} label="All" count={ranked.length} />
                        {TONES.filter((t) => counts[t] > 0).map((t) => (
                          <FilterPill
                            key={t}
                            tone={t}
                            active={tone === t}
                            dimmed={tone !== "all" && tone !== t}
                            onClick={() => setTone(tone === t ? "all" : t)}
                            label={PRIORITY_STYLE[t].short}
                            count={counts[t]}
                          />
                        ))}
                      </div>
                    )}

                    {allDone && (
                      <div
                        role="status"
                        className="flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-low-line bg-low-soft px-4 py-3.5 text-center shadow-[var(--shadow-card)]"
                      >
                        <span className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-full border border-low-line/70 bg-surface shadow-[var(--shadow-card)]">
                          <Sprout size={30} />
                        </span>
                        <p className="text-sm font-bold text-supported">Your module is ready for next term.</p>
                        <p className="text-xs font-medium text-supported/85">Export the report above to share it.</p>
                      </div>
                    )}

                    {/* Log-in note: only after the first decision when logged out, once; dismissible */}
                    {showNudge && (
                      <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-sky/40 p-3 text-sm" role="status">
                        <p className="flex-1 text-ink">
                          Browsing as guest — upload history isn't saved. <Link to="/sign-in" className="font-semibold">Log in</Link> to keep this report in your History of uploads.
                        </p>
                        <button type="button" onClick={dismissNudge} aria-label="Dismiss" className="rounded-full p-1 text-ink-muted hover:bg-surface"><X size={15} /></button>
                      </div>
                    )}
                  </div>

                  {/* Fixed top: tabs */}
                  <div className="flex shrink-0 gap-6 border-b border-line bg-surface px-5" role="tablist" aria-label="Report sections">
                    {(["findings", "sources"] as const).map((t) => (
                      <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                        className={`-mb-px border-b-2 py-2.5 text-sm font-semibold ${tab === t ? "border-ink text-ink" : "border-transparent text-ink-subtle hover:text-ink"}`}>
                        {t === "findings" ? `Findings (${visible.length})` : "Sources"}
                      </button>
                    ))}
                  </div>

                  {/* The only scrolling part */}
                  <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4" role="tabpanel">
                    {tab === "sources" ? (
                      <SourcesList analysis={analysis} />
                    ) : (
                      <>
                        {visible.length === 0 && ranked.length > 0 && (
                          <p className="rounded-[var(--radius-card)] bg-panel p-4 text-sm text-ink-muted">No findings match. <button type="button" className="font-semibold text-lapis-deep" onClick={() => setTone("all")}>Show all</button></p>
                        )}
                        {/* Grouped by review state: what's left first; reviewed items fold away below. */}
                        {toReview.length > 0 && (
                          <section aria-label="To review" className="space-y-3">
                            <div className="flex items-center gap-2.5">
                              <h3 className="font-sans text-[13px] font-bold uppercase tracking-[0.06em] text-ink [-webkit-text-stroke:0]">
                                To review
                              </h3>
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-lapis/12 px-2 font-mono text-xs font-bold tabular-nums text-lapis-deep">
                                {toReview.length}
                              </span>
                              <span aria-hidden className="h-px flex-1 bg-line" />
                            </div>
                            <ol className="space-y-2.5">{toReview.map(renderCard)}</ol>
                          </section>
                        )}
                        {toReview.length === 0 && reviewed.length > 0 && (
                          <p className="rounded-[var(--radius-card)] bg-panel p-4 text-sm text-ink-muted">Nothing left to review here.</p>
                        )}
                        {reviewed.length > 0 && (
                          <section aria-label="Reviewed" className="mt-6 space-y-3">
                            <button
                              type="button"
                              aria-expanded={reviewedOpen}
                              onClick={() => setShowReviewed(!reviewedOpen)}
                              className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-[var(--radius-control)] px-2 py-1.5 text-left transition-colors hover:bg-panel"
                            >
                              <ChevronDown
                                size={16}
                                className={` text-ink-muted transition-transform group-hover:text-ink ${reviewedOpen ? "" : "-rotate-90"}`}
                                aria-hidden
                              />
                              <span className="font-sans text-[13px] font-bold uppercase tracking-[0.06em] text-ink [-webkit-text-stroke:0]">
                                Reviewed
                              </span>
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-panel-strong px-2 font-mono text-xs font-bold tabular-nums text-ink-muted">
                                {reviewed.length}
                              </span>
                              <span aria-hidden className="h-px flex-1 bg-line" />
                              <span className="text-xs font-semibold text-ink-subtle group-hover:text-ink">
                                {reviewedOpen ? "Hide" : "Show"}
                              </span>
                            </button>
                            {reviewedOpen && <ol className="space-y-2.5">{reviewed.map(renderCard)}</ol>}
                          </section>
                        )}
                        {ranked.length > 0 && <p className="mt-4 text-center text-xs text-ink-subtle">Tip: press J / K to move between findings.</p>}
                      </>
                    )}
                  </div>
                </>
              )}
          </aside>
        </div>
      </div>

      {showDetails && <DetailsDialog analysis={analysis} onClose={() => setShowDetails(false)} />}
      <PrintReport analysis={analysis} decisions={decisions} pdfSource={pdfSource} title={title} userName={user?.name} />
    </>
  );
}

/** Primary export CTA in the workspace header. */
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
        <Download size={15} aria-hidden /> <span className="hidden sm:inline">Export report</span> <ChevronDown size={14} aria-hidden />
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

/** Filter pill: shares the exact priority tag UI, icon, and size as the findings list. */
function FilterPill({
  label,
  count,
  active,
  dimmed = false,
  onClick,
  tone,
}: {
  label: string;
  count: number;
  active: boolean;
  dimmed?: boolean;
  onClick: () => void;
  tone?: Tone;
}) {
  const toneCls = tone
    ? `${PRIORITY_STYLE[tone].cls} ${
        active
          ? "ring-2 ring-current/35 shadow-[var(--shadow-card)]"
          : dimmed
            ? "opacity-55 hover:opacity-100"
            : "hover:brightness-95"
      }`
    : active
      ? "border-ink bg-ink text-white"
      : "border-line bg-panel text-ink-muted hover:border-ink/40 hover:text-ink";

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${PRIORITY_TAG_BASE} transition-all ${toneCls}`}
    >
      {tone && <PriorityIcon p={tone} />}
      <span>{label}</span>
      <span className="tabular-nums opacity-75">{count}</span>
    </button>
  );
}
