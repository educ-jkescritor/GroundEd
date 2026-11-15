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

/** Soft grey panel: 24 px radius, no border. Optional label chip, title and description. */
export function Panel({
  label,
  title,
  description,
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { label?: ReactNode; title?: ReactNode; description?: ReactNode }) {
  return (
    <div className={`rounded-[var(--radius-panel)] bg-panel p-5 sm:p-6 ${className}`} {...rest}>
      {(label || title || description) && (
        <div className="mb-4 space-y-2">
          {label && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink">
              {label}
            </span>
          )}
          {title && <h3 className="text-[22px] leading-[1.2] text-ink">{title}</h3>}
          {description && <p className="text-[15px] font-normal leading-relaxed text-ink-muted">{description}</p>}
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
