import { useId, useState } from "react";
import { Info } from "lucide-react";
import type { Score } from "../../types";
import { PRIORITY_LABEL } from "../../lib/priority";
import type { Tone } from "../../lib/findings";

/**
 * "Why this priority?" as a tooltip beside the priority tag (DESIGN.md §10). Opens on hover, keyboard focus or tap;
 * Esc closes. Shows the total and each factor's points with its plain-language reason.
 */
export function PriorityInfo({ score, tone }: { score: Score | null; tone: Tone }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const title = tone === "unverified" ? "Not scored" : `${PRIORITY_LABEL[tone]}: ${score?.total ?? 0} of ${score?.max ?? 100}`;

  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label="Why this priority?"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="flex h-6 w-6 items-center justify-center rounded-full text-ink-subtle hover:bg-panel hover:text-ink"
      >
        <Info size={15} aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute right-0 top-8 z-30 w-72 rounded-[var(--radius-card)] border border-line bg-surface p-3 text-left text-xs shadow-[var(--shadow-float)]"
        >
          <span className="block text-sm font-semibold text-ink">{title}</span>
          {tone === "unverified" || !score ? (
            <span className="mt-1 block text-ink-muted">No trusted source was found, so GroundEd doesn't score or rank it.</span>
          ) : (
            <span className="mt-2 block space-y-2">
              {score.breakdown.map((p) => (
                <span key={p.key} className="block">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-ink">{p.label}</span>
                    <span className="font-mono tabular-nums text-ink-subtle">{p.points}/{p.max}</span>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full bg-ink" style={{ width: `${p.max ? (p.points / p.max) * 100 : 0}%` }} />
                  </span>
                  <span className="mt-0.5 block text-ink-muted">{p.reason}</span>
                </span>
              ))}
              <span className="block border-t border-line pt-2 text-ink-subtle">High is 80 or more, Medium 50 to 79, Low below 50.</span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
