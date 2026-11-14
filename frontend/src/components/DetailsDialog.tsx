import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Analysis } from "../types";
import { formatDate } from "../lib/format";

/** "How this report was made": the provenance stamp in plain language (DESIGN.md: Details button). */
export default function DetailsDialog({ analysis, onClose }: { analysis: Analysis; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pv = analysis.provenance;

  // Native modal: focus trap, Esc to close, backdrop. Open once; no close() in cleanup, because close() fires the
  // dialog's "close" event, which would immediately unmount it again (React runs effects twice in development).
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const short = (v?: string | null) => (v ? v.slice(0, 10) : "—");

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="details-title"
      className="m-auto w-[min(92vw,560px)] rounded-[var(--radius-panel)] border border-line bg-surface p-0 text-ink shadow-[var(--shadow-float)] backdrop:bg-ink/40"
    >
      <div className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <h2 id="details-title" className="flex-1 text-[28px] leading-tight">How this report was made</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-ink-muted hover:bg-panel"><X size={18} /></button>
        </div>
        <p className="text-sm text-ink-muted">
          GroundEd read your file, matched technologies against its fact list, and checked each one against trusted
          sources. Scores come from fixed rules. <strong className="text-ink">No AI decided any finding or score.</strong>
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
          <dt className="text-ink-subtle">Analysed</dt>
          <dd>{formatDate(pv?.analysis_date ?? analysis.created_at)} <span className="text-ink-subtle">(support status as of this date)</span></dd>
          <dt className="text-ink-subtle">Your file</dt>
          <dd>{analysis.source.filename} · {analysis.source.pages} pages{pv && <> · fingerprint <span className="font-mono text-xs">{pv.file_sha256.slice(0, 12)}…</span></>}</dd>
          {pv && (
            <>
              <dt className="text-ink-subtle">Detection</dt>
              <dd>{pv.detector === "registry" ? "Fact list only (no AI)" : pv.detector}</dd>
              <dt className="text-ink-subtle">Fact list</dt>
              <dd className="font-mono text-xs leading-6">{short(pv.registry_version)}</dd>
              <dt className="text-ink-subtle">Source library</dt>
              <dd className="font-mono text-xs leading-6">{short(pv.library_version)}</dd>
              <dt className="text-ink-subtle">Scoring rules</dt>
              <dd className="font-mono text-xs leading-6">{short(pv.rules_version)} · pipeline {pv.pipeline_version}</dd>
              {Object.keys(pv.eol_data).length > 0 && (
                <>
                  <dt className="text-ink-subtle">Lifecycle data</dt>
                  <dd className="text-xs">{Object.entries(pv.eol_data).map(([k, v]) => `${k} (${v.split(" ")[0].slice(0, 10)})`).join(" · ")}</dd>
                </>
              )}
            </>
          )}
        </dl>
        <p className="rounded-[var(--radius-control)] bg-panel p-3 text-xs text-ink-muted">
          The same file with the same versions always gives the same result. Support status changes over time, so each
          report is valid as of its analysis date.
        </p>
      </div>
    </dialog>
  );
}
