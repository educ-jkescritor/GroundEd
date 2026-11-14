import type { Priority } from "../../types";
import { PRIORITY_LABEL } from "../../lib/priority";

// Priority is a ranking, not a status, so it uses the neutral ink scale (DESIGN.md §5), never status colours.
const STYLE: Record<Priority, string> = {
  high: "border border-ink bg-ink text-white",
  medium: "border border-ink text-ink",
  low: "border border-line text-ink-muted",
};

const SHORT: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };

/** "High priority", or "2 High" with a count, or "High" when short. */
export function PriorityBadge({ priority, count, short = false }: { priority: Priority; count?: number; short?: boolean }) {
  const text = count !== undefined ? `${count} ${SHORT[priority]}` : short ? SHORT[priority] : PRIORITY_LABEL[priority];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLE[priority]}`}>
      {text}
    </span>
  );
}
