import type { Priority } from "../../types";
import { PRIORITY_LABEL } from "../../lib/priority";

// Priority is a ranking, not a status, so it uses the neutral ink scale (DESIGN.md §3), never status colours.
const STYLE: Record<Priority, string> = {
  high: "bg-ink text-white",
  medium: "border border-ink/40 text-ink",
  low: "border border-line text-ink-muted",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[priority]}`}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
