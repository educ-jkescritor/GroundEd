import type { Analysis, Draft, FeedbackIn, Sample } from "./types";

// Same-origin in production (Caddy proxies /api); Vite proxies /api in dev.
const BASE = import.meta.env.VITE_API_BASE ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
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
