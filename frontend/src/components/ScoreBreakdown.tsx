import type { Score } from "../types";

export default function ScoreBreakdown({ score }: { score: Score }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          Why {score.total}/{score.max}?
        </h4>
        <a href="/#scoring" target="_blank" rel="noreferrer" className="text-xs">How is this scored?</a>
      </div>
      <ul className="space-y-3">
        {score.breakdown.map((p) => (
          <li key={p.key} className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4">
            <div className="flex justify-between text-sm sm:block">
              <span className="font-medium">{p.label}</span>
              <span className="font-mono text-ink-subtle tabular-nums sm:ml-2">
                {p.points}/{p.max}
              </span>
            </div>
            <div className="space-y-1">
              <div
                className="h-2 overflow-hidden rounded-full bg-line"
                role="meter"
                aria-label={p.label}
                aria-valuenow={p.points}
                aria-valuemin={0}
                aria-valuemax={p.max}
              >
                <div className="h-full rounded-full bg-ink" style={{ width: `${p.max ? (p.points / p.max) * 100 : 0}%` }} />
              </div>
              <p className="text-xs text-ink-muted">{p.reason}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
