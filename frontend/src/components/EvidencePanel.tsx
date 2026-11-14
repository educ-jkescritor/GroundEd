import { BookOpen, Database } from "lucide-react";
import type { Finding } from "../types";
import { SourceLink } from "./ui/SourceLink";
import { formatDate, relativeToNow } from "../lib/format";

// The two sources behind a finding: the syllabus page/snippet and the endoflife.date record.
export default function EvidencePanel({ finding }: { finding: Finding }) {
  const lc = finding.lifecycle;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="space-y-2 rounded-lg bg-canvas p-4">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          <BookOpen size={14} aria-hidden /> In your syllabus
        </h4>
        {finding.citations.map((c, i) => (
          <blockquote key={i} className="border-l-2 border-line pl-3">
            <p className="font-serif italic">“{c.snippet}”</p>
            <p className="text-xs text-ink-subtle">Page {c.page}</p>
          </blockquote>
        ))}
      </section>

      <section className="space-y-2 rounded-lg bg-canvas p-4">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          <Database size={14} aria-hidden /> Lifecycle record
        </h4>
        {lc ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {lc.cycle && (
              <>
                <dt className="text-ink-subtle">Version</dt>
                <dd className="font-mono">{lc.cycle}</dd>
              </>
            )}
            <dt className="text-ink-subtle">End of life</dt>
            <dd>
              {lc.eol_date ? (
                <>
                  {formatDate(lc.eol_date)} <span className="text-ink-subtle">({relativeToNow(lc.eol_date)})</span>
                </>
              ) : (
                "No end date announced"
              )}
            </dd>
            {lc.latest_cycle && (
              <>
                <dt className="text-ink-subtle">Latest</dt>
                <dd className="font-mono">{lc.latest_cycle}</dd>
              </>
            )}
            <dt className="text-ink-subtle">Source</dt>
            <dd>
              <SourceLink href={lc.source_url}>{lc.source_url.replace(/^https?:\/\//, "")}</SourceLink>
            </dd>
          </dl>
        ) : (
          <div className="space-y-2 text-sm text-ink-muted">
            <p>No source found. GroundEd does not guess. Please check this one manually.</p>
            <SourceLink href={`https://endoflife.date/?q=${encodeURIComponent(finding.technology)}`}>
              Search endoflife.date
            </SourceLink>
          </div>
        )}
      </section>
    </div>
  );
}
