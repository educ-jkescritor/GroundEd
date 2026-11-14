import { CircleCheck, CircleHelp, Clock, OctagonAlert, type LucideIcon } from "lucide-react";
import type { FindingStatus } from "../../types";

export const STATUS_META: Record<FindingStatus, { label: string; icon: LucideIcon; text: string; bg: string }> = {
  eol: { label: "End-of-life", icon: OctagonAlert, text: "text-eol", bg: "bg-eol-soft" },
  nearing_eol: { label: "Nearing end-of-life", icon: Clock, text: "text-nearing", bg: "bg-nearing-soft" },
  supported: { label: "Supported", icon: CircleCheck, text: "text-supported", bg: "bg-supported-soft" },
  unverified: { label: "Unverified", icon: CircleHelp, text: "text-unverified", bg: "bg-unverified-soft" },
};

export function StatusBadge({ status }: { status: FindingStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.bg} ${meta.text}`}>
      <Icon size={14} aria-hidden />
      {meta.label}
    </span>
  );
}
