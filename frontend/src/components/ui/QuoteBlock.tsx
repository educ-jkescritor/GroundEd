import type { ReactNode } from "react";

/** Text quoted from a module or a source: the ONLY place the serif is used (DESIGN.md §6). */
export function QuoteBlock({
  children,
  caption,
  tone = "module",
  size = "md",
}: {
  children: ReactNode;
  caption?: ReactNode;
  tone?: "module" | "source";
  size?: "sm" | "md";
}) {
  return (
    <blockquote className={`border-l-2 pl-3 ${tone === "module" ? "border-clay" : "border-lapis"}`}>
      <p className={`font-serif italic text-ink ${size === "sm" ? "text-sm leading-snug" : "text-base leading-relaxed"}`}>
        “{children}”
      </p>
      {caption && <p className="mt-1 text-xs text-ink-subtle">{caption}</p>}
    </blockquote>
  );
}
