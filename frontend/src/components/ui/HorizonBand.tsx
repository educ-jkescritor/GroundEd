import type { ReactNode } from "react";

/**
 * Landing hero background (DESIGN.md §4): sky fading toward the horizon, then a clearly visible ground made of
 * soil layers (strata) under a firm groundline. Echoes the Horizon logo. No clouds, scenery or photos.
 */
export function HorizonBand({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-panel)] bg-gradient-to-b from-sky via-[#e9f0fa] to-[#f6f8fc]">
      {children}
      <div aria-hidden className="relative">
        {/* Groundline */}
        <div className="h-[3px] bg-ink" />
        {/* Soil layers: topsoil → subsoil → bedrock, with gently uneven edges */}
        <svg viewBox="0 0 1200 96" preserveAspectRatio="none" className="block h-16 w-full sm:h-24">
          <rect width="1200" height="96" fill="var(--color-clay)" />
          <path d="M0 0 H1200 V22 C1000 30 820 16 600 24 C380 32 200 18 0 26 Z" fill="#c98f63" />
          <path d="M0 40 C180 34 360 48 600 42 C840 36 1020 50 1200 44 V62 C1010 70 820 56 600 64 C380 72 190 58 0 66 Z" fill="var(--color-clay-deep)" opacity="0.55" />
          <path d="M0 78 C200 72 420 86 640 80 C860 74 1040 88 1200 82 V96 H0 Z" fill="var(--color-clay-deep)" opacity="0.85" />
          {/* Small stones in the subsoil */}
          <g fill="#f3e3d3" opacity="0.5">
            <ellipse cx="140" cy="52" rx="7" ry="3" />
            <ellipse cx="410" cy="31" rx="5" ry="2.5" />
            <ellipse cx="760" cy="55" rx="8" ry="3" />
            <ellipse cx="1010" cy="33" rx="6" ry="2.5" />
          </g>
        </svg>
      </div>
    </div>
  );
}
