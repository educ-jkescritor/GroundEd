import type { HTMLAttributes, ReactNode } from "react";

/** White card: line border, 16 px radius, light shadow (DESIGN.md §10). */
export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] ${className}`}
      {...rest}
    />
  );
}

/** Soft grey panel: 24 px radius, no border. Optional label chip and title. */
export function Panel({
  label,
  title,
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { label?: ReactNode; title?: ReactNode }) {
  return (
    <div className={`rounded-[var(--radius-panel)] bg-panel p-5 sm:p-6 ${className}`} {...rest}>
      {(label || title) && (
        <div className="mb-4 space-y-2">
          {label && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink">
              {label}
            </span>
          )}
          {title && <h3 className="text-lg">{title}</h3>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Small uppercase section label, e.g. "IN YOUR MODULE". */
export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-ink-subtle ${className}`}>
      {children}
    </p>
  );
}
