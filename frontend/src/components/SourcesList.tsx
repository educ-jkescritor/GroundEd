import type { Analysis } from "../types";
import { formatDate } from "../lib/format";
import { sourceHost } from "../lib/findings";
import { SourceLink } from "./ui/SourceLink";

interface SourceRow {
  url: string;
  title: string;
  publisher: string;
  kind: string; // in words, e.g. "Support data"
  saved?: string;
  backs: Set<string>;
}

/** Type of source in words (DESIGN.md: tiers). Lifecycle records = support data; library documents = official docs. */
const kindOf = (url: string) => (sourceHost(url).includes("endoflife.date") ? "Support data" : "Official documentation");

/** Every source the report relies on, like a bibliography, with the findings each one backs. */
export default function SourcesList({ analysis }: { analysis: Analysis }) {
  const rows = new Map<string, SourceRow>();
  const add = (url: string, title: string, publisher: string, finding: string, saved?: string) => {
    const r = rows.get(url) ?? { url, title, publisher, kind: kindOf(url), saved, backs: new Set<string>() };
    r.backs.add(finding);
    if (!r.saved && saved) r.saved = saved;
    rows.set(url, r);
  };

  for (const f of analysis.findings) {
    const name = f.version ? `${f.technology} ${f.version}` : f.technology;
    if (f.lifecycle) {
      const lc = f.lifecycle;
      const [publisher, ...rest] = (lc.source_name ?? sourceHost(lc.source_url)).split(" — ");
      // endoflife.date records are per product, so name them by product ("Lifecycle record: php").
      const title = rest.join(" — ") || (sourceHost(lc.source_url).includes("endoflife.date") ? `Lifecycle record: ${lc.product}` : publisher);
      add(lc.source_url, title, publisher, name);
    }
    for (const p of f.passages ?? []) add(p.url, p.title, p.publisher, name, p.fetched_at);
  }

  const list = [...rows.values()].sort((a, b) => b.backs.size - a.backs.size);
  if (list.length === 0) {
    return <p className="rounded-[var(--radius-card)] bg-panel p-4 text-sm text-ink-muted">No sources: this report has no verified findings.</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {list.map((r) => (
          <li key={r.url} className="space-y-1.5 rounded-[var(--radius-card)] border border-line p-4">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 font-semibold leading-snug">{r.title}</p>
              <span className="shrink-0 rounded-full bg-panel px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-muted">{r.kind}</span>
            </div>
            <p className="text-xs text-ink-subtle">
              {r.publisher}
              {r.saved && <> · saved {formatDate(r.saved)}</>}
            </p>
            <p className="text-xs text-ink-subtle">Backs: {[...r.backs].join(" · ")}</p>
            <SourceLink href={r.url}>{sourceHost(r.url)}</SourceLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
