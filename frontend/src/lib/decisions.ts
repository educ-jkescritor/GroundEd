import { useEffect, useState } from "react";

/** A faculty decision on one finding. Nothing counts as "applied" without one of these. */
export type Decision =
  | { kind: "reviewed" }
  | { kind: "upgrade_accepted"; target: string }
  | { kind: "draft_approved"; text: string };

export type Decisions = Record<string, Decision>;

const key = (analysisId: string) => `grounded:decisions:${analysisId}`;

function load(analysisId: string): Decisions {
  try {
    return JSON.parse(localStorage.getItem(key(analysisId)) ?? "{}");
  } catch {
    return {};
  }
}

/** Decisions per analysis, persisted in this browser only (MVP). */
export function useDecisions(analysisId: string | undefined) {
  const [decisions, setDecisions] = useState<Decisions>({});

  useEffect(() => {
    if (analysisId) setDecisions(load(analysisId));
  }, [analysisId]);

  function update(next: Decisions) {
    setDecisions(next);
    if (!analysisId) return;
    try {
      localStorage.setItem(key(analysisId), JSON.stringify(next));
    } catch {
      /* storage unavailable: decisions still work for this session */
    }
  }

  return {
    decisions,
    decide: (findingId: string, d: Decision) => update({ ...decisions, [findingId]: d }),
    undo: (findingId: string) => {
      const next = { ...decisions };
      delete next[findingId];
      update(next);
    },
  };
}

export const DECISION_LABEL: Record<Decision["kind"], string> = {
  reviewed: "Reviewed",
  upgrade_accepted: "Upgrade accepted",
  draft_approved: "Draft approved",
};
