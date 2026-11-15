/** Completion illustration: a sprout growing from the groundline. Use ONLY at completion moments (DESIGN.md §4). */
export function Sprout({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <line x1="6" y1="41" x2="42" y2="41" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 41V24" stroke="var(--color-moss)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 31c-6.5 0-11-4.5-11-10 6.5 0 11 4.5 11 10z" fill="var(--color-moss)" />
      <path d="M24 26c6.5 0 11-5.5 11-11-7.5 0-11 5.5-11 11z" fill="var(--color-moss)" opacity="0.8" />
    </svg>
  );
}
