import { useState, type FormEvent } from "react";
import { api } from "../api";

// TODO (design): role dropdown, country select, nicer rating input.
export default function Feedback() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    try {
      await api.feedback({
        role: String(data.get("role")),
        country: String(data.get("country")),
        institution: String(data.get("institution") || "") || undefined,
        rating: Number(data.get("rating")),
        comments: String(data.get("comments") || "") || undefined,
      });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (sent) return <p>Thank you! Your feedback was recorded.</p>;

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Feedback</h1>
      <input name="role" required placeholder="Your role (e.g. Faculty)" className="w-full rounded border p-2" />
      <input name="country" required placeholder="Country" className="w-full rounded border p-2" />
      <input name="institution" placeholder="Institution (optional)" className="w-full rounded border p-2" />
      <label className="block">
        How useful was GroundEd? (1–5)
        <input name="rating" type="number" min={1} max={5} required className="ml-2 w-16 rounded border p-1" />
      </label>
      <textarea name="comments" placeholder="Comments" className="w-full rounded border p-2" rows={4} />
      <button className="rounded-lg bg-slate-900 px-4 py-2 text-white">Send</button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
