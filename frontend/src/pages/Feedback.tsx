import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../api";
import type { FeedbackIn } from "../types";
import { Page } from "../components/Layout";
import { Button, ButtonLink } from "../components/ui/Button";
import { Panel } from "../components/ui/Card";
import { Notice } from "../components/ui/Notice";
import { Sprout } from "../components/ui/Sprout";
import { usePageTitle } from "../lib/usePageTitle";

const ROLES = ["Faculty / lecturer", "Department chair / curriculum reviewer", "Instructional designer", "Student", "Industry professional", "Other"];
const COUNTRIES = ["Philippines", "India", "Indonesia", "Malaysia", "Singapore", "Vietnam", "Nigeria", "Kenya", "United States", "United Kingdom", "Australia", "Canada"];
const WOULD_USE: { value: NonNullable<FeedbackIn["would_use"]>; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

const label = "block text-sm font-semibold text-ink";
const chip = (on: boolean) =>
  `min-h-10 rounded-[var(--radius-control)] border px-4 text-sm font-semibold transition-colors ${
    on ? "border-lapis bg-sky text-lapis-deep" : "border-line bg-surface text-ink hover:border-ink/40"
  }`;

export default function Feedback() {
  usePageTitle("Feedback");
  const [params] = useSearchParams();
  const [rating, setRating] = useState(0);
  const [wouldUse, setWouldUse] = useState<FeedbackIn["would_use"]>();
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
        would_use: wouldUse,
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
        <Panel className="space-y-4 text-center">
          <div className="flex justify-center"><Sprout size={56} /></div>
          <h1 className="text-2xl">Thank you!</h1>
          <p className="text-ink-muted">Your feedback was recorded. It directly shapes what we build next.</p>
          <ButtonLink to="/analyze" variant="secondary">Analyze another module</ButtonLink>
        </Panel>
      </Page>
    );
  }

  return (
    <Page narrow>
      <div className="space-y-2">
        <h1 className="text-[32px]">Help us improve GroundEd</h1>
        <p className="text-ink-muted">Two minutes. We especially want to hear from educators who update technology courses, in any country.</p>
      </div>

      <Panel>
        <form onSubmit={submit} className="space-y-6" noValidate={false}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="fb-role" className={label}>Your role <span className="text-eol">*</span></label>
              <select id="fb-role" name="role" required defaultValue="" className="w-full">
                <option value="" disabled>Choose one</option>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fb-country" className={label}>Country <span className="text-eol">*</span></label>
              <input id="fb-country" name="country" required list="fb-countries" autoComplete="country-name" placeholder="Start typing…" className="w-full" />
              <datalist id="fb-countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fb-institution" className={label}>Institution <span className="font-normal text-ink-subtle">(optional)</span></label>
            <input id="fb-institution" name="institution" autoComplete="organization" className="w-full" />
          </div>

          <fieldset className="space-y-2">
            <legend className={label}>How useful was GroundEd? <span className="text-eol">*</span></legend>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-pressed={rating === n} aria-label={`${n} out of 5`} onClick={() => setRating(n)} className={`${chip(rating === n)} w-12 font-mono`}>
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-subtle">1 = not useful · 5 = very useful</p>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className={label}>Would you use GroundEd for a real module review?</legend>
            <div className="flex flex-wrap gap-2">
              {WOULD_USE.map((o) => (
                <button key={o.value} type="button" aria-pressed={wouldUse === o.value} onClick={() => setWouldUse(o.value)} className={chip(wouldUse === o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor="fb-comments" className={label}>Comments</label>
            <textarea id="fb-comments" name="comments" rows={4} className="w-full" placeholder="What worked? What would make you trust it more?" />
          </div>

          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-lapis" />
            <span>You may quote my comment anonymously (for example "Faculty, Philippines").</span>
          </label>

          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" disabled={sending}>{sending ? "Sending…" : "Send feedback"}</Button>
        </form>
      </Panel>
    </Page>
  );
}
