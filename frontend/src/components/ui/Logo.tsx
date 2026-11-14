import { Link } from "react-router-dom";

/** Horizon mark: sky over clay ground, a lapis point of light above the horizon (DESIGN.md §4). */
export function HorizonMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <defs>
        <clipPath id="horizon-clip">
          <circle cx="16" cy="16" r="15" />
        </clipPath>
      </defs>
      <g clipPath="url(#horizon-clip)">
        <rect width="32" height="32" fill="var(--color-sky)" />
        <rect y="18" width="32" height="14" fill="var(--color-clay)" />
      </g>
      <line x1="1" y1="18" x2="31" y2="18" stroke="var(--color-ink)" strokeWidth="2" />
      <circle cx="16" cy="11" r="4" fill="var(--color-lapis)" />
    </svg>
  );
}

/** Full logo: mark + bold sans wordmark, "Ed" in lapis. Links home. */
export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-ink no-underline hover:no-underline" aria-label="GroundEd home">
      <HorizonMark />
      <span className="text-lg font-bold tracking-[-0.03em]">
        Ground<span className="text-lapis">Ed</span>
      </span>
    </Link>
  );
}
