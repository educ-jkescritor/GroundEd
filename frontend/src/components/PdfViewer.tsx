import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Minus, MoveHorizontal, Plus } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { Finding } from "../types";
import { TONE_BOX, toneOf } from "../lib/findings";
import { STATUS_META } from "./ui/StatusBadge";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfSource = { url: string } | { file: File };

interface Box {
  finding: Finding;
  rect: [number, number, number, number]; // PDF points, top-left origin (PyMuPDF)
}

interface Props {
  source: PdfSource;
  findings: Finding[];
  selectedId: string | null;
  /** Scroll to the selected finding (when it was selected in the findings list). */
  scrollToSelected: boolean;
  onSelect: (id: string) => void;
  /** Called if the PDF can't be loaded, so the page can fall back to the text view. */
  onError: (message: string) => void;
}

const GAP = 16; // px between pages
const PAD = 20; // px around the pages

/**
 * The real module, rendered with PDF.js in its own scroll pane (DESIGN.md §7: Report).
 * Pages render lazily as they come near the viewport; finding boxes come from the backend's citation bboxes.
 */
export default function PdfViewer({ source, findings, selectedId, scrollToSelected, onSelect, onError }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<{ w: number; h: number }[]>([]); // page sizes in points at scale 1
  const [width, setWidth] = useState(0); // available width of the pane
  const [zoom, setZoom] = useState(1); // 1 = fit width
  const [current, setCurrent] = useState(1);

  // Load the document and every page's size (cheap; needed to lay out the scroll area before rendering).
  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    (async () => {
      try {
        const task = "url" in source ? pdfjs.getDocument({ url: source.url }) : pdfjs.getDocument({ data: new Uint8Array(await source.file.arrayBuffer()) });
        loaded = await task.promise;
        const s: { w: number; h: number }[] = [];
        for (let i = 1; i <= loaded.numPages; i++) {
          const vp = (await loaded.getPage(i)).getViewport({ scale: 1 });
          s.push({ w: vp.width, h: vp.height });
        }
        if (!cancelled) {
          setDoc(loaded);
          setSizes(s);
        }
      } catch (e) {
        if (!cancelled) onError(e instanceof Error ? e.message : "The PDF could not be displayed.");
      }
    })();
    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track the pane's width for "fit width".
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const maxW = sizes.reduce((m, s) => Math.max(m, s.w), 0) || 612;
  const scale = Math.max(0.3, ((width - PAD * 2) / maxW) * zoom);

  // Page top offsets inside the scroll area.
  const offsets = useMemo(() => {
    const o: number[] = [];
    let y = PAD;
    for (const s of sizes) {
      o.push(y);
      y += s.h * scale + GAP;
    }
    return o;
  }, [sizes, scale]);

  const boxesByPage = useMemo(() => {
    const m = new Map<number, Box[]>();
    for (const f of findings) {
      for (const c of f.citations) {
        if (!c.bbox || c.bbox.length !== 4) continue;
        const list = m.get(c.page) ?? [];
        list.push({ finding: f, rect: c.bbox as Box["rect"] });
        m.set(c.page, list);
      }
    }
    return m;
  }, [findings]);

  const scrollToPage = useCallback(
    (page: number, y = 0) => {
      const el = scroller.current;
      if (!el || !offsets.length) return;
      const i = Math.min(Math.max(page, 1), offsets.length) - 1;
      el.scrollTo({ top: Math.max(0, offsets[i] + y * scale - 120), behavior: "smooth" });
    },
    [offsets, scale],
  );

  // Selecting a finding in the list scrolls this pane (only) to its first box, or its first page.
  useEffect(() => {
    if (!selectedId || !scrollToSelected || !offsets.length) return;
    const f = findings.find((x) => x.id === selectedId);
    const c = f?.citations.find((x) => x.bbox) ?? f?.citations[0];
    if (c) scrollToPage(c.page, c.bbox ? c.bbox[1] : 0);
  }, [selectedId, scrollToSelected, offsets.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Current page indicator.
  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const mid = el.scrollTop + el.clientHeight / 3;
    let p = 1;
    offsets.forEach((o, i) => {
      if (o <= mid) p = i + 1;
    });
    setCurrent(p);
  }

  const total = sizes.length;
  const btn = "flex h-8 w-8 items-center justify-center rounded-[8px] border border-line bg-surface text-ink hover:border-ink/40 disabled:opacity-40";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#e9ecf1]">
      {/* Viewer toolbar */}
      <div className="flex items-center gap-2 border-b border-line bg-panel px-3 py-2 text-sm text-ink-muted">
        <button type="button" className={btn} onClick={() => scrollToPage(current - 1)} disabled={current <= 1} aria-label="Previous page"><ChevronLeft size={16} /></button>
        <span className="tabular-nums" aria-live="polite">Page {current} of {total || "…"}</span>
        <button type="button" className={btn} onClick={() => scrollToPage(current + 1)} disabled={current >= total} aria-label="Next page"><ChevronRight size={16} /></button>
        <span className="flex-1" />
        <button type="button" className={btn} onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))} aria-label="Zoom out"><Minus size={16} /></button>
        <span className="w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" className={btn} onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))} aria-label="Zoom in"><Plus size={16} /></button>
        <button type="button" className={`${btn} w-auto gap-1.5 px-2.5 font-semibold`} onClick={() => setZoom(1)} title="Fit to width">
          <MoveHorizontal size={15} aria-hidden /> Fit
        </button>
      </div>

      {/* Pages: this pane scrolls on its own */}
      <div ref={scroller} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-auto" tabIndex={0} aria-label="Module document">
        {!doc ? (
          <p className="flex items-center justify-center gap-2 p-10 text-ink-muted"><Loader2 size={18} className="animate-spin" aria-hidden /> Opening the module…</p>
        ) : (
          <div style={{ height: (offsets[total - 1] ?? 0) + (sizes[total - 1]?.h ?? 0) * scale + PAD, minWidth: maxW * scale + PAD * 2 }} className="relative">
            {sizes.map((s, i) => (
              <PdfPage
                key={i}
                doc={doc}
                page={i + 1}
                top={offsets[i]}
                width={s.w * scale}
                height={s.h * scale}
                scale={scale}
                root={scroller.current}
                boxes={boxesByPage.get(i + 1) ?? []}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PdfPage({ doc, page, top, width, height, scale, root, boxes, selectedId, onSelect }: {
  doc: PDFDocumentProxy; page: number; top: number; width: number; height: number; scale: number;
  root: HTMLElement | null; boxes: Box[]; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);

  // Render only when the page is near the viewport.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { root, rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    if (!visible || !canvas.current) return;
    let task: RenderTask | null = null;
    let cancelled = false;
    (async () => {
      const p = await doc.getPage(page);
      if (cancelled || !canvas.current) return;
      const dpr = window.devicePixelRatio || 1;
      const vp = p.getViewport({ scale: scale * dpr });
      const c = canvas.current;
      c.width = Math.floor(vp.width);
      c.height = Math.floor(vp.height);
      task = p.render({ canvasContext: c.getContext("2d")!, viewport: vp });
      await task.promise.catch(() => undefined); // cancelled renders reject; ignore
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, doc, page, scale]);

  return (
    <div ref={wrap} className="absolute bg-white shadow-[0_2px_8px_rgb(0_0_0/0.12)]" style={{ top, left: "50%", width, height, transform: "translateX(-50%)" }} aria-label={`Page ${page}`}>
      <canvas ref={canvas} style={{ width, height }} className="block" aria-hidden />
      {boxes.map((b, i) => {
        const [x0, y0, x1, y1] = b.rect;
        const sel = b.finding.id === selectedId;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(b.finding.id)}
            title={`${b.finding.technology}: ${STATUS_META[b.finding.status].label}`}
            aria-label={`Finding on page ${page}: ${b.finding.technology}`}
            aria-pressed={sel}
            className={`absolute rounded-[3px] border-b-2 mix-blend-multiply ${TONE_BOX[toneOf(b.finding)]} ${sel ? "outline-2 outline-offset-2 outline-lapis" : "hover:brightness-90"}`}
            style={{ left: x0 * scale - 2, top: y0 * scale - 2, width: (x1 - x0) * scale + 4, height: (y1 - y0) * scale + 4 }}
          />
        );
      })}
    </div>
  );
}
