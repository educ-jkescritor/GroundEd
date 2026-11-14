import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, FileText, LogOut } from "lucide-react";
import { ButtonLink } from "./ui/Button";
import { Logo } from "./ui/Logo";
import { getDemoUser, signOutDemo, useStored } from "../lib/history";

const linkCls = (active: boolean) =>
  `group inline-grid px-3 py-1.5 text-sm no-underline hover:no-underline ${
    active ? "font-bold text-ink" : "font-medium text-ink-muted hover:font-bold hover:text-ink"
  }`;

/**
 * Scroll behaviour on navigation: a new page starts at the top; a link with a #hash scrolls to that section
 * (e.g. /#how-it-works). React Router does neither on its own.
 */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // Wait a frame so the target page has rendered.
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }), 50);
      return () => clearTimeout(t);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

/** Signed-in account menu: name ▾ → My reports, Sign out. */
function AccountMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-9 items-center gap-2 rounded-full px-2.5 text-sm font-semibold text-ink hover:bg-panel"
      >
        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-sky text-xs font-bold text-lapis-deep">
          {name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
        </span>
        <span className="hidden lg:inline">{name}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 w-52 rounded-[var(--radius-card)] border border-line bg-surface p-1.5 shadow-[var(--shadow-float)]">
          <p className="px-3 py-2 text-xs text-ink-subtle">Signed in as {name} (demo)</p>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); navigate("/reports"); }} className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm text-ink hover:bg-panel">
            <FileText size={15} aria-hidden /> My reports
          </button>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); signOutDemo(); navigate("/"); }} className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm text-ink hover:bg-panel">
            <LogOut size={15} aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const user = useStored(getDemoUser);
  const { pathname, hash } = useLocation();

  // Centre links. "How it works" is a section of the landing page; Methodology is its own page.
  const links = [
    { to: "/#how-it-works", label: "How it works", active: pathname === "/" && hash === "#how-it-works" },
    { to: "/methodology", label: "Methodology", active: pathname === "/methodology" },
    { to: "/feedback", label: "Feedback", active: pathname === "/feedback" },
    ...(user ? [{ to: "/reports", label: "My reports", active: pathname.startsWith("/reports") }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollManager />

      {/* Floating pill header (DESIGN.md §7): logo · centred links · actions */}
      <header className="sticky top-3 z-20 px-3 sm:px-6 print:hidden">
        <nav
          aria-label="Main"
          className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-4 rounded-full border border-line bg-surface/85 px-2 py-2 shadow-[var(--shadow-float)] backdrop-blur md:grid-cols-[1fr_auto_1fr]"
        >
          <div className="pl-3"><Logo /></div>
          <div className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className={linkCls(l.active)} aria-current={l.active ? "page" : undefined}>
                {/* Both spans share one grid cell; the invisible bold one fixes the width so hover doesn't shift the bar. */}
                <span className="col-start-1 row-start-1">{l.label}</span>
                <span aria-hidden className="invisible col-start-1 row-start-1 h-0 font-bold">{l.label}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-end gap-1.5">
            {user ? (
              <AccountMenu name={user.name} />
            ) : (
              <ButtonLink to="/sign-in" variant="ghost" size="sm" shape="pill" className="hidden sm:inline-flex">Sign in</ButtonLink>
            )}
            <ButtonLink to="/analyze" size="sm" shape="pill">Analyze a module</ButtonLink>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer signedIn={!!user} />
    </div>
  );
}

/** Conventional multi-column footer: brand + columns + bottom bar. */
function Footer({ signedIn }: { signedIn: boolean }) {
  const columns: { title: string; links: { label: string; to?: string; href?: string }[] }[] = [
    {
      title: "Product",
      links: [
        { label: "Analyze a module", to: "/analyze" },
        { label: "Try a sample", to: "/analyze#samples" },
        { label: "How it works", to: "/#how-it-works" },
        signedIn ? { label: "My reports", to: "/reports" } : { label: "Sign in", to: "/sign-in" },
      ],
    },
    {
      title: "Trust",
      links: [
        { label: "Methodology", to: "/methodology" },
        { label: "Sources and tiers", to: "/methodology#sources" },
        { label: "Scoring", to: "/methodology#scoring" },
        { label: "Coverage and privacy", to: "/methodology#coverage" },
      ],
    },
    {
      title: "Project",
      links: [
        { label: "Give feedback", to: "/feedback" },
        { label: "GitHub", href: "https://github.com/educ-jkescritor/GroundEd" },
        { label: "endoflife.date", href: "https://endoflife.date" },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-line bg-panel print:hidden">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-ink-muted">
            Source-backed reviews for technology course modules. GroundEd advises; you decide what changes.
          </p>
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-subtle">{c.title}</p>
            <ul className="space-y-2 text-sm">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link to={l.to} className="text-ink-muted no-underline hover:text-ink hover:no-underline">{l.label}</Link>
                  ) : (
                    <a href={l.href} target="_blank" rel="noreferrer" className="text-ink-muted no-underline hover:text-ink hover:no-underline">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-center text-xs text-ink-subtle sm:px-6">© 2026 GroundEd · Built for HackGlobal 2026</p>
      </div>
    </footer>
  );
}

/** Standard page container for app pages. */
export function Page({ children, narrow = false, wide = false }: { children: ReactNode; narrow?: boolean; wide?: boolean }) {
  const width = narrow ? "max-w-3xl" : wide ? "max-w-[1400px]" : "max-w-6xl";
  return <div className={`mx-auto px-4 pb-10 pt-8 sm:px-6 ${width} space-y-6`}>{children}</div>;
}
