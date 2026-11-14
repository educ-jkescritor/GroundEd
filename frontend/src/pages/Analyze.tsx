import { useEffect, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FileText, Upload } from "lucide-react";
import { ApiError, api, errorMessage } from "../api";
import type { Analysis, Sample } from "../types";
import { Page } from "../components/Layout";
import { Button } from "../components/ui/Button";
import { Panel } from "../components/ui/Card";
import { Notice } from "../components/ui/Notice";
import { ProgressSteps, type StepState } from "../components/ui/ProgressSteps";
import { usePageTitle } from "../lib/usePageTitle";
import { rememberFile } from "../lib/fileStore";

const MAX_MB = 10;
const STEPS = ["Reading the module", "Finding technologies and practices", "Checking sources", "Scoring priorities"];

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
  const [step, setStep] = useState(0);
  const [error, setError] = useState<{ title: string; body: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    api.samples()
      .then((list) => {
        setSamples(list);
      })
      .catch((e) => setError(friendlyError(e)));
  }, []);

  // The analysis is one request, so steps advance on a timer as an indication of progress.
  // TODO (backend): switch to real job status with per-step counts when available.
  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2200);
    return () => clearInterval(t);
  }, [busy]);

  async function run(label: string, task: () => Promise<Analysis>) {
    setBusy(label);
    setError(null);
    try {
      const analysis = await task();
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
    const states: StepState[] = STEPS.map((_, i) => (i < step ? "done" : i === step ? "current" : "waiting"));
    return (
      <Page narrow>
        <Panel className="mx-auto max-w-xl space-y-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-subtle">Analyzing</p>
            <h1 className="break-words text-2xl">{busy}</h1>
          </div>
          <div className="rounded-[var(--radius-card)] bg-surface p-5">
            <ProgressSteps steps={STEPS.map((label, i) => ({ label, state: states[i] }))} />
          </div>
          <p className="text-sm text-ink-muted">This usually takes under a minute.</p>
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
