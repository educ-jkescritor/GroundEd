import { useEffect, useState } from "react";
import type { Analysis } from "../types";
import { needsReview } from "./findings";

/**
 * Browser-only report history and demo account (hackathon scope, docs/ux/information-architecture.md).
 * Nothing here is sent to a server.
 */
export interface ReportEntry {
  id: string;
  filename: string;
  created_at: string;
  findings: number; // findings that may warrant review
  sample: boolean;
}

const REPORTS_KEY = "grounded:reports";
const USER_KEY = "grounded:demo-user";
const EVENT = "grounded:storage";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function listReports(): ReportEntry[] {
  return read<ReportEntry[]>(REPORTS_KEY, []);
}

/** Saves a report to "My reports". Only when signed in: signed-out visitors' reports aren't kept. */
export function recordReport(a: Analysis) {
  if (!getDemoUser()) return;
  const entry: ReportEntry = {
    id: a.id,
    filename: a.source.filename,
    created_at: a.created_at,
    findings: a.findings.filter(needsReview).length,
    sample: a.source.kind === "sample",
  };
  write(REPORTS_KEY, [entry, ...listReports().filter((r) => r.id !== a.id)].slice(0, 50));
}

export interface DemoUser {
  name: string;
}

export const getDemoUser = () => read<DemoUser | null>(USER_KEY, null);
export const signInDemo = () => write(USER_KEY, { name: "Demo Faculty" } satisfies DemoUser);
/** Signing out also forgets the demo account's report list (it lives only in this browser). */
export const signOutDemo = () => {
  write(USER_KEY, null);
  write(REPORTS_KEY, null);
};

/** Re-render when history or the demo user changes (in this tab). */
export function useStored<T>(get: () => T): T {
  const [value, setValue] = useState(get);
  useEffect(() => {
    const update = () => setValue(get());
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [get]);
  return value;
}
