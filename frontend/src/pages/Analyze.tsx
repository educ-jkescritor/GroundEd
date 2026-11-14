import { useEffect, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, FileText, Upload } from "lucide-react";
import { ApiError, api, errorMessage } from "../api";
import type { Analysis, Sample } from "../types";
import { Page } from "../components/Layout";
import { Button } from "../components/ui/Button";
import { Panel } from "../components/ui/Card";
import { Notice } from "../components/ui/Notice";
import { HorizonMark } from "../components/ui/Logo";
import { usePageTitle } from "../lib/usePageTitle";
import { rememberFile } from "../lib/fileStore";

const MAX_MB = 10;
// Plain descriptions of what happens, shown one at a time. They are NOT progress steps: the analysis is a single
// request, so we never claim a step is done (DESIGN.md: honest system status).
const MESSAGES = ["Reading your module…", "Looking for technologies and practices…", "Checking trusted sources…", "Ranking findings by priority…"];
const MIN_LOADING_MS = 900; // never flash the loader
const DONE_MS = 750; // show "Done" briefly so the jump to results feels finished

/** Turn API errors into the DESIGN.md microcopy, with a way forward. */
function friendlyError(e: unknown): { title: string; body: string } {
  if (e instanceof ApiError) {
    if (/scanned/i.test(e.message)) return { title: "This PDF looks scanned", body: "We can't read its text yet. Try a text-based PDF, or explore a sample." };
    if (e.status === 415) return { title: "That file isn't a PDF", body: "Please choose a PDF file." };
    if (e.status === 413) return { title: "That file is too large", body: `Please choose a PDF up to ${MAX_MB} MB.` };
    if (e.status === 429 || e.status === 503) {
      return { title: "Our analysis service is busy", body: "Your module wasn't lost. Try again in a minute, or explore a sample." };
    }
    if (e.status === 0) return { title: "Can't reach GroundEd", body: "Check your connection and try again." };
  }
  return { title: "Something went wrong", body: `${errorMessage(e)} Try again, or use a sample module.` };
}

export default function Analyze() {
  usePageTitle("Analyze a module");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<{ title: string; body: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    api.samples()
      .then((list) => {
        setSamples(list);
      })
      .catch((e) => setError(friendlyError(e)));
  }, []);

  // Rotate the description; after 10 s, reassure that long modules take longer.
  // TODO (backend): real per-step progress once the API reports job status.
  useEffect(() => {
    if (!busy) return;
    setMessage(0);
    setSlow(false);
    const t = setInterval(() => setMessage((m) => (m + 1) % MESSAGES.length), 2600);
    const s = setTimeout(() => setSlow(true), 10_000);
    return () => {
      clearInterval(t);
      clearTimeout(s);
    };
  }, [busy]);

  async function run(label: string, task: () => Promise<Analysis>) {
    setBusy(label);
    setDone(null);
    setError(null);
    const started = Date.now();
    try {
      const analysis = await task();
      await new Promise((r) => setTimeout(r, Math.max(0, MIN_LOADING_MS - (Date.now() - started))));
      const n = analysis.findings.filter((f) => f.status !== "supported").length;
      setDone(analysis.coverage === "not_covered" ? "Done" : n === 0 ? "Done: nothing to review" : `Done: ${n} finding${n === 1 ? "" : "s"} to review`);
      await new Promise((r) => setTimeout(r, DONE_MS));
      navigate(`/reports/${encodeURIComponent(analysis.id)}`);
    } catch (e) {
      setError(friendlyError(e));
      setBusy(null);
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError({ title: "That file isn't a PDF", body: "Please choose a PDF file." });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError({ title: "That file is too large", body: `Please choose a PDF up to ${MAX_MB} MB.` });
      return;
    }
    run(file.name, async () => {
      const analysis = await api.analyzeFile(file);
      rememberFile(analysis.id, file); // keep the real PDF for the results page's viewer
      return analysis;
    });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!busy) handleFile(e.dataTransfer.files?.[0]);
  }

  if (busy) {
    return (
      <Page narrow>
        <Panel className="mx-auto max-w-xl space-y-6 py-10 text-center" aria-live="polite">
          <div className="flex justify-center">
            {done ? (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-supported text-white"><Check size={28} strokeWidth={3} aria-hidden /></span>
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-card)]"><HorizonMark size={34} /></span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-subtle">{done ? "Analysis complete" : "Analyzing your module"}</p>
            <h1 className="break-words text-2xl">{busy}</h1>
          </div>
          {/* Indeterminate bar: activity, not a fake percentage */}
          <div className="mx-auto h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-line" aria-hidden>
            {done ? <div className="h-full w-full bg-supported" /> : <div className="indeterminate h-full w-1/3 rounded-full bg-lapis" />}
          </div>
          <p className="text-ink-muted">{done ?? MESSAGES[message]}</p>
          {slow && !done && <p className="text-sm text-ink-subtle">Large modules can take up to a minute. You can keep this tab open.</p>}
        </Panel>
      </Page>
    );
  }

  return (
    <Page>
      <div className="space-y-2">
        <h1 className="text-[32px]">Analyze a module</h1>
        <p className="text-ink-muted">Upload a PDF or start with a sample. You'll see every finding with its sources.</p>
      </div>

      {error && (
        <Notice tone="error">
          <strong>{error.title}.</strong> {error.body}
        </Notice>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-4 rounded-[var(--radius-panel)] border-2 border-dashed p-10 text-center transition-colors sm:p-14 ${
          dragging ? "border-lapis bg-sky/60" : "border-line bg-panel"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-lapis shadow-[var(--shadow-card)]">
          <Upload size={24} aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-lg font-semibold">Drag and drop your module here</p>
          <p className="text-sm text-ink-muted">PDF with selectable text, up to {MAX_MB} MB</p>
        </div>
        <Button onClick={() => inputRef.current?.click()}>Choose a PDF</Button>
        <input
          ref={inputRef}
          id="module-file"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          aria-label="Upload a module PDF"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <p className="max-w-lg text-xs text-ink-subtle">
          GroundEd covers technology courses (IT, computing, web development). Your module's text is processed by
          Google Gemini to find technologies; uploads are deleted after 24 hours. Please don't upload confidential documents.
        </p>
      </div>

      <section id="samples" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl">Or try a sample module</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {samples.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => run(s.title, () => api.analyzeSample(s.id))}
                className="group flex h-full w-full items-start gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 text-left shadow-[var(--shadow-card)] transition-colors hover:border-lapis"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky text-lapis-deep">
                  <FileText size={18} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{s.title}</span>
                  <span className="block text-sm text-ink-muted">{s.description}</span>
                </span>
                <ArrowRight size={18} className="mt-1 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-lapis" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
