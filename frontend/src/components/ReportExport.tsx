import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, Check, Copy, FileText, Globe, HelpCircle, OctagonAlert, Printer, Quote, UserCheck } from "lucide-react";
import type { Analysis, Finding, PageText } from "../types";
import type { PdfSource } from "./PdfViewer";
import { DECISION_DONE, type Decisions } from "../lib/decisions";
import { formatDate } from "../lib/format";
import { needsReview, pagesLabel, rankFindings, sourceHost, sourceShortName, statusShort, summaryLine } from "../lib/findings";
import { PRIORITY_LABEL, priorityOf } from "../lib/priority";
import { HorizonMark } from "./ui/Logo";
import { STATUS_META } from "./ui/StatusBadge";
import { Button } from "./ui/Button";

const FOOTER =
  "Lifecycle data: endoflife.date and official documentation. Drafts are AI suggestions approved by faculty. Generated with GroundEd (advisory: faculty decide).";

/** Distinct Turnitin-style match badge & highlight palette (cycles across numbered findings 1..N). */
const MATCH_PALETTE = [
  { solid: "#b81d65", soft: "#fce8f1", text: "#7a1042", highlight: "rgba(184, 29, 101, 0.22)" },
  { solid: "#1d5bbf", soft: "#e5effc", text: "#143e82", highlight: "rgba(29, 91, 191, 0.20)" },
  { solid: "#087443", soft: "#e3f7ed", text: "#054f2d", highlight: "rgba(8, 116, 67, 0.20)" },
  { solid: "#6938ef", soft: "#eeebfe", text: "#4721a6", highlight: "rgba(105, 56, 239, 0.20)" },
  { solid: "#be123c", soft: "#ffe4e6", text: "#881337", highlight: "rgba(190, 18, 60, 0.22)" },
  { solid: "#1e40af", soft: "#dbeafe", text: "#1e3a8a", highlight: "rgba(30, 64, 175, 0.20)" },
  { solid: "#0f766e", soft: "#ccfbf1", text: "#115e59", highlight: "rgba(15, 118, 110, 0.20)" },
  { solid: "#5b21b6", soft: "#ede9fe", text: "#4c1d95", highlight: "rgba(91, 33, 182, 0.20)" },
  { solid: "#b42318", soft: "#fef3f2", text: "#7a271a", highlight: "rgba(180, 35, 24, 0.22)" },
  { solid: "#2b55a6", soft: "#dce6f6", text: "#17213a", highlight: "rgba(43, 85, 166, 0.20)" },
] as const;

const paletteFor = (index: number) => MATCH_PALETTE[index % MATCH_PALETTE.length];

function decisionText(d: Decisions[string]): string {
  let s = DECISION_DONE[d.kind];
  if (d.target) s += ` → ${d.target}`;
  if (d.reason) s += ` (reason: ${d.reason})`;
  return s;
}

/** Turnitin-style timestamp: "Sep 26, 2026, 7:39 AM GMT+8". */
function formatTurnitinTimestamp(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  const valid = Number.isNaN(d.getTime()) ? new Date() : d;
  const datePart = valid.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timePart = valid.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const offsetMin = -valid.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const hrs = Math.floor(Math.abs(offsetMin) / 60);
  const mins = Math.abs(offsetMin) % 60;
  const tz = `GMT${sign}${hrs}${mins ? `:${String(mins).padStart(2, "0")}` : ""}`;
  return `${datePart}, ${timePart} ${tz}`;
}

function formatByteSize(bytes: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function buildMarkdown(a: Analysis, decisions: Decisions): string {
  const review = a.findings.filter(needsReview);
  const lines = [
    `# GroundEd report: ${a.source.filename}`,
    "",
    `As of ${formatDate(a.created_at)} · ${a.source.pages} pages · ${review.length} findings may warrant review`,
    "",
  ];
  for (const f of rankFindings(a.findings)) {
    const pr = f.status === "supported" ? null : priorityOf(f.score);
    const d = decisions[f.id];
    lines.push(`## ${f.technology}${f.version ? ` ${f.version}` : ""}: ${STATUS_META[f.status].label}`);
    lines.push("", summaryLine(f));
    if (f.score && pr) {
      lines.push(
        "",
        `**${PRIORITY_LABEL[pr]}:** ${f.score.total}/100 (${f.score.breakdown.map((p) => `${p.label} ${p.points}/${p.max}`).join(", ")})`,
      );
    }
    lines.push("", `**Evidence** (${pagesLabel(f)})`);
    for (const c of f.citations) lines.push(`- Module p. ${c.page}: "${c.snippet}"`);
    if (f.lifecycle) lines.push(`- Source: ${f.lifecycle.source_url}`);
    if (d) {
      lines.push("", `**Decision:** ${decisionText(d)}`);
      if (d.text) lines.push("", "Approved wording (AI-drafted, edited and approved by faculty):", "", `> ${d.text}`);
    }
    lines.push("");
  }
  lines.push("---", FOOTER);
  return lines.join("\n");
}

export function ExportButtons({ analysis, decisions }: { analysis: Analysis; decisions: Decisions }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildMarkdown(analysis, decisions));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: user can still print */
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button size="sm" variant="secondary" onClick={copy}>
        {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        {copied ? "Copied" : "Copy as Markdown"}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => window.print()}>
        <Printer size={16} aria-hidden /> Print / Save PDF
      </Button>
    </div>
  );
}

interface RenderedPdfPage {
  page: number;
  w: number;
  h: number;
  dataUrl: string;
}

const ITEMS_PER_OVERVIEW_PAGE = 9;

/**
 * Turnitin-formatted multi-page PDF report shown when printing / saving as PDF:
 * - Page 1: Cover Page (Author/Reviewer, Module Title, Document Details, Pages/Words/Characters box)
 * - Page 2: Integrity / Curriculum Overview (Overall % Outdated, Exclusions/Decisions, Match Groups & Top Sources)
 * - Page 3+: Top Sources & Findings Breakdown (Match Groups & Top Sources + numbered findings with colored badges)
 * - Remaining Pages: Annotated Module Submission pages (each PDF page with colored highlight boxes + left-margin numbered callout badges)
 */
export function PrintReport({
  analysis,
  decisions,
  pdfSource = null,
  title,
  userName,
}: {
  analysis: Analysis;
  decisions: Decisions;
  pdfSource?: PdfSource | null;
  title?: string;
  userName?: string | null;
}) {
  const [renderedPages, setRenderedPages] = useState<RenderedPdfPage[]>([]);
  const [fileBytes, setFileBytes] = useState<number | null>(
    pdfSource && "file" in pdfSource ? pdfSource.file.size : null,
  );
  const [downloadTimestamp] = useState(() => new Date().toISOString());

  // Render PDF pages to high-DPI data URLs in the background so `window.print()` prints crisp annotated pages.
  useEffect(() => {
    if (!pdfSource) {
      setRenderedPages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const workerMod = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;

        const buf =
          "url" in pdfSource
            ? await (await fetch(pdfSource.url)).arrayBuffer()
            : await pdfSource.file.arrayBuffer();
        if (cancelled) return;
        setFileBytes(buf.byteLength);

        const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        const out: RenderedPdfPage[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) break;
          const p = await doc.getPage(i);
          const baseVp = p.getViewport({ scale: 1 });
          const renderVp = p.getViewport({ scale: 1.75 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(renderVp.width);
          canvas.height = Math.floor(renderVp.height);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await p.render({ canvasContext: ctx, viewport: renderVp }).promise;
            out.push({
              page: i,
              w: baseVp.width,
              h: baseVp.height,
              dataUrl: canvas.toDataURL("image/png"),
            });
          }
        }
        await doc.destroy();
        if (!cancelled) setRenderedPages(out);
      } catch {
        if (!cancelled) setRenderedPages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfSource]);

  const ranked = useMemo(() => rankFindings(analysis.findings).filter(needsReview), [analysis.findings]);
  const findingNumberById = useMemo(
    () => new Map<string, number>(ranked.map((f, idx) => [f.id, idx + 1])),
    [ranked],
  );

  // Word & character counts from extracted module text
  const { wordCount, charCount } = useMemo(() => {
    const pagesText = (analysis.pages ?? []).map((p) => p.text).join("\n");
    if (pagesText.trim().length > 0) {
      const words = pagesText.trim().split(/\s+/).filter(Boolean).length;
      return { wordCount: words, charCount: pagesText.length };
    }
    const snippetsText = analysis.findings.flatMap((f) => f.citations.map((c) => c.snippet)).join(" ");
    const words = snippetsText.trim() ? snippetsText.trim().split(/\s+/).length : 0;
    return { wordCount: words, charCount: snippetsText.length };
  }, [analysis.pages, analysis.findings]);

  // Overall outdatedness & group breakdowns (matching Report.tsx logic)
  const findingWeight = (f: Finding) => f.score?.total ?? 30;
  const totalWeight = ranked.reduce((sum, f) => sum + findingWeight(f), 0);
  const remainingOutdated = ranked.reduce((sum, f) => {
    const d = decisions[f.id];
    if (d?.kind === "update" || d?.kind === "dismiss") return sum;
    return sum + findingWeight(f);
  }, 0);
  const outdatedPct = ranked.length ? Math.round(remainingOutdated / ranked.length) : 0;

  // Match Groups (4 categories mirroring Turnitin's 4 Match Groups)
  const highFindings = ranked.filter((f) => priorityOf(f.score) === "high");
  const mediumFindings = ranked.filter((f) => priorityOf(f.score) === "medium");
  const lowFindings = ranked.filter((f) => priorityOf(f.score) === "low");
  const unverifiedFindings = ranked.filter((f) => priorityOf(f.score) === null);

  const groupPct = (items: Finding[]) =>
    ranked.length ? Math.round((items.reduce((s, f) => s + findingWeight(f), 0) / Math.max(totalWeight, 1)) * outdatedPct) : 0;

  // Top Sources breakdown (3 categories mirroring Turnitin's Internet / Publications / Submitted works)
  const eolSourceFindings = ranked.filter((f) => f.lifecycle && sourceHost(f.lifecycle.source_url).includes("endoflife.date"));
  const docSourceFindings = ranked.filter(
    (f) => f.lifecycle && !sourceHost(f.lifecycle.source_url).includes("endoflife.date"),
  );
  const handsOnFindings = ranked.filter((f) => f.hands_on || f.usage === "code");

  const decidedList = ranked.filter((f) => decisions[f.id]);
  const updatedCount = ranked.filter((f) => decisions[f.id]?.kind === "update").length;
  const keptCount = ranked.filter((f) => decisions[f.id]?.kind === "keep").length;
  const dismissedCount = ranked.filter((f) => decisions[f.id]?.kind === "dismiss").length;

  // Paginate the numbered Top Sources / Findings list across overview pages (like Turnitin Page 3)
  const findingChunks = useMemo(() => {
    if (ranked.length === 0) return [];
    const chunks: { finding: Finding; rank: number }[][] = [];
    for (let i = 0; i < ranked.length; i += ITEMS_PER_OVERVIEW_PAGE) {
      chunks.push(
        ranked.slice(i, i + ITEMS_PER_OVERVIEW_PAGE).map((finding, j) => ({
          finding,
          rank: i + j + 1,
        })),
      );
    }
    return chunks;
  }, [ranked]);

  const submissionPageCount = renderedPages.length || analysis.pages?.length || analysis.source.pages || 0;
  // Total pages = 1 (Cover) + 1 (Overview summary) + findingChunks.length (Overview numbered list) + submissionPageCount
  const totalPages = 2 + findingChunks.length + submissionPageCount;
  const submissionId = `grd:oid:::${analysis.id}`;
  const sizeLabel =
    formatByteSize(fileBytes) ??
    (analysis.provenance?.file_sha256 ? `SHA-256 ${analysis.provenance.file_sha256.slice(0, 12)}` : `${analysis.source.pages} pages`);

  return (
    <div className="turnitin-report hidden bg-white font-sans text-ink print:block">
      {/* =====================================================================
          PAGE 1: COVER PAGE
         ===================================================================== */}
      <TurnitinPageShell
        pageNumber={1}
        totalPages={totalPages}
        sectionTitle="Cover Page"
        submissionId={submissionId}
      >
        <div className="flex flex-1 flex-col justify-end pb-12">
          <div className="mb-auto min-h-[26vh]" aria-hidden />

          {/* Author / Reviewer & Document Title block */}
          <div>
            <h1 className="font-sans text-[28px] font-bold leading-tight tracking-[-0.01em] text-ink [-webkit-text-stroke:0]">
              {userName || "Faculty Curriculum Review"}
            </h1>
            <p className="mt-1.5 font-sans text-[20px] font-bold leading-snug text-ink [-webkit-text-stroke:0]">
              {title || analysis.source.filename}
            </p>
            <p className="mt-2.5 flex items-center gap-2 text-xs font-medium text-ink-muted">
              <FileText size={14} className="text-ink-subtle" aria-hidden />
              <span>{analysis.source.kind === "sample" ? "Sample Course Module · GroundEd" : "Course Module · GroundEd"}</span>
            </p>
          </div>

          <hr className="my-6 border-line" />

          {/* Document Details */}
          <div>
            <h2 className="mb-5 font-sans text-[15px] font-bold text-ink [-webkit-text-stroke:0]">
              Document Details
            </h2>

            <div className="flex items-start justify-between gap-8">
              <dl className="space-y-3.5 text-xs">
                <div>
                  <dt className="text-ink-muted">Submission ID</dt>
                  <dd className="mt-0.5 font-bold text-ink">{submissionId}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Submission Date</dt>
                  <dd className="mt-0.5 font-bold text-ink">
                    {formatTurnitinTimestamp(analysis.provenance?.analysis_date ?? analysis.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Download Date</dt>
                  <dd className="mt-0.5 font-bold text-ink">{formatTurnitinTimestamp(downloadTimestamp)}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">File Name</dt>
                  <dd className="mt-0.5 font-bold text-ink">{analysis.source.filename}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">{fileBytes ? "File Size" : "File Fingerprint"}</dt>
                  <dd className="mt-0.5 font-bold text-ink">{sizeLabel}</dd>
                </div>
              </dl>

              {/* Grey stats card on the right (Pages / Words / Characters) */}
              <div className="w-52 shrink-0 space-y-3 bg-panel px-5 py-4 text-xs font-bold text-ink">
                <p>
                  {analysis.source.pages} {analysis.source.pages === 1 ? "Page" : "Pages"}
                </p>
                <p>{wordCount.toLocaleString()} Words</p>
                <p>{charCount.toLocaleString()} Characters</p>
              </div>
            </div>
          </div>
        </div>
      </TurnitinPageShell>

      {/* =====================================================================
          PAGE 2: INTEGRITY / CURRICULUM OVERVIEW SUMMARY
         ===================================================================== */}
      <TurnitinPageShell
        pageNumber={2}
        totalPages={totalPages}
        sectionTitle="Integrity Overview"
        submissionId={submissionId}
      >
        <div className="py-2">
          {/* Headline: X% Overall Outdated */}
          <div className=" flex items-baseline gap-2.5">
            <span className="font-sans text-[28px] font-bold leading-none text-ink [-webkit-text-stroke:0]">
              {outdatedPct}%
            </span>
            <h2 className="font-sans text-[26px] font-bold leading-none text-ink [-webkit-text-stroke:0]">
              Overall Outdated
            </h2>
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            The combined total of all outdated findings, including overlapping lifecycle and documentation sources, for this module.
          </p>

          {/* Exclusions / Decisions */}
          <div className="mt-5">
            <h3 className="font-sans text-[14px] font-bold text-ink [-webkit-text-stroke:0]">Exclusions &amp; Decisions</h3>
            <p className="mt-1.5 flex items-center gap-2 text-xs text-ink">
              <span aria-hidden className="text-[10px] text-ink-muted">▸</span>
              {decidedList.length === 0
                ? "0 Excluded or Reviewed Matches"
                : `${decidedList.length} Reviewed ${decidedList.length === 1 ? "Match" : "Matches"} (${updatedCount} Updated, ${keptCount} Kept Intentionally, ${dismissedCount} Excluded)`}
            </p>
          </div>

          <hr className="my-5 border-line" />

          {/* Match Groups & Top Sources summary columns */}
          <OverviewGroupsAndSources
            highCount={highFindings.length}
            highPct={groupPct(highFindings)}
            mediumCount={mediumFindings.length}
            mediumPct={groupPct(mediumFindings)}
            lowCount={lowFindings.length}
            lowPct={groupPct(lowFindings)}
            unverifiedCount={unverifiedFindings.length}
            eolSourcePct={groupPct(eolSourceFindings)}
            docSourcePct={groupPct(docSourceFindings)}
            handsOnPct={groupPct(handsOnFindings)}
          />

          <hr className="my-5 border-line" />
        </div>
      </TurnitinPageShell>

      {/* =====================================================================
          PAGE 3+: INTEGRITY OVERVIEW — NUMBERED TOP SOURCES & FINDINGS
         ===================================================================== */}
      {findingChunks.map((chunk, chunkIdx) => (
        <TurnitinPageShell
          key={`overview-list-${chunkIdx}`}
          pageNumber={3 + chunkIdx}
          totalPages={totalPages}
          sectionTitle="Integrity Overview"
          submissionId={submissionId}
        >
          <div className="py-2">
            <OverviewGroupsAndSources
              highCount={highFindings.length}
              highPct={groupPct(highFindings)}
              mediumCount={mediumFindings.length}
              mediumPct={groupPct(mediumFindings)}
              lowCount={lowFindings.length}
              lowPct={groupPct(lowFindings)}
              unverifiedCount={unverifiedFindings.length}
              eolSourcePct={groupPct(eolSourceFindings)}
              docSourcePct={groupPct(docSourceFindings)}
              handsOnPct={groupPct(handsOnFindings)}
            />

            <hr className="my-5 border-line" />

            <div>
              <h3 className="font-sans text-[15px] font-bold text-ink [-webkit-text-stroke:0]">Top Sources</h3>
              <p className="mt-1 text-xs text-ink-muted">
                The findings and verified sources with the highest priority scores within the submission. Overlapping sources are consolidated.
              </p>

              <div className="mt-4 space-y-3">
                {chunk.map(({ finding: f, rank }) => {
                  const pal = paletteFor(rank - 1);
                  const d = decisions[f.id];
                  const lc = f.lifecycle;
                  const sourceUrl = f.upgrade?.source_url ?? lc?.source_url;
                  const who = sourceShortName(f) ?? (sourceUrl ? sourceHost(sourceUrl) : "Manual verification required");
                  const categoryLabel =
                    f.status === "unverified"
                      ? "Unverified"
                      : lc && sourceHost(lc.source_url).includes("endoflife.date")
                        ? "Lifecycle record"
                        : "Official docs";
                  const sharePct =
                    f.score && totalWeight > 0
                      ? Math.max(1, Math.round((f.score.total / totalWeight) * Math.max(outdatedPct, 1)))
                      : 0;

                  return (
                    <div key={f.id} className="border-b border-line pb-2.5">
                      {/* Colored number badge + category pill + optional faculty decision */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className="inline-flex h-5 min-w-7 items-center justify-center rounded-[5px] px-2 text-[11px] font-bold tabular-nums text-white"
                          style={{ backgroundColor: pal.solid }}
                        >
                          {rank}
                        </span>
                        <span
                          className="inline-flex h-5 items-center rounded-full px-3 text-[11px] font-bold"
                          style={{ backgroundColor: pal.soft, color: pal.text }}
                        >
                          {categoryLabel}
                        </span>
                        <span className="text-[11px] font-medium text-ink-muted">
                          {STATUS_META[f.status].label} · {pagesLabel(f)}
                        </span>
                        {d && (
                          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-panel px-2.5 py-0.5 text-[10.5px] font-semibold text-ink">
                            ✓ {decisionText(d)}
                          </span>
                        )}
                      </div>

                      {/* Bold finding & source line + percentage on right */}
                      <div className="mt-1.5 flex items-baseline justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-sans text-[12.5px] font-bold text-ink">
                            {f.technology}
                            {f.version ? ` ${f.version}` : ""}
                            {f.upgrade ? ` → Use ${f.upgrade.target_cycle} instead` : ` — ${statusShort(f)}`}
                            <span className="font-normal text-ink-muted"> · {who}</span>
                          </p>
                          {d?.text && (
                            <p className="mt-0.5 truncate text-[11px] italic text-ink-muted">
                              Approved wording: “{d.text}”
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 font-sans text-xs font-bold tabular-nums text-ink">
                          {sharePct > 0 ? `${sharePct}%` : "<1%"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TurnitinPageShell>
      ))}

      {/* =====================================================================
          SUBMISSION PAGES: ANNOTATED MODULE PAGES WITH HIGHLIGHTS & MARGIN BADGES
         ===================================================================== */}
      {renderedPages.length > 0
        ? renderedPages.map((pg, idx) => (
            <TurnitinPageShell
              key={`sub-pdf-${pg.page}`}
              pageNumber={2 + findingChunks.length + idx + 1}
              totalPages={totalPages}
              sectionTitle="Integrity Submission"
              submissionId={submissionId}
            >
              <AnnotatedPdfSubmissionPage
                page={pg}
                findings={ranked}
                findingNumberById={findingNumberById}
              />
            </TurnitinPageShell>
          ))
        : (analysis.pages ?? []).map((pg, idx) => (
            <TurnitinPageShell
              key={`sub-text-${pg.number}`}
              pageNumber={2 + findingChunks.length + idx + 1}
              totalPages={totalPages}
              sectionTitle="Integrity Submission"
              submissionId={submissionId}
            >
              <AnnotatedTextSubmissionPage
                page={pg}
                findings={ranked}
                findingNumberById={findingNumberById}
              />
            </TurnitinPageShell>
          ))}
    </div>
  );
}

/**
 * Turnitin Page Shell: renders the top bar and bottom bar (`GroundEd | Page X of Y - Section` ... `Submission ID`)
 * on every page of the exported PDF.
 */
function TurnitinPageShell({
  pageNumber,
  totalPages,
  sectionTitle,
  submissionId,
  children,
}: {
  pageNumber: number;
  totalPages: number;
  sectionTitle: string;
  submissionId: string;
  children: ReactNode;
}) {
  const bar = (
    <div className="flex shrink-0 items-center justify-between gap-4 py-1 text-[10.5px] text-ink-muted">
      <div className="flex items-center gap-5">
        <span className="inline-flex items-center gap-1.5 text-ink">
          <HorizonMark size={18} />
          <span className="font-sans text-[15px] font-bold tracking-[-0.03em] text-ink">
            Ground<span className="text-lapis">Ed</span>
          </span>
        </span>
        <span className="font-medium text-ink-muted">
          Page {pageNumber} of {totalPages} - {sectionTitle}
        </span>
      </div>
      <div className="flex items-center gap-2 font-medium text-ink-muted">
        <span>Submission ID</span>
        <span className="text-ink">{submissionId}</span>
      </div>
    </div>
  );

  return (
    <section className="flex h-[100vh] min-h-[100vh] w-full flex-col justify-between bg-white px-10 py-6 break-after-page last:break-after-auto">
      {bar}
      <div className="flex min-h-0 flex-1 flex-col justify-start overflow-hidden py-3">{children}</div>
      {bar}
    </section>
  );
}

/**
 * Two-column Match Groups & Top Sources block used on Page 2 and at the top of Page 3+.
 */
function OverviewGroupsAndSources({
  highCount,
  highPct,
  mediumCount,
  mediumPct,
  lowCount,
  lowPct,
  unverifiedCount,
  eolSourcePct,
  docSourcePct,
  handsOnPct,
}: {
  highCount: number;
  highPct: number;
  mediumCount: number;
  mediumPct: number;
  lowCount: number;
  lowPct: number;
  unverifiedCount: number;
  eolSourcePct: number;
  docSourcePct: number;
  handsOnPct: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-10">
      {/* Left column: Match Groups */}
      <div>
        <h3 className="mb-3.5 font-sans text-[15px] font-bold text-ink [-webkit-text-stroke:0]">Match Groups</h3>
        <ul className="space-y-3 text-xs">
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-high/15 text-high">
              <OctagonAlert size={12} aria-hidden />
            </span>
            <div>
              <p className="font-bold text-ink">
                {highCount} High Priority · End-of-Life{" "}
                <span className="ml-1 font-bold text-ink-muted">{highPct}%</span>
              </p>
              <p className="text-[11px] text-ink-muted">
                Unsupported or removed items taught directly in code or lab exercises
              </p>
            </div>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-medium/15 text-medium">
              <Quote size={11} aria-hidden />
            </span>
            <div>
              <p className="font-bold text-ink">
                {mediumCount} Medium Priority · Nearing EOL{" "}
                <span className="ml-1 font-bold text-ink-muted">{mediumPct}%</span>
              </p>
              <p className="text-[11px] text-ink-muted">
                Outdated or nearing end-of-life items explained or referenced in the module
              </p>
            </div>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-low/15 text-low">
              <FileText size={11} aria-hidden />
            </span>
            <div>
              <p className="font-bold text-ink">
                {lowCount} Low Priority · Listed or Declining{" "}
                <span className="ml-1 font-bold text-ink-muted">{lowPct}%</span>
              </p>
              <p className="text-[11px] text-ink-muted">
                Still supported or minor mentions with lower curriculum impact
              </p>
            </div>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-unverified/15 text-unverified">
              <HelpCircle size={12} aria-hidden />
            </span>
            <div>
              <p className="font-bold text-ink">
                {unverifiedCount} Unverified · Manual Check{" "}
                <span className="ml-1 font-bold text-ink-muted">0%</span>
              </p>
              <p className="text-[11px] text-ink-muted">
                Mentions with no trusted source in the registry; never guessed or scored
              </p>
            </div>
          </li>
        </ul>
      </div>

      {/* Right column: Top Sources */}
      <div>
        <h3 className="mb-3.5 font-sans text-[15px] font-bold text-ink [-webkit-text-stroke:0]">Top Sources</h3>
        <ul className="space-y-2.5 text-xs">
          <li className="flex items-center gap-3">
            <span className="w-8 font-bold tabular-nums text-ink">{eolSourcePct}%</span>
            <Globe size={14} className=" shrink-0 text-ink-muted" aria-hidden />
            <span className="text-ink">Lifecycle records (endoflife.date)</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="w-8 font-bold tabular-nums text-ink">{docSourcePct}%</span>
            <BookOpen size={14} className="shrink-0 text-ink-muted" aria-hidden />
            <span className="text-ink">Official documentation (php.net, MDN, MySQL)</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="w-8 font-bold tabular-nums text-ink">{handsOnPct}%</span>
            <UserCheck size={14} className="shrink-0 text-ink-muted" aria-hidden />
            <span className="text-ink">Hands-on lab &amp; student code exercises</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Renders one PDF page inside the Turnitin submission frame with colored bbox overlays
 * and left-margin numbered callout badges (`[icon | #]`).
 */
function AnnotatedPdfSubmissionPage({
  page,
  findings,
  findingNumberById,
}: {
  page: RenderedPdfPage;
  findings: Finding[];
  findingNumberById: Map<string, number>;
}) {
  const annotations = useMemo(() => {
    const raw: {
      finding: Finding;
      rank: number;
      rect: [number, number, number, number];
      topPct: number;
      badgeTopPct: number;
    }[] = [];

    for (const f of findings) {
      const rank = findingNumberById.get(f.id) ?? 1;
      for (const c of f.citations) {
        if (c.page === page.page && c.bbox && c.bbox.length === 4) {
          const topPct = Math.max(0, Math.min(96, (c.bbox[1] / page.h) * 100));
          raw.push({
            finding: f,
            rank,
            rect: c.bbox,
            topPct,
            badgeTopPct: topPct,
          });
        }
      }
    }

    // Sort by vertical position and de-collide left-margin badges so adjacent lines stack cleanly
    raw.sort((a, b) => a.topPct - b.topPct);
    const MIN_GAP_PCT = 3.6;
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].badgeTopPct < raw[i - 1].badgeTopPct + MIN_GAP_PCT) {
        raw[i].badgeTopPct = Math.min(96, raw[i - 1].badgeTopPct + MIN_GAP_PCT);
      }
    }
    return raw;
  }, [findings, findingNumberById, page]);

  return (
    <div className="flex flex-1 items-center justify-center overflow-hidden">
      <div className="relative flex h-full max-h-full items-center justify-center pl-14 pr-4">
        <div
          className="relative h-full max-h-[calc(100vh-120px)] w-auto max-w-full"
          style={{ aspectRatio: `${page.w} / ${page.h}` }}
        >
          {/* Left-margin callout badges (Turnitin style `[ icon | # ]`) */}
          <div className="pointer-events-none absolute inset-y-0 -left-14 w-12" aria-hidden>
            {annotations.map((a, idx) => {
              const pal = paletteFor(a.rank - 1);
              return (
                <div
                  key={`badge-${idx}`}
                  className=" absolute left-0 inline-flex h-[20px] min-w-[42px] items-center justify-between rounded-[4px] px-1 text-[10.5px] font-bold tabular-nums text-white shadow-xs"
                  style={{
                    top: `${a.badgeTopPct}%`,
                    backgroundColor: pal.solid,
                    transform: "translateY(-15%)",
                  }}
                >
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black/25">
                    <FileText size={9} />
                  </span>
                  <span className="px-1">{a.rank}</span>
                </div>
              );
            })}
          </div>

          {/* Rendered PDF page image */}
          <img
            src={page.dataUrl}
            alt={`Module page ${page.page}`}
            className="block h-full w-full select-none object-contain"
          />

          {/* Highlighted match boxes overlaid on the PDF page */}
          {annotations.map((a, idx) => {
            const [x0, y0, x1, y1] = a.rect;
            const pal = paletteFor(a.rank - 1);
            const left = Math.max(0, (x0 / page.w) * 100 - 0.3);
            const top = Math.max(0, (y0 / page.h) * 100 - 0.2);
            const width = Math.min(100 - left, ((x1 - x0) / page.w) * 100 + 0.6);
            const height = Math.min(100 - top, ((y1 - y0) / page.h) * 100 + 0.4);
            return (
              <div
                key={`hl-${idx}`}
                className="pointer-events-none absolute rounded-[2px] mix-blend-multiply"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                  backgroundColor: pal.highlight,
                  borderBottom: `2px solid ${pal.solid}`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

const QUOTES_MAP: Record<string, string> = { "“": '"', "”": '"', "‘": "'", "’": "'" };

function normaliseText(text: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  let lastSpace = true;
  for (let i = 0; i < text.length; i++) {
    const ch = QUOTES_MAP[text[i]] ?? text[i];
    if (/\s/.test(ch)) {
      if (!lastSpace) {
        norm += " ";
        map.push(i);
      }
      lastSpace = true;
    } else {
      norm += ch.toLowerCase();
      map.push(i);
      lastSpace = false;
    }
  }
  return { norm, map };
}

/**
 * Fallback submission page when only extracted text (`analysis.pages`) is available.
 * Highlights matched snippets in their Turnitin palette color with numbered callout badges in the left margin.
 */
function AnnotatedTextSubmissionPage({
  page,
  findings,
  findingNumberById,
}: {
  page: PageText;
  findings: Finding[];
  findingNumberById: Map<string, number>;
}) {
  const marks = useMemo(() => {
    const { norm, map } = normaliseText(page.text);
    const found: { start: number; end: number; finding: Finding; rank: number }[] = [];
    for (const f of findings) {
      const rank = findingNumberById.get(f.id) ?? 1;
      for (const c of f.citations) {
        if (c.page !== page.number) continue;
        const needle = normaliseText(c.snippet).norm.trim();
        const at = needle ? norm.indexOf(needle) : -1;
        if (at >= 0) {
          found.push({
            start: map[at],
            end: map[at + needle.length - 1] + 1,
            finding: f,
            rank,
          });
        }
      }
    }
    found.sort((a, b) => a.start - b.start);
    const kept: typeof found = [];
    for (const m of found) {
      if (!kept.length || m.start >= kept[kept.length - 1].end) kept.push(m);
    }
    return kept;
  }, [page, findings, findingNumberById]);

  const segments: ReactNode[] = [];
  let cursor = 0;
  marks.forEach((m, idx) => {
    if (m.start > cursor) segments.push(page.text.slice(cursor, m.start));
    const pal = paletteFor(m.rank - 1);
    segments.push(
      <mark
        key={`txt-hl-${idx}`}
        className="rounded-[2px] px-1 py-0.5 text-ink"
        style={{
          backgroundColor: pal.highlight,
          borderBottom: `2px solid ${pal.solid}`,
        }}
      >
        <span
          className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] px-1 text-[10px] font-bold text-white align-middle"
          style={{ backgroundColor: pal.solid }}
        >
          {m.rank}
        </span>
        {page.text.slice(m.start, m.end)}
      </mark>,
    );
    cursor = m.end;
  });
  if (cursor < page.text.length) segments.push(page.text.slice(cursor));

  return (
    <div className="flex flex-1 items-start gap-4 overflow-hidden py-2">
      {/* Left margin badges */}
      <div className="flex w-12 shrink-0 flex-col gap-2 pt-4" aria-hidden>
        {marks.map((m, idx) => {
          const pal = paletteFor(m.rank - 1);
          return (
            <div
              key={`txt-badge-${idx}`}
              className="inline-flex h-[20px] min-w-[42px] items-center justify-between rounded-[4px] px-1 text-[10.5px] font-bold tabular-nums text-white"
              style={{ backgroundColor: pal.solid }}
            >
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black/25">
                <FileText size={9} />
              </span>
              <span className="px-1">{m.rank}</span>
            </div>
          );
        })}
      </div>

      {/* Document text sheet */}
      <div className="flex-1 rounded-[4px] border border-line bg-white p-6 text-xs leading-relaxed whitespace-pre-line text-ink">
        {segments}
      </div>
    </div>
  );
}
