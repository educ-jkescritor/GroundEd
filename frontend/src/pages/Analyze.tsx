import { useEffect, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, FileText, Loader2, Upload } from "lucide-react";
import { api, errorMessage } from "../api";
import type { Analysis, Sample } from "../types";
import { Page } from "../components/Layout";
import { Card } from "../components/ui/Card";
import { Notice } from "../components/ui/Notice";
import { usePageTitle } from "../lib/usePageTitle";

const MAX_MB = 10;
const STEPS = ["Reading PDF", "Finding technologies", "Checking lifecycle records", "Scoring priorities"];

export default function Analyze() {
  usePageTitle("Analyze a syllabus");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [busy, setBusy] = useState<string | null>(null); // label of what is being analyzed
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    api.samples()
      .then((list) => {
        setSamples(list);
        // "Try a sample" links to /analyze#samples: scroll there once the list has rendered.
        if (window.location.hash === "#samples") {
          requestAnimationFrame(() => document.getElementById("samples")?.scrollIntoView({ behavior: "smooth" }));
        }
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  // Advance the step indicator while waiting. The request is a single call, so these are indicative stages.
  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2500);
    return () => clearInterval(t);
  }, [busy]);

  async function run(label: string, task: () => Promise<Analysis>) {
    setBusy(label);
    setError(null);
    try {
      const analysis = await task();
      navigate(`/results/${analysis.id}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`That file is larger than ${MAX_MB} MB. Try a smaller PDF.`);
      return;
    }
    run(file.name, () => api.analyzeFile(file));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!busy) handleFile(e.dataTransfer.files?.[0]);
  }

  if (busy) {
    return (
      <Page narrow>
        <Card className="space-y-6 p-8" aria-live="polite">
          <div>
            <p className="text-sm text-ink-subtle">Analyzing</p>
            <h1 className="font-serif text-2xl font-semibold break-words">{busy}</h1>
          </div>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 ${i > step ? "text-ink-subtle" : ""}`}>
                {i < step ? (
                  <Check size={18} className="text-supported" aria-hidden />
                ) : i === step ? (
                  <Loader2 size={18} className="animate-spin text-brand" aria-hidden />
                ) : (
                  <span className="h-[18px] w-[18px] rounded-full border border-line" aria-hidden />
                )}
                {s}
              </li>
            ))}
          </ol>
          <p className="text-sm text-ink-muted">This usually takes under a minute.</p>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-semibold">Analyze a syllabus</h1>
        <p className="text-ink-muted">Upload a PDF or start with a sample. You'll see every finding with its sources.</p>
      </div>

      {error && <Notice tone="error">{error} You can also try a sample syllabus below.</Notice>}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? "border-brand bg-brand-soft" : "border-line bg-surface"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Upload size={22} aria-hidden />
        </span>
        <div>
          <p className="font-semibold">Drag and drop your syllabus here</p>
          <p className="text-sm text-ink-muted">PDF with selectable text, up to {MAX_MB} MB</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="min-h-11 rounded-lg bg-ink px-5 font-medium text-white hover:bg-ink/90"
        >
          Choose a PDF
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          aria-label="Upload a syllabus PDF"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <p className="max-w-md text-xs text-ink-subtle">
          Your PDF's text is processed by Google Gemini to detect technologies. Uploads are deleted after 24 hours.
          Please don't upload confidential documents.
        </p>
      </div>

      <section id="samples" className="scroll-mt-20 space-y-4">
        <h2 className="text-xl font-semibold">Or try a sample syllabus</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {samples.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => run(s.title, () => api.analyzeSample(s.id))}
                className="flex h-full w-full gap-4 rounded-xl border border-line bg-surface p-5 text-left shadow-sm transition-colors hover:border-ink/30"
              >
                <FileText size={22} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                <span>
                  <span className="block font-semibold">{s.title}</span>
                  <span className="block text-sm text-ink-muted">{s.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
