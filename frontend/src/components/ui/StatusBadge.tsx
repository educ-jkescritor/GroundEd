import { CircleCheck, CircleHelp, Clock, OctagonAlert, TrendingDown, type LucideIcon } from "lucide-react";
import type { FindingStatus } from "../../types";

/**
 * Status (end-of-life, supported…). Neutral by design (DESIGN.md §5): red/amber/green belong to PRIORITY only,
 * so a colour never means two things. Status is told by its icon and words.
 */
export const STATUS_META: Record<FindingStatus, { label: string; icon: LucideIcon }> = {
  eol: { label: "End-of-life", icon: OctagonAlert },
  nearing_eol: { label: "Nearing end-of-life", icon: Clock },
  less_used: { label: "Less used in industry", icon: TrendingDown },
  supported: { label: "Supported", icon: CircleCheck },
  unverified: { label: "Unverified", icon: CircleHelp },
};

export function StatusBadge({ status, compact = false }: { status: FindingStatus; compact?: boolean }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface font-semibold text-ink-muted ${
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <Icon size={compact ? 12 : 14} aria-hidden />
      {meta.label}
    </span>
  );
}
