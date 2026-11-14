import type { Priority, Score } from "../types";

/** Thresholds from docs/design-brief.md §5.2 (to be refined). Used only if the backend doesn't send `priority`. */
export const PRIORITY_THRESHOLDS = { high: 80, medium: 50 } as const;

export function priorityOf(score: Score | null | undefined): Priority | null {
  if (!score) return null;
  if (score.priority) return score.priority; // the backend is the source of truth when it provides one
  if (score.total >= PRIORITY_THRESHOLDS.high) return "high";
  if (score.total >= PRIORITY_THRESHOLDS.medium) return "medium";
  return "low";
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};
