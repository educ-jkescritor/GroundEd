const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "unknown date";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

/** "3 years ago" / "in 5 months" relative to today. */
export function relativeToNow(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44));
  const abs = Math.abs(months);
  const unit = abs >= 12 ? `${Math.floor(abs / 12)} year${Math.floor(abs / 12) === 1 ? "" : "s"}` : `${abs} month${abs === 1 ? "" : "s"}`;
  if (abs === 0) return "this month";
  return months < 0 ? `${unit} ago` : `in ${unit}`;
}
