import type { ReactNode } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import { ButtonLink } from "./ui/Button";

const navCls = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium no-underline hover:no-underline ${isActive ? "text-ink" : "text-ink-muted hover:text-ink"}`;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-ink no-underline hover:no-underline">
      <img src="/favicon.svg" alt="" className="h-7 w-7" />
      <span className="font-serif text-xl font-semibold">GroundEd</span>
    </Link>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 backdrop-blur print:hidden">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
          <Logo />
          <div className="ml-auto flex items-center gap-5">
            <a href="/#how-it-works" className="hidden text-sm font-medium text-ink-muted no-underline hover:text-ink sm:inline">
              How it works
            </a>
            <NavLink to="/feedback" className={navCls}>Feedback</NavLink>
            <ButtonLink to="/analyze" size="sm">Analyze a syllabus</ButtonLink>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Lifecycle data from <a href="https://endoflife.date" target="_blank" rel="noreferrer">endoflife.date</a>.
            Built for HackGlobal 2026.
          </p>
          <p className="flex gap-4">
            <a href="https://github.com/educ-jkescritor/GroundEd" target="_blank" rel="noreferrer">GitHub</a>
            <Link to="/feedback">Give feedback</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Standard page container for app pages. */
export function Page({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className={`mx-auto px-4 py-10 sm:px-6 ${narrow ? "max-w-3xl" : "max-w-6xl"} space-y-8`}>{children}</div>
  );
}
