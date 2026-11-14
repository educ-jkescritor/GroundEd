import type { Analysis, Finding, ItemKind, Priority, Usage } from "../types";
import { formatDate } from "./format";
import { priorityOf } from "./priority";

export const KIND_LABEL: Record<ItemKind, string> = {
  tool: "Tool",
  language: "Language",
  framework: "Framework",
  practice: "Practice",
  topic: "Topic",
};

export const USAGE_LABEL: Record<Usage, string> = {
  lab: "Taught in labs",
  activity: "In an activity",
  mentioned: "Mentioned",
};

/** Findings that may warrant review (everything except "supported"). */
export const needsReview = (f: Finding) => f.status !== "supported";

export function pagesOf(f: Finding): number[] {
  return [...new Set(f.citations.map((c) => c.page))].sort((a, b) => a - b);
}

export function pagesLabel(f: Finding): string {
  const p = pagesOf(f);
  return p.length === 0 ? "" : `${p.length > 1 ? "pages" : "page"} ${p.join(", ")}`;
}

/** One-line advisory summary per DESIGN.md microcopy. */
export function summaryLine(f: Finding): string {
  const eol = f.lifecycle?.eol_date;
  switch (f.status) {
    case "eol":
      return eol ? `No longer supported since ${formatDate(eol)}; may warrant review.` : "No longer supported; may warrant review.";
    case "nearing_eol":
      return eol ? `Support ends ${formatDate(eol)}; may warrant review.` : "Support ends soon; may warrant review.";
    case "less_used":
      return "Still supported, but used less in industry.";
    case "supported":
      return "Currently supported. No action needed.";
    default:
      return "No trusted source found. Please check this one yourself.";
  }
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** Ranked order: priority, then score; unverified after scored items; supported last. */
export function rankFindings(findings: Finding[]): Finding[] {
  const rank = (f: Finding) => {
    if (f.status === "supported") return 9;
    const p = priorityOf(f.score);
    return p ? PRIORITY_RANK[p] : 5;
  };
  return [...findings].sort((a, b) => rank(a) - rank(b) || (b.score?.total ?? -1) - (a.score?.total ?? -1));
}

export function priorityCounts(a: Analysis): Record<Priority, number> {
  const counts: Record<Priority, number> = { high: 0, medium: 0, low: 0 };
  for (const f of a.findings) {
    if (!needsReview(f)) continue;
    const p = priorityOf(f.score);
    if (p) counts[p] += 1;
  }
  return counts;
}

export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
