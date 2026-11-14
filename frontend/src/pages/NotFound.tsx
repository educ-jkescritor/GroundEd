import { Page } from "../components/Layout";
import { ButtonLink } from "../components/ui/Button";
import { Panel } from "../components/ui/Card";
import { HorizonMark } from "../components/ui/Logo";
import { usePageTitle } from "../lib/usePageTitle";

export default function NotFound() {
  usePageTitle("Page not found");
  return (
    <Page narrow>
      <Panel className="space-y-4 text-center">
        <div className="flex justify-center"><HorizonMark size={44} /></div>
        <h1 className="text-2xl">We couldn't find that page</h1>
        <p className="text-ink-muted">The link may be old, or the report may have expired. Reports are kept for 24 hours after upload.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink to="/">Go home</ButtonLink>
          <ButtonLink to="/analyze" variant="secondary">Analyze a module</ButtonLink>
        </div>
      </Panel>
    </Page>
  );
}
