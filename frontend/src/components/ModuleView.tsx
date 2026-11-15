import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { FileText } from "lucide-react";
import type { Finding, PageText } from "../types";
import { STATUS_META } from "./ui/StatusBadge";
import { TONE_HIGHLIGHT, toneOf } from "../lib/findings";

interface Mark {
  start: number;
  end: number;
  finding: Finding;
}

const QUOTES: Record<string, string> = { "“": '"', "”": '"', "‘": "'", "’": "'" };

/** Collapse whitespace, unify quotes, lowercase; `map[i]` = index in the original text of normalised char i. */
function normalise(text: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  let lastSpace = true;
  for (let i = 0; i < text.length; i++) {
    const ch = QUOTES[text[i]] ?? text[i];
    if (/\s/.test(ch)) {
      if (!lastSpace) {
        norm += " ";
        map.push(i);
      }
      lastSpace = true;
    } else {
      norm += ch.toLowerCase();
      map.push(i);
      lastSpace = false;
    }
  }
  return { norm, map };
}

/** Find each citation's snippet in its page text, ignoring differences in spacing, line breaks and quote marks. */
function marksForPage(page: PageText, findings: Finding[]): Mark[] {
  const { norm, map } = normalise(page.text);
  const marks: Mark[] = [];
  for (const f of findings) {
    for (const c of f.citations) {
      if (c.page !== page.number) continue;
      const needle = normalise(c.snippet).norm.trim();
      const at = needle ? norm.indexOf(needle) : -1;
      if (at >= 0) marks.push({ start: map[at], end: map[at + needle.length - 1] + 1, finding: f });
    }
  }
  // Drop overlaps (keep the earliest) so the text renders cleanly.
  marks.sort((a, b) => a.start - b.start);
  const kept: Mark[] = [];
  for (const m of marks) if (!kept.length || m.start >= kept[kept.length - 1].end) kept.push(m);
  return kept;
}

interface Props {
  pages: PageText[];
  findings: Finding[];
  selectedId: string | null;
  /** Scroll to the selected finding's highlight (when it was selected from the panel). */
  scrollToSelected: boolean;
  /** Changes on every "Show in document" request, so a repeat click scrolls again. */
  focusNonce?: number;
  onSelect: (id: string) => void;
}

/** The module, page by page, with each finding highlighted where it appears (DESIGN.md §7, §9). */
export default function ModuleView({ pages, findings, selectedId, scrollToSelected, focusNonce, onSelect }: Props) {
  const firstMark = useRef<Record<string, HTMLButtonElement | null>>({});
  const pageMarks = useMemo(() => pages.map((p) => ({ page: p, marks: marksForPage(p, findings) })), [pages, findings]);

  // Selecting a finding in the panel scrolls the module to its first highlight.
  useEffect(() => {
    if (selectedId && scrollToSelected) firstMark.current[selectedId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedId, scrollToSelected, focusNonce]);

  const seen = new Set<string>();

  /** Render text[from, to) with highlight buttons for the marks inside it. */
  function renderRange(text: string, from: number, to: number, marks: Mark[]): ReactNode[] {
    const out: ReactNode[] = [];
    let cursor = from;
    for (const m of marks) {
      if (m.start < from || m.end > to) continue;
      if (m.start > cursor) out.push(text.slice(cursor, m.start));
      const meta = STATUS_META[m.finding.status];
      const selected = m.finding.id === selectedId;
      const isFirst = !seen.has(m.finding.id);
      seen.add(m.finding.id);
      out.push(
        <button
          key={`${m.finding.id}-${m.start}`}
          type="button"
          ref={isFirst ? (el) => { firstMark.current[m.finding.id] = el; } : undefined}
          onClick={() => onSelect(m.finding.id)}
          title={`${m.finding.technology}: ${meta.label}`}
          aria-pressed={selected}
          aria-label={`${text.slice(m.start, m.end)}. Finding: ${m.finding.technology}, ${meta.label}`}
          className={`inline cursor-pointer rounded-[3px] px-0.5 text-left underline decoration-2 underline-offset-[3px] ${TONE_HIGHLIGHT[toneOf(m.finding)]} ${
            selected ? "outline-2 outline-offset-1" : "hover:brightness-95"
          }`}
        >
          {text.slice(m.start, m.end)}
        </button>,
      );
      cursor = m.end;
    }
    if (cursor < to) out.push(text.slice(cursor, to));
    return out;
  }

  return (
    <div className="space-y-4">
      {pageMarks.map(({ page, marks }) => {
        const nl = page.text.indexOf("\n");
        // Treat the first line as a heading when it has no highlights in it.
        const heading = nl > 0 && !marks.some((m) => m.start < nl) ? page.text.slice(0, nl) : null;
        const bodyStart = heading ? nl + 1 : 0;
        return (
          <article
            key={page.number}
            aria-label={`Page ${page.number}`}
            className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)]"
          >
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-ink-subtle">
              <FileText size={13} aria-hidden /> Page {page.number}
            </p>
            {heading && <h3 className="mb-2 text-base">{heading}</h3>}
            <p className="whitespace-pre-line leading-relaxed text-ink">
              {renderRange(page.text, bodyStart, page.text.length, marks)}
            </p>
          </article>
        );
      })}
    </div>
  );
}
