import type { Finding } from "../types";

// Shows the two sources behind a finding: the syllabus page/snippet and the endoflife.date record.
export default function EvidencePanel({ finding }: { finding: Finding }) {
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <div className="font-medium">In your syllabus</div>
        {finding.citations.map((c, i) => (
          <blockquote key={i} className="mt-1 border-l-2 pl-2 text-slate-700">
            “{c.snippet}” <span className="text-slate-500">(p. {c.page})</span>
          </blockquote>
        ))}
      </div>
      <div>
        <div className="font-medium">Lifecycle record</div>
        {finding.lifecycle ? (
          <p className="mt-1 text-slate-700">
            {finding.lifecycle.cycle && <>Cycle {finding.lifecycle.cycle} · </>}
            {finding.lifecycle.eol_date ? <>EOL {finding.lifecycle.eol_date}</> : <>No EOL date announced</>}
            {" · "}
            <a className="underline" href={finding.lifecycle.source_url} target="_blank" rel="noreferrer">
              endoflife.date
            </a>
          </p>
        ) : (
          <p className="mt-1 text-slate-500">No source found. GroundEd does not guess. Please check manually.</p>
        )}
      </div>
    </div>
  );
}
