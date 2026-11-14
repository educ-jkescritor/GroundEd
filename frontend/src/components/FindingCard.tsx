import { useState } from "react";
import { api } from "../api";
import type { Draft, Finding, FindingStatus } from "../types";
import EvidencePanel from "./EvidencePanel";
import ScoreBreakdown from "./ScoreBreakdown";

const STATUS_LABEL: Record<FindingStatus, string> = {
  eol: "End-of-life",
  nearing_eol: "Nearing end-of-life",
  supported: "Supported",
  unverified: "Unverified: needs manual check",
};

const STATUS_STYLE: Record<FindingStatus, string> = {
  eol: "bg-red-100 text-red-800",
  nearing_eol: "bg-amber-100 text-amber-800",
  supported: "bg-green-100 text-green-800",
  unverified: "bg-slate-200 text-slate-700",
};

// Three help levels: (1) review evidence, (2) accept sourced upgrade, (3) AI draft to edit.
// Nothing is applied until the faculty member clicks Approve.
export default function FindingCard({ analysisId, finding }: { analysisId: string; finding: Finding }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [approved, setApproved] = useState(false);

  return (
    <article className="space-y-3 rounded-lg border bg-white p-4">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">
          {finding.technology} {finding.version}
        </h2>
        <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLE[finding.status]}`}>
          {STATUS_LABEL[finding.status]}
        </span>
        {finding.score && <span className="ml-auto font-mono">{finding.score.total}/100</span>}
      </header>

      <EvidencePanel finding={finding} />
      {finding.score && <ScoreBreakdown score={finding.score} />}

      {finding.status !== "supported" && finding.status !== "unverified" && (
        <div className="flex flex-wrap gap-2">
          {finding.upgrade && (
            <span className="text-sm">
              Suggested upgrade: <strong>{finding.upgrade.target_cycle}</strong>{" "}
              (<a className="underline" href={finding.upgrade.source_url} target="_blank" rel="noreferrer">source</a>)
            </span>
          )}
          <button
            className="rounded border px-3 py-1 text-sm"
            onClick={() => api.draft(analysisId, finding.id).then(setDraft)}
          >
            Draft updated section
          </button>
        </div>
      )}

      {draft && (
        <div className="space-y-2 rounded border border-dashed p-3">
          <p className="text-xs text-amber-700">{draft.disclaimer}</p>
          <textarea className="w-full rounded border p-2" rows={3} defaultValue={draft.text} />
          <button
            className="rounded bg-slate-900 px-3 py-1 text-sm text-white"
            onClick={() => setApproved(true)}
            disabled={approved}
          >
            {approved ? "Approved" : "Approve"}
          </button>
        </div>
      )}
    </article>
  );
}
