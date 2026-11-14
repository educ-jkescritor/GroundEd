import type { Analysis, Draft, FeedbackIn, Sample } from "./types";

// Same-origin in production (Caddy proxies /api); Vite proxies /api in dev.
const BASE = import.meta.env.VITE_API_BASE ?? "";

/** Error with the HTTP status, so pages can show specific messages (e.g. 429 = busy). status 0 = network failure. */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError("Can't reach GroundEd. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = typeof body.detail === "string" ? body.detail : `Request failed (${res.status}).`;
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

/** User-facing message for any error, per DESIGN.md microcopy. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 429) {
    return "GroundEd is busy right now. Try again in a minute, or explore a sample syllabus.";
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}

export const api = {
  samples: () => request<Sample[]>("/api/samples"),

  analyzeFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Analysis>("/api/analyze", { method: "POST", body: form });
  },

  analyzeSample: (sampleId: string) => {
    const form = new FormData();
    form.append("sample_id", sampleId);
    return request<Analysis>("/api/analyze", { method: "POST", body: form });
  },

  analysis: (id: string) => request<Analysis>(`/api/analysis/${encodeURIComponent(id)}`),

  draft: (analysisId: string, findingId: string) =>
    request<Draft>(
      `/api/analysis/${encodeURIComponent(analysisId)}/findings/${encodeURIComponent(findingId)}/draft`,
      { method: "POST" },
    ),

  feedback: (data: FeedbackIn) =>
    request<{ ok: boolean; id: number }>("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};
