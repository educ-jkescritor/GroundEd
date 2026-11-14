import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Minus, MoveHorizontal, Plus } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { Finding } from "../types";
import { TONE_BOX, toneOf } from "../lib/findings";
import { PRIORITY_STYLE } from "./ui/PriorityBadge";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfSource = { url: string } | { file: File };

/** Where to scroll: a finding and which of its quotes. `nonce` changes on every request, so a repeat click re-scrolls. */
export interface Focus {
  id: string;
  cite: number;
  nonce: number;
}

interface Box {
  finding: Finding;
  cite: number;
  rect: [number, number, number, number]; // PDF points, top-left origin (PyMuPDF)
}

interface Props {
  source: PdfSource;
  findings: Finding[]; // ranked
  selectedId: string | null;
  focus: Focus | null;
  onSelect: (id: string) => void;
  onStep: (dir: -1 | 1) => void; // previous / next finding
  onError: (message: string) => void;
}

const GAP = 16;
const PAD = 20;

/**
 * The real module, rendered with PDF.js in its own scroll pane (DESIGN.md §7). Pages render lazily; finding boxes
 * come from the backend's citation bboxes; markers beside the scrollbar show where every finding is.
 */
export default function PdfViewer({ source, findings, selectedId, focus, onSelect, onStep, onError }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<{ w: number; h: number }[]>([]);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [current, setCurrent] = useState(1);
  const [trackH, setTrackH] = useState(0);

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

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth);
      setTrackH(el.clientHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const maxW = sizes.reduce((m, s) => Math.max(m, s.w), 0) || 612;
  const scale = Math.max(0.3, ((width - PAD * 2 - 14) / maxW) * zoom);

  const offsets = useMemo(() => {
    const o: number[] = [];
    let y = PAD;
    for (const s of sizes) {
      o.push(y);
      y += s.h * scale + GAP;
    }
    return o;
  }, [sizes, scale]);
  const totalH = offsets.length ? offsets[offsets.length - 1] + sizes[sizes.length - 1].h * scale + PAD : 1;

  const boxes = useMemo(() => {
    const all: Box[] = [];
    for (const f of findings) {
      f.citations.forEach((c, cite) => {
        if (c.bbox && c.bbox.length === 4) all.push({ finding: f, cite, rect: c.bbox as Box["rect"] });
      });
    }
    return all;
  }, [findings]);

  const scrollToY = useCallback((page: number, y = 0) => {
    const el = scroller.current;
    if (!el || !offsets.length) return;
    const i = Math.min(Math.max(page, 1), offsets.length) - 1;
    el.scrollTo({ top: Math.max(0, offsets[i] + y * scale - 140), behavior: "smooth" });
  }, [offsets, scale]);

  // Scroll to the requested quote (re-runs on every request thanks to `nonce`).
  useEffect(() => {
    if (!focus || !offsets.length) return;
    const f = findings.find((x) => x.id === focus.id);
    const c = f?.citations[focus.cite] ?? f?.citations[0];
    if (c) scrollToY(c.page, c.bbox ? c.bbox[1] : 0);
  }, [focus?.nonce, offsets.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const mid = el.scrollTop + el.clientHeight / 3;
    let p = 1;
    offsets.forEach((o, i) => { if (o <= mid) p = i + 1; });
    setCurrent(p);
  }

  const total = sizes.length;
  const findingIndex = findings.findIndex((f) => f.id === selectedId);
  const btn = "flex h-8 w-8 items-center justify-center rounded-[8px] border border-line bg-surface text-ink hover:border-ink/40 disabled:opacity-40";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#e9ecf1]">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2 text-sm text-ink-muted">
        {/* Finding navigation (J / K) */}
        <button type="button" className={btn} onClick={() => onStep(-1)} disabled={findings.length === 0} aria-label="Previous finding (K)" title="Previous finding (K)"><ChevronLeft size={16} /></button>
        <span className="font-semibold tabular-nums text-ink">
          Finding {findingIndex >= 0 ? findingIndex + 1 : "–"} of {findings.length}
        </span>
        <button type="button" className={btn} onClick={() => onStep(1)} disabled={findings.length === 0} aria-label="Next finding (J)" title="Next finding (J)"><ChevronRight size={16} /></button>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        <span className="tabular-nums" aria-live="polite">Page {current} of {total || "…"}</span>
        <span className="flex-1" />
        <button type="button" className={btn} onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))} aria-label="Zoom out"><Minus size={16} /></button>
        <span className="w-11 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" className={btn} onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))} aria-label="Zoom in"><Plus size={16} /></button>
        <button type="button" className={`${btn} w-auto gap-1.5 px-2.5 font-semibold`} onClick={() => setZoom(1)} title="Fit to width">
          <MoveHorizontal size={15} aria-hidden /> Fit
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={scroller} onScroll={onScroll} className="absolute inset-0 overflow-auto" tabIndex={0} aria-label="Module document">
          {!doc ? (
            <p className="flex items-center justify-center gap-2 p-10 text-ink-muted"><Loader2 size={18} className="animate-spin" aria-hidden /> Opening the module…</p>
          ) : (
            <div style={{ height: totalH, minWidth: maxW * scale + PAD * 2 }} className="relative">
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
                  boxes={boxes.filter((b) => b.finding.citations[b.cite].page === i + 1)}
                  selectedId={selectedId}
                  focus={focus}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Overview markers beside the scrollbar: where every finding is in the whole module */}
        {doc && trackH > 0 && (
          <div className="pointer-events-none absolute inset-y-0 right-[15px] w-2" aria-hidden>
            {boxes.map((b, i) => {
              const c = b.finding.citations[b.cite];
              const y = (offsets[c.page - 1] + b.rect[1] * scale) / totalH;
              const sel = b.finding.id === selectedId;
              return (
                <button
                  key={i}
                  type="button"
                  tabIndex={-1}
                  onClick={() => onSelect(b.finding.id)}
                  title={`${b.finding.technology} (page ${c.page})`}
                  className={`pointer-events-auto absolute right-0 h-[5px] rounded-full ${PRIORITY_STYLE[toneOf(b.finding)].bar} ${sel ? "w-3 ring-2 ring-lapis" : "w-2 opacity-80"}`}
                  style={{ top: `calc(${y * 100}% - 2px)` }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PdfPage({ doc, page, top, width, height, scale, root, boxes, selectedId, focus, onSelect }: {
  doc: PDFDocumentProxy; page: number; top: number; width: number; height: number; scale: number;
  root: HTMLElement | null; boxes: Box[]; selectedId: string | null; focus: Focus | null; onSelect: (id: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

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
      await task.promise.then(() => !cancelled && setRendered(true)).catch(() => undefined);
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, doc, page, scale]);

  return (
    <div ref={wrap} className={`absolute shadow-[0_2px_8px_rgb(0_0_0/0.12)] ${rendered ? "bg-white" : "skeleton bg-panel-strong"}`} style={{ top, left: "50%", width, height, transform: "translateX(-50%)" }} aria-label={`Page ${page}`}>
      <canvas ref={canvas} style={{ width, height }} className="block" aria-hidden />
      {boxes.map((b, i) => {
        const [x0, y0, x1, y1] = b.rect;
        const sel = b.finding.id === selectedId;
        const focused = !!focus && focus.id === b.finding.id && focus.cite === b.cite;
        return (
          <button
            key={`${i}-${focused ? focus!.nonce : 0}`} // new key => the pulse animation replays on every "Show in document"
            type="button"
            onClick={() => onSelect(b.finding.id)}
            title={b.finding.technology}
            aria-label={`Finding on page ${page}: ${b.finding.technology}`}
            aria-pressed={sel}
            className={`absolute rounded-[3px] border-b-2 mix-blend-multiply ${TONE_BOX[toneOf(b.finding)]} ${
              focused ? "focus-pulse outline-[3px] outline-offset-2 outline-lapis" : sel ? "outline-2 outline-offset-2 outline-lapis" : "hover:brightness-90"
            }`}
            style={{ left: x0 * scale - 3, top: y0 * scale - 3, width: (x1 - x0) * scale + 6, height: (y1 - y0) * scale + 6 }}
          />
        );
      })}
    </div>
  );
}
