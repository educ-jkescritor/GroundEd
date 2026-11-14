import { useState } from "react";
import { Check, Copy, Printer } from "lucide-react";
import type { Analysis } from "../types";
import { DECISION_DONE, type Decisions } from "../lib/decisions";
import { formatDate } from "../lib/format";
import { needsReview, pagesLabel, rankFindings, summaryLine } from "../lib/findings";
import { PRIORITY_LABEL, priorityOf } from "../lib/priority";
import { STATUS_META } from "./ui/StatusBadge";
import { Button } from "./ui/Button";

const FOOTER = "Lifecycle data: endoflife.date and official documentation. Drafts are AI suggestions approved by faculty. Generated with GroundEd (advisory: faculty decide).";

function decisionText(d: Decisions[string]): string {
  let s = DECISION_DONE[d.kind];
  if (d.target) s += ` → ${d.target}`;
  if (d.reason) s += ` (reason: ${d.reason})`;
  return s;
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
      lines.push("", `**${PRIORITY_LABEL[pr]}:** ${f.score.total}/100 (${f.score.breakdown.map((p) => `${p.label} ${p.points}/${p.max}`).join(", ")})`);
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

/** Full report shown only when printing (DESIGN.md §7: Print). */
export function PrintReport({ analysis, decisions }: { analysis: Analysis; decisions: Decisions }) {
  const review = analysis.findings.filter(needsReview);
  return (
    <div className="hidden space-y-5 p-8 text-sm print:block">
      <header>
        <h1 className="text-2xl">GroundEd report: {analysis.source.filename}</h1>
        <p>As of {formatDate(analysis.created_at)} · {analysis.source.pages} pages · {review.length} findings may warrant review</p>
      </header>
      {rankFindings(analysis.findings).map((f) => {
        const d = decisions[f.id];
        const pr = f.status === "supported" ? null : priorityOf(f.score);
        return (
          <section key={f.id} className="break-inside-avoid space-y-1 border-t border-line pt-3">
            <h2 className="text-base">
              {f.technology} {f.version}: {STATUS_META[f.status].label}
              {f.score && pr && ` · ${PRIORITY_LABEL[pr]} (${f.score.total}/100)`}
            </h2>
            <p>{summaryLine(f)}</p>
            {f.citations.map((c, i) => (
              <p key={i} className="font-serif italic">Module p. {c.page}: “{c.snippet}”</p>
            ))}
            {f.lifecycle && <p>Source: <a href={f.lifecycle.source_url}>{f.lifecycle.source_url}</a></p>}
            {d && <p><strong>Decision:</strong> {decisionText(d)}{d.text && `: “${d.text}”`}</p>}
          </section>
        );
      })}
      <footer className="border-t border-line pt-3 text-xs">{FOOTER}</footer>
    </div>
  );
}
