import { useState } from "react";
import { Check, Copy, Printer } from "lucide-react";
import type { Analysis } from "../types";
import { DECISION_LABEL, type Decisions } from "../lib/decisions";
import { formatDate } from "../lib/format";
import { STATUS_META } from "./ui/StatusBadge";
import { summaryLine } from "./FindingCard";
import { PRIORITY_LABEL, priorityOf } from "../lib/priority";
import { Button } from "./ui/Button";

export function sortFindings(a: Analysis) {
  return [...a.findings].sort((x, y) => (y.score?.total ?? -1) - (x.score?.total ?? -1));
}

export function buildMarkdown(a: Analysis, decisions: Decisions): string {
  const s = a.summary;
  const lines = [
    `# GroundEd review: ${a.source.filename}`,
    "",
    `Generated ${formatDate(a.created_at)} · ${a.source.pages} pages`,
    "",
    `**Summary:** ${s.eol} end-of-life · ${s.nearing_eol} nearing end-of-life · ${s.supported} supported · ${s.unverified} unverified`,
    "",
  ];
  for (const f of sortFindings(a)) {
    const d = decisions[f.id];
    lines.push(`## ${f.technology}${f.version ? ` ${f.version}` : ""}: ${STATUS_META[f.status].label}`);
    lines.push("", summaryLine(f));
    const pr = f.status === "supported" ? null : priorityOf(f.score);
    if (f.score && pr) lines.push("", `**${PRIORITY_LABEL[pr]}:** ${f.score.total}/100 (${f.score.breakdown.map((p) => `${p.label} ${p.points}/${p.max}`).join(", ")})`);
    lines.push("", "**Evidence**");
    for (const c of f.citations) lines.push(`- Syllabus p. ${c.page}: "${c.snippet}"`);
    if (f.lifecycle) lines.push(`- Lifecycle record: ${f.lifecycle.source_url}`);
    if (d) {
      lines.push("", `**Faculty decision:** ${DECISION_LABEL[d.kind]}`);
      if (d.kind === "upgrade_accepted") lines.push(`Upgrade to ${d.target}`);
      if (d.kind === "draft_approved") lines.push("", "Approved text (AI-drafted, edited and approved by faculty):", "", `> ${d.text}`);
    }
    lines.push("");
  }
  lines.push("---", "Lifecycle data: endoflife.date. Drafts are AI suggestions approved by faculty. Generated with GroundEd.");
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

/** Full report shown only when printing (DESIGN.md §10). */
export function PrintReport({ analysis, decisions }: { analysis: Analysis; decisions: Decisions }) {
  const s = analysis.summary;
  return (
    <div className="hidden space-y-6 text-sm print:block">
      <header>
        <h1 className="font-serif text-2xl font-semibold">GroundEd review: {analysis.source.filename}</h1>
        <p>
          Generated {formatDate(analysis.created_at)} · {analysis.source.pages} pages · {s.eol} end-of-life ·{" "}
          {s.nearing_eol} nearing end-of-life · {s.supported} supported · {s.unverified} unverified
        </p>
      </header>
      {sortFindings(analysis).map((f) => {
        const d = decisions[f.id];
        return (
          <section key={f.id} className="break-inside-avoid space-y-1 border-t border-line pt-3">
            <h2 className="font-semibold">
              {f.technology} {f.version}: {STATUS_META[f.status].label}
              {f.score && f.status !== "supported" && ` · ${PRIORITY_LABEL[priorityOf(f.score)!]} (${f.score.total}/100)`}
            </h2>
            <p>{summaryLine(f)}</p>
            {f.citations.map((c, i) => (
              <p key={i}>Syllabus p. {c.page}: “{c.snippet}”</p>
            ))}
            {f.lifecycle && <p>Lifecycle record: <a href={f.lifecycle.source_url}>endoflife.date</a></p>}
            {d && (
              <p>
                <strong>Decision:</strong> {DECISION_LABEL[d.kind]}
                {d.kind === "upgrade_accepted" && ` → ${d.target}`}
                {d.kind === "draft_approved" && `: “${d.text}”`}
              </p>
            )}
          </section>
        );
      })}
      <footer className="border-t border-line pt-3 text-xs">
        Lifecycle data: endoflife.date. Drafts are AI suggestions approved by faculty. Generated with GroundEd.
      </footer>
    </div>
  );
}
