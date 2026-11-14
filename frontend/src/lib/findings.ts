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
  code: "Used in code students write",
  explained: "Explained in the module",
  listed: "Only listed",
};

/** "Used in code students write · hands-on · pages 4, 6" (whatever the backend provides). */
export function usageLine(f: Finding): string {
  return [f.usage && USAGE_LABEL[f.usage], f.hands_on && "on a lab or exercise page", pagesLabel(f)]
    .filter(Boolean)
    .join(" · ");
}

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

export type Tone = Priority | "unverified";

/** The finding's colour tone: its priority, or "unverified" when there's no source (never scored). */
export function toneOf(f: Finding): Tone {
  return priorityOf(f.score) ?? "unverified";
}

/** Highlight styles on the document, per tone (same red/amber/green as the priority tags). */
export const TONE_HIGHLIGHT: Record<Tone, string> = {
  high: "bg-high/15 decoration-high",
  medium: "bg-medium/15 decoration-medium",
  low: "bg-low/15 decoration-low",
  unverified: "bg-unverified/10 decoration-unverified",
};

/** Overlay boxes drawn on the PDF, per tone. */
export const TONE_BOX: Record<Tone, string> = {
  high: "bg-high/20 border-high",
  medium: "bg-medium/20 border-medium",
  low: "bg-low/20 border-low",
  unverified: "bg-unverified/15 border-unverified",
};

const yearOf = (iso?: string | null) => (iso ? new Date(iso).getFullYear() : null);

/**
 * One plain-language sentence for the collapsed card: why it matters + how the module uses it.
 * e.g. "No longer supported since 2015. Students write it in lab code."
 */
export function verdict(f: Finding): string {
  const y = yearOf(f.lifecycle?.eol_date);
  const why =
    f.status === "eol" ? (y ? `No longer supported since ${y}.` : "No longer supported.")
    : f.status === "nearing_eol" ? (f.lifecycle?.eol_date ? `Support ends ${formatDate(f.lifecycle.eol_date)}.` : "Support is ending soon.")
    : f.status === "less_used" ? "Still supported, but used less in industry."
    : f.status === "supported" ? "Currently supported."
    : "No trusted source found, so GroundEd doesn't guess.";
  const how =
    f.usage === "code" ? (f.hands_on ? " Students write it in lab code." : " Students write it in code.")
    : f.usage === "explained" ? " Explained in the module."
    : f.usage === "listed" ? " Only listed." : "";
  return why + how;
}
