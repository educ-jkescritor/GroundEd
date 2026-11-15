import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { Page } from "../components/Layout";
import { ButtonLink } from "../components/ui/Button";
import { Panel } from "../components/ui/Card";
import { getDemoUser, listReports, useStored } from "../lib/history";
import { formatDate } from "../lib/format";
import { usePageTitle } from "../lib/usePageTitle";

/** Upload & report history, kept in this browser while logged in (hackathon scope). */
export default function Reports() {
  usePageTitle("Upload history");
  const reports = useStored(listReports);
  const user = useStored(getDemoUser);

  if (!user) {
    return (
      <Page narrow>
        <Panel className="space-y-4 text-center">
          <h1 className="text-2xl">Log in to see your history of uploads</h1>
          <p className="text-ink-muted">
            You can upload and analyze modules anytime as a guest. Logging in keeps a history of the modules you upload
            and the reports you open so you can return to them.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/sign-in">Log in</ButtonLink>
            <ButtonLink to="/analyze" variant="secondary">Analyze as guest</ButtonLink>
          </div>
        </Panel>
      </Page>
    );
  }

  return (
    <Page narrow>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-[32px]">History of uploads</h1>
          <p className="text-ink-muted">
            Logged in as {user.name} (demo account). Uploaded modules and reports are saved in this browser.
          </p>
        </div>
        <ButtonLink to="/analyze" size="sm">Upload another module</ButtonLink>
      </div>

      {reports.length === 0 ? (
        <Panel className="space-y-4 text-center">
          <p className="font-semibold">No uploads in history yet</p>
          <p className="text-ink-muted">Analyze a module PDF or try a sample, and it will appear here automatically.</p>
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
                    {formatDate(r.created_at)} · {r.findings} finding{r.findings === 1 ? "" : "s"} may warrant review{r.sample ? " · Sample" : " · Uploaded PDF"}
                  </span>
                </span>
                <span className="text-sm font-semibold text-lapis-deep">Open →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
