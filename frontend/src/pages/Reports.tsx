import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { Page } from "../components/Layout";
import { ButtonLink } from "../components/ui/Button";
import { Panel } from "../components/ui/Card";
import { getDemoUser, listReports, useStored } from "../lib/history";
import { formatDate } from "../lib/format";
import { usePageTitle } from "../lib/usePageTitle";

/** Report history, kept in this browser (hackathon scope). */
export default function Reports() {
  usePageTitle("Reports");
  const reports = useStored(listReports);
  const user = useStored(getDemoUser);

  if (!user) {
    return (
      <Page narrow>
        <Panel className="space-y-4 text-center">
          <h1 className="text-2xl">Sign in to see your reports</h1>
          <p className="text-ink-muted">
            You don't need an account to analyze a module. Signing in keeps a list of the reports you open, so you can
            come back to them.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/sign-in">Sign in</ButtonLink>
            <ButtonLink to="/analyze" variant="secondary">Analyze a module</ButtonLink>
          </div>
        </Panel>
      </Page>
    );
  }

  return (
    <Page narrow>
      <div className="space-y-2">
        <h1 className="text-[32px]">My reports</h1>
        <p className="text-ink-muted">
          Signed in as {user.name} (demo account). Reports you open are saved in this browser.
        </p>
      </div>

      {reports.length === 0 ? (
        <Panel className="space-y-4 text-center">
          <p className="font-semibold">No reports yet</p>
          <p className="text-ink-muted">Analyze a module or try a sample, and it will appear here.</p>
          <ButtonLink to="/analyze">Analyze a module</ButtonLink>
        </Panel>
      ) : (
        <ul className="space-y-2.5">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                to={`/reports/${encodeURIComponent(r.id)}`}
                className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 text-ink no-underline hover:border-ink/30 hover:no-underline"
              >
                <FileText size={20} className="shrink-0 text-lapis" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.filename}</span>
                  <span className="block text-sm text-ink-subtle">
                    {formatDate(r.created_at)} · {r.findings} finding{r.findings === 1 ? "" : "s"} may warrant review{r.sample ? " · Sample" : ""}
                  </span>
                </span>
                <span className="text-sm font-semibold text-lapis-deep">Open</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
