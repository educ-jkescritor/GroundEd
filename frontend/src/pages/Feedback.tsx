import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import { api, errorMessage } from "../api";
import type { FeedbackIn } from "../types";
import { Page } from "../components/Layout";
import { Button, ButtonLink } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Notice } from "../components/ui/Notice";
import { usePageTitle } from "../lib/usePageTitle";

const ROLES = ["Faculty / lecturer", "Department chair / curriculum reviewer", "Student", "Industry professional", "Other"];
const WOULD_USE: { value: NonNullable<FeedbackIn["would_use"]>; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

export default function Feedback() {
  usePageTitle("Feedback");
  const [params] = useSearchParams();
  const [rating, setRating] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) {
      setError("Please choose a rating from 1 to 5.");
      return;
    }
    const data = new FormData(e.currentTarget);
    const text = (k: string) => String(data.get(k) ?? "").trim() || undefined;
    setSending(true);
    setError(null);
    try {
      await api.feedback({
        role: text("role")!,
        country: text("country")!,
        institution: text("institution"),
        rating,
        would_use: text("would_use") as FeedbackIn["would_use"],
        comments: text("comments"),
        consent_to_quote: data.get("consent") === "on",
        analysis_id: params.get("analysis") ?? undefined,
      });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Page narrow>
        <Card className="space-y-4 p-8 text-center">
          <CircleCheck size={40} className="mx-auto text-supported" aria-hidden />
          <h1 className="font-serif text-2xl font-semibold">Thank you!</h1>
          <p className="text-ink-muted">Your feedback was recorded and will help us make GroundEd more useful for faculty.</p>
          <ButtonLink to="/analyze" variant="secondary">Analyze another syllabus</ButtonLink>
        </Card>
      </Page>
    );
  }

  return (
    <Page narrow>
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-semibold">Help us improve GroundEd</h1>
        <p className="text-ink-muted">Two minutes. We're especially keen to hear from faculty and curriculum reviewers in any country.</p>
      </div>

      <Card>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-sm font-medium">Your role *</span>
              <select name="role" required defaultValue="" className="w-full">
                <option value="" disabled>Choose one</option>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-sm font-medium">Country *</span>
              <input name="country" required autoComplete="country-name" placeholder="e.g. Philippines" className="w-full" />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="block text-sm font-medium">Institution (optional)</span>
            <input name="institution" autoComplete="organization" className="w-full" />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">How useful was GroundEd? *</legend>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={rating === n}
                  aria-label={`${n} out of 5`}
                  onClick={() => setRating(n)}
                  className={`h-11 w-11 rounded-lg border font-mono font-medium ${
                    rating === n ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink/40"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-subtle">1 = not useful, 5 = very useful</p>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Would you use GroundEd for a real syllabus review?</legend>
            <div className="flex gap-5">
              {WOULD_USE.map((o) => (
                <label key={o.value} className="flex items-center gap-2">
                  <input type="radio" name="would_use" value={o.value} className="h-4 w-4 accent-ink" />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-1.5">
            <span className="block text-sm font-medium">Comments</span>
            <textarea name="comments" rows={4} className="w-full" placeholder="What worked? What would make you trust it more?" />
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="consent" className="mt-1 h-4 w-4 accent-ink" />
            <span>You may quote my comment anonymously (e.g. "Faculty, Philippines").</span>
          </label>

          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" disabled={sending}>{sending ? "Sending…" : "Send feedback"}</Button>
        </form>
      </Card>
    </Page>
  );
}
