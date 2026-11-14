// Mirrors backend/app/models.py. Change both (and docs/api.md) together.

export type FindingStatus = "eol" | "nearing_eol" | "supported" | "unverified";

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
}

export interface ScorePart {
  key: string;
  label: string;
  points: number;
  max: number;
  reason: string;
}

export interface Score {
  total: number;
  max: number;
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
}

export interface Analysis {
  id: string;
  created_at: string;
  source: { kind: "upload" | "sample"; filename: string; pages: number };
  summary: Record<FindingStatus, number>;
  findings: Finding[];
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
