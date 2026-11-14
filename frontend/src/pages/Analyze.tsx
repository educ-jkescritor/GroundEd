import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Sample } from "../types";

// TODO (design): drag-and-drop upload, progress states, privacy note styling.
export default function Analyze() {
  const navigate = useNavigate();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.samples().then(setSamples).catch((e) => setError(e.message));
  }, []);

  async function run(task: () => ReturnType<typeof api.analyzeSample>) {
    setBusy(true);
    setError(null);
    try {
      const analysis = await task();
      navigate(`/results/${analysis.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-8">
      <h1 className="text-2xl font-semibold">Analyze a syllabus</h1>

      <div className="space-y-2">
        <label className="block font-medium">Upload a syllabus (PDF)</label>
        <input
          type="file"
          accept="application/pdf"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) run(() => api.analyzeFile(file));
          }}
        />
        <p className="text-sm text-slate-500">
          Text is processed by Google Gemini to detect technologies. Uploads are deleted after 24 hours.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Or try a sample</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {samples.map((s) => (
            <li key={s.id}>
              <button
                disabled={busy}
                onClick={() => run(() => api.analyzeSample(s.id))}
                className="w-full rounded-lg border bg-white p-4 text-left hover:border-slate-400"
              >
                <div className="font-medium">{s.title}</div>
                <div className="text-sm text-slate-600">{s.description}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {busy && <p>Analyzing…</p>}
      {error && <p className="text-red-600">{error}</p>}
    </section>
  );
}
