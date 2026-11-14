import { Page } from "../components/Layout";
import { ButtonLink } from "../components/ui/Button";
import { usePageTitle } from "../lib/usePageTitle";

export default function NotFound() {
  usePageTitle("Page not found");
  return (
    <Page narrow>
      <h1 className="text-3xl">We couldn't find that page.</h1>
      <p className="text-ink-muted">The link may be old, or the analysis may have expired.</p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink to="/">Go home</ButtonLink>
        <ButtonLink to="/analyze" variant="secondary">Analyze a syllabus</ButtonLink>
      </div>
    </Page>
  );
}
