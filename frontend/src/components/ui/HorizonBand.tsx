import type { ReactNode } from "react";

/**
 * Landing hero background (DESIGN.md §4): sky fading to the white canvas, ending on a groundline
 * with a faint clay band below. Echoes the Horizon logo. No clouds, scenery or photos.
 */
export function HorizonBand({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-panel)] bg-gradient-to-b from-sky via-[#eef3fb] to-canvas">
      {children}
      <div aria-hidden className="relative">
        <div className="h-px bg-ink" />
        <div className="h-1.5 bg-clay/25" />
        <div className="h-1 bg-clay/10" />
      </div>
    </div>
  );
}
