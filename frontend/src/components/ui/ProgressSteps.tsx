import { Check, Loader2, X } from "lucide-react";

export type StepState = "done" | "current" | "waiting" | "failed";

/** Named analysis steps with their state (DESIGN.md §10). Announced politely to screen readers. */
export function ProgressSteps({ steps }: { steps: { label: string; detail?: string; state: StepState }[] }) {
  return (
    <ol className="space-y-3" aria-live="polite">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-3">
          <span
            aria-hidden
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              s.state === "done"
                ? "bg-supported text-white"
                : s.state === "current"
                  ? "text-lapis"
                  : s.state === "failed"
                    ? "bg-eol text-white"
                    : "border-2 border-line"
            }`}
          >
            {s.state === "done" && <Check size={14} strokeWidth={3} />}
            {s.state === "current" && <Loader2 size={20} className="animate-spin" />}
            {s.state === "failed" && <X size={14} strokeWidth={3} />}
          </span>
          <span className={s.state === "waiting" ? "text-ink-subtle" : "text-ink"}>
            <span className={s.state === "current" ? "font-semibold" : ""}>{s.label}</span>
            {s.detail && <span className="text-ink-subtle"> · {s.detail}</span>}
            <span className="sr-only"> ({s.state})</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
