import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

/** Wraps ANY AI-generated content. Mandatory per DESIGN.md: sourced facts and AI text must look different. */
export function AiSuggestion({ children, label = "AI suggestion: not sourced. Review and edit before using." }: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border-2 border-dashed border-ai/40 bg-ai-soft p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ai">
        <Sparkles size={14} aria-hidden />
        {label}
      </p>
      {children}
    </div>
  );
}
