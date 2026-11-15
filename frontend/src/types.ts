// Mirrors backend/app/models.py. Change both (and docs/api.md) together.

// "less_used" = still supported but declining in industry (separate claim type, never "end-of-life").
export type FindingStatus = "eol" | "nearing_eol" | "less_used" | "supported" | "unverified";
export type ItemKind = "tool" | "language" | "framework" | "practice" | "topic";
// How the module uses the item (backend signals.teaching_depth): in code students write > explained > only listed.
export type Usage = "code" | "explained" | "listed";

export interface Citation {
  page: number; // 1-based
  snippet: string; // verbatim from the syllabus page
  bbox: [number, number, number, number] | null;
}

export interface Lifecycle {
  product: string; // endoflife.date slug
  cycle: string | null;
  eol_date: string | null; // ISO date
  latest_cycle: string | null;
  source_url: string;
  source_name?: string | null; // who published the fact, e.g. "The PHP Group — Removed extensions" or "endoflife.date"
  source_quote?: string | null; // the exact sentence from the source that proves it
}

export interface ScorePart {
  key: string;
  label: string;
  points: number;
  max: number;
  reason: string;
}

export type Priority = "high" | "medium" | "low";

export interface Score {
  total: number;
  max: number;
  // High >= 80, Medium >= 50, else Low (docs/design-brief.md §5.2). Optional until the backend sends it;
  // the frontend falls back to the same thresholds in lib/priority.ts.
  priority?: Priority;
  breakdown: ScorePart[];
}

export interface Upgrade {
  target_cycle: string;
  source_url: string;
}

export interface Finding {
  id: string;
  technology: string;
  version: string | null;
  status: FindingStatus;
  citations: Citation[];
  lifecycle: Lifecycle | null; // null => unverified
  score: Score | null;
  upgrade: Upgrade | null;
  kind?: ItemKind;
  usage?: Usage;
  hands_on?: boolean | null; // appears on a lab / exercise / activity page
  passages?: SourcePassage[] | null; // supporting passages from the source library
}

/** A passage from GroundEd's source library: context for the fact, or what to use instead. */
export interface SourcePassage {
  role: "fact" | "replacement";
  doc_id: string;
  title: string;
  publisher: string;
  url: string;
  heading: string;
  text: string;
  fetched_at: string;
  license: string;
  contains_fact_quote: boolean;
}

/** The report's "receipt": same file + same versions = same result. Set by code, never by AI. */
export interface Provenance {
  file_sha256: string;
  registry_version: string;
  pipeline_version: string;
  detector: string;
  rules_version?: string | null;
  library_version?: string | null;
  eol_data: Record<string, string>;
  analysis_date: string;
}

export interface PageText {
  number: number; // 1-based
  text: string; // extracted page text; citations' snippets appear in it verbatim
}

export interface Analysis {
  id: string;
  created_at: string;
  source: { kind: "upload" | "sample"; filename: string; pages: number };
  summary: Partial<Record<FindingStatus, number>>;
  findings: Finding[];
  pages?: PageText[]; // module text per page, for the side-by-side Report (optional)
  provenance?: Provenance | null;
  // "not_covered": outside technology courses (e.g. GED); no findings by design.
  coverage?: "covered" | "not_covered";
}

export interface Draft {
  finding_id: string;
  text: string;
  label: "ai_suggestion";
  disclaimer: string;
  model: string;
}

export interface Sample {
  id: string;
  title: string;
  description: string;
}

export interface FeedbackIn {
  role: string;
  country: string;
  institution?: string;
  rating: number; // 1-5
  comments?: string;
  would_use?: "yes" | "maybe" | "no";
  consent_to_quote?: boolean;
  analysis_id?: string;
}
