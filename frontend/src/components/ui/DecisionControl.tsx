import { useEffect, useId, useState } from "react";
import { Check, Undo2 } from "lucide-react";
import { DECISION_DONE, DECISION_LABEL, type Decision, type DecisionKind } from "../../lib/decisions";
import { Button } from "./Button";

const KINDS: DecisionKind[] = ["update", "keep", "dismiss"];

interface Props {
  decision: Decision | undefined;
  onSave: (d: Decision) => void;
  onUndo: () => void;
  /** Extra data merged into an "update" decision (accepted upgrade, approved draft). */
  updateExtras?: Pick<Decision, "target" | "text">;
  compact?: boolean;
}

/** Update / Keep intentionally / Dismiss + optional reason + undo (DESIGN.md §10). */
export function DecisionControl({ decision, onSave, onUndo, updateExtras, compact = false }: Props) {
  const id = useId();
  const [kind, setKind] = useState<DecisionKind | null>(decision?.kind ?? null);
  const [reason, setReason] = useState(decision?.reason ?? "");

  useEffect(() => {
    setKind(decision?.kind ?? null);
    setReason(decision?.reason ?? "");
  }, [decision]);

  if (decision) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] bg-sky px-3 py-2 text-sm text-ink">
        <Check size={16} className="text-lapis-deep" aria-hidden />
        <span>
          <strong>{DECISION_DONE[decision.kind]}</strong>
          {decision.target && <> · {decision.target}</>}
          {decision.reason && <span className="text-ink-muted"> · “{decision.reason}”</span>}
        </span>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onUndo}>
          <Undo2 size={14} aria-hidden /> Undo
        </Button>
      </div>
    );
  }

  return (
    <fieldset className="space-y-3">
      <legend className={compact ? "sr-only" : "mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-ink-subtle"}>
        Your decision
      </legend>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`inline-flex min-h-9 items-center gap-2 rounded-[var(--radius-control)] border px-3 text-sm font-semibold transition-colors ${
              kind === k ? "border-lapis bg-sky text-lapis-deep" : "border-line bg-surface text-ink hover:border-ink/40"
            }`}
          >
            <span
              aria-hidden
              className={`h-3 w-3 rounded-full border-2 ${kind === k ? "border-[4px] border-lapis" : "border-ink-subtle"}`}
            />
            {DECISION_LABEL[k]}
          </button>
        ))}
      </div>
      {kind && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`${id}-reason`} className="sr-only">Why? (optional)</label>
          <input
            id={`${id}-reason`}
            className="min-w-0 flex-1 text-sm"
            placeholder="Why? (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => onSave({ kind, reason: reason.trim() || undefined, ...(kind === "update" ? updateExtras : {}) })}
          >
            Save decision
          </Button>
        </div>
      )}
    </fieldset>
  );
}
