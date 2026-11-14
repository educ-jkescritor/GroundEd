import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

export function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium">
      {children}
      <ExternalLink size={13} aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
