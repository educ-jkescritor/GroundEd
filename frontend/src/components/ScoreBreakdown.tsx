import type { Score } from "../types";

export default function ScoreBreakdown({ score }: { score: Score }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-slate-600">Why {score.total}/100?</summary>
      <ul className="mt-2 space-y-1">
        {score.breakdown.map((p) => (
          <li key={p.key} className="flex gap-3">
            <span className="w-14 font-mono">{p.points}/{p.max}</span>
            <span className="w-36 font-medium">{p.label}</span>
            <span className="text-slate-600">{p.reason}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
