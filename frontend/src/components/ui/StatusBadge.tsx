import { CircleCheck, CircleHelp, Clock, OctagonAlert, TrendingDown, type LucideIcon } from "lucide-react";
import type { FindingStatus } from "../../types";

// DESIGN.md §5: fixed meaning, always icon + label, never colour alone.
export const STATUS_META: Record<FindingStatus, { label: string; icon: LucideIcon; text: string; bg: string; hl: string }> = {
  eol: { label: "End-of-life", icon: OctagonAlert, text: "text-eol", bg: "bg-eol-soft", hl: "bg-eol-soft decoration-eol" },
  nearing_eol: { label: "Nearing end-of-life", icon: Clock, text: "text-nearing", bg: "bg-nearing-soft", hl: "bg-nearing-soft decoration-nearing" },
  less_used: { label: "Less used in industry", icon: TrendingDown, text: "text-declining", bg: "bg-declining-soft", hl: "bg-declining-soft decoration-declining" },
  supported: { label: "Supported", icon: CircleCheck, text: "text-supported", bg: "bg-supported-soft", hl: "bg-supported-soft decoration-supported" },
  unverified: { label: "Unverified", icon: CircleHelp, text: "text-unverified", bg: "bg-unverified-soft", hl: "bg-unverified-soft decoration-unverified" },
};

export function StatusBadge({ status, compact = false }: { status: FindingStatus; compact?: boolean }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold ${meta.bg} ${meta.text} ${
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <Icon size={compact ? 12 : 14} aria-hidden />
      {meta.label}
    </span>
  );
}
