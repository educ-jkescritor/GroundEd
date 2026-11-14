import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "warning" | "error";

const tones = {
  info: { icon: Info, cls: "border-lapis/30 bg-sky text-ink" },
  warning: { icon: TriangleAlert, cls: "border-nearing/30 bg-nearing-soft text-ink" },
  error: { icon: CircleAlert, cls: "border-eol/30 bg-eol-soft text-ink" },
};

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  const { icon: Icon, cls } = tones[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-lg border p-4 text-sm ${cls}`}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
