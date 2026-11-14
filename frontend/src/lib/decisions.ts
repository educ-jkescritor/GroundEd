import { useCallback, useEffect, useState } from "react";

/**
 * The user's decision on a finding (DESIGN.md §3). Nothing counts as changed without one.
 * - update: agrees; optionally accepted a sourced upgrade (`target`) or approved AI-drafted wording (`text`)
 * - keep: keeps it intentionally (taught on purpose)
 * - dismiss: not outdated / incorrect
 */
export type DecisionKind = "update" | "keep" | "dismiss";

export interface Decision {
  kind: DecisionKind;
  reason?: string;
  target?: string; // accepted upgrade
  text?: string; // approved (edited) AI draft
}

export type Decisions = Record<string, Decision>;

export const DECISION_LABEL: Record<DecisionKind, string> = {
  update: "Update",
  keep: "Keep intentionally",
  dismiss: "Dismiss",
};

/** Past-tense chip shown on findings. */
export const DECISION_DONE: Record<DecisionKind, string> = {
  update: "Updated",
  keep: "Kept",
  dismiss: "Dismissed",
};

const key = (analysisId: string) => `grounded:decisions:${analysisId}`;

function load(analysisId: string): Decisions {
  try {
    return JSON.parse(localStorage.getItem(key(analysisId)) ?? "{}");
  } catch {
    return {};
  }
}

/** Decisions per report, stored in this browser only (hackathon scope). */
export function useDecisions(analysisId: string | undefined) {
  const [decisions, setDecisions] = useState<Decisions>({});

  useEffect(() => {
    if (analysisId) setDecisions(load(analysisId));
  }, [analysisId]);

  const save = useCallback(
    (next: Decisions) => {
      setDecisions(next);
      if (!analysisId) return;
      try {
        localStorage.setItem(key(analysisId), JSON.stringify(next));
      } catch {
        /* storage unavailable: decisions still work for this session */
      }
    },
    [analysisId],
  );

  return {
    decisions,
    decide: (findingId: string, d: Decision) => save({ ...decisions, [findingId]: d }),
    undo: (findingId: string) => {
      const next = { ...decisions };
      delete next[findingId];
      save(next);
    },
  };
}
