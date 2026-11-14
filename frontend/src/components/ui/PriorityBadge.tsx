import { CircleHelp, Triangle } from "lucide-react";
import type { Priority } from "../../types";
import { PRIORITY_LABEL } from "../../lib/priority";

/**
 * Priority tags (DESIGN.md §5): High = red ▲, Medium = amber ●, Low = green ▼, Unverified = grey ?.
 * Colour is never the only cue: every tag has an icon and a word.
 */
export const PRIORITY_STYLE: Record<Priority | "unverified", { cls: string; bar: string; short: string }> = {
  high: { cls: "border-high-line bg-high-soft text-high", bar: "bg-high", short: "High" },
  medium: { cls: "border-medium-line bg-medium-soft text-medium", bar: "bg-medium", short: "Medium" },
  low: { cls: "border-low-line bg-low-soft text-low", bar: "bg-low", short: "Low" },
  unverified: { cls: "border-line bg-unverified-soft text-unverified", bar: "bg-unverified", short: "Unverified" },
};

function PriorityIcon({ p }: { p: Priority | "unverified" }) {
  if (p === "unverified") return <CircleHelp size={12} aria-hidden />;
  if (p === "medium") return <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-current" />;
  return <Triangle size={10} aria-hidden fill="currentColor" className={p === "low" ? "rotate-180" : ""} />;
}

/** "▲ High priority", "▲ 2 High" with a count, or "▲ High" when short. */
export function PriorityBadge({ priority, count, short = false }: { priority: Priority | "unverified"; count?: number; short?: boolean }) {
  const st = PRIORITY_STYLE[priority];
  const word = priority === "unverified" ? "Unverified" : short || count !== undefined ? st.short : PRIORITY_LABEL[priority];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
      <PriorityIcon p={priority} />
      {count !== undefined ? `${count} ${word}` : word}
    </span>
  );
}
