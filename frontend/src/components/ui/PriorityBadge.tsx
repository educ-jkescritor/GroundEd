import { useId, useState } from "react";
import { CircleHelp, Triangle } from "lucide-react";
import type { Priority, Score } from "../../types";
import { PRIORITY_LABEL } from "../../lib/priority";

/**
 * Priority tags (DESIGN.md §5): High = red ▲, Medium = amber ●, Low = green ▼, Unverified = grey ?.
 * Colour is never the only cue: every tag has an icon and a word.
 * When `score` is provided, hovering, focusing, or tapping the tag itself reveals the priority scoring breakdown tooltip.
 */
export const PRIORITY_STYLE: Record<Priority | "unverified", { cls: string; bar: string; short: string }> = {
  high: { cls: "border-high-line bg-high-soft text-high", bar: "bg-high", short: "High" },
  medium: { cls: "border-medium-line bg-medium-soft text-medium", bar: "bg-medium", short: "Medium" },
  low: { cls: "border-low-line bg-low-soft text-low", bar: "bg-low", short: "Low" },
  unverified: { cls: "border-line bg-unverified-soft text-unverified", bar: "bg-unverified", short: "Unverified" },
};

export const PRIORITY_TAG_BASE =
  "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold";

export function PriorityIcon({ p }: { p: Priority | "unverified" }) {
  if (p === "unverified") return <CircleHelp size={12} aria-hidden />;
  if (p === "medium") return <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-current" />;
  return <Triangle size={10} aria-hidden fill="currentColor" className={p === "low" ? "rotate-180" : ""} />;
}

/** "▲ High priority", "▲ High 2" with a count, or "▲ High" when short. */
export function PriorityBadge({
  priority,
  count,
  short = false,
  score,
}: {
  priority: Priority | "unverified";
  count?: number;
  short?: boolean;
  score?: Score | null;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const st = PRIORITY_STYLE[priority];
  const word = priority === "unverified" ? "Unverified" : short || count !== undefined ? st.short : PRIORITY_LABEL[priority];
  const badgeCls = `${PRIORITY_TAG_BASE} ${st.cls}`;

  const content = (
    <>
      <PriorityIcon p={priority} />
      <span>{word}</span>
      {count !== undefined && <span className="tabular-nums opacity-75">{count}</span>}
    </>
  );

  if (score === undefined) {
    return <span className={badgeCls}>{content}</span>;
  }

  const title = priority === "unverified" ? "Not scored" : `${PRIORITY_LABEL[priority]}: ${score?.total ?? 0} of ${score?.max ?? 100}`;

  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={`${badgeCls} cursor-help transition-shadow hover:shadow-[var(--shadow-card)]`}
      >
        {content}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute right-0 top-full z-30 mt-1.5 w-72 rounded-[var(--radius-card)] border border-line bg-surface p-3 text-left text-xs shadow-[var(--shadow-float)]"
        >
          <span className="block text-sm font-semibold text-ink">{title}</span>
          {priority === "unverified" || !score ? (
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
