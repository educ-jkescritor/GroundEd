import type { ReactNode } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import { ButtonLink } from "./ui/Button";
import { Logo } from "./ui/Logo";

const navCls = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium no-underline hover:no-underline ${isActive ? "text-ink" : "text-ink-muted hover:text-ink"}`;

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Floating pill header (DESIGN.md §7) */}
      <header className="sticky top-3 z-20 px-3 sm:px-6 print:hidden">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-6xl items-center gap-6 rounded-full border border-line bg-surface/85 py-2 pl-5 pr-2 shadow-[var(--shadow-float)] backdrop-blur"
        >
          <Logo />
          <div className="hidden items-center gap-5 md:flex">
            <a href="/#how-it-works" className="text-sm font-medium text-ink-muted no-underline hover:text-ink">How it works</a>
            <NavLink to="/reports" className={navCls}>Reports</NavLink>
            <NavLink to="/feedback" className={navCls}>Feedback</NavLink>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ButtonLink to="/sign-in" variant="ghost" size="sm" shape="pill" className="hidden sm:inline-flex">Sign in</ButtonLink>
            <ButtonLink to="/analyze" size="sm" shape="pill">Analyze a module</ButtonLink>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-line print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Advisory tool: you decide what changes. Lifecycle data from <a href="https://endoflife.date" target="_blank" rel="noreferrer">endoflife.date</a>.</p>
          <p className="flex flex-wrap gap-4">
            <a href="/#scoring">Methodology</a>
            <a href="https://github.com/educ-jkescritor/GroundEd" target="_blank" rel="noreferrer">GitHub</a>
            <Link to="/feedback">Feedback</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Standard page container for app pages. */
export function Page({ children, narrow = false, wide = false }: { children: ReactNode; narrow?: boolean; wide?: boolean }) {
  const width = narrow ? "max-w-3xl" : wide ? "max-w-[1400px]" : "max-w-6xl";
  return <div className={`mx-auto px-4 pb-10 pt-8 sm:px-6 ${width} space-y-6`}>{children}</div>;
}
