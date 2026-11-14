import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import type { Analysis } from "../types";
import FindingCard from "../components/FindingCard";

// TODO (design): summary bar, filters by status, sort by score, export report, side-by-side PDF (stretch).
export default function Results() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) api.analysis(id).then(setAnalysis).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!analysis) return <p>Loading…</p>;

  const findings = [...analysis.findings].sort((a, b) => (b.score?.total ?? -1) - (a.score?.total ?? -1));

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Review: {analysis.source.filename}</h1>
        <p className="text-slate-600">
          {analysis.summary.eol} end-of-life · {analysis.summary.nearing_eol} nearing EOL ·{" "}
          {analysis.summary.supported} supported · {analysis.summary.unverified} unverified
        </p>
      </div>
      <div className="space-y-4">
        {findings.map((f) => (
          <FindingCard key={f.id} analysisId={analysis.id} finding={f} />
        ))}
      </div>
    </section>
  );
}
