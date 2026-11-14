import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { errorMessage } from "../api";
import { Page } from "../components/Layout";
import { Button } from "../components/ui/Button";
import { Panel } from "../components/ui/Card";
import { HorizonMark } from "../components/ui/Logo";
import { Notice } from "../components/ui/Notice";
import { getDemoUser, logInWithDemoHistory, useStored } from "../lib/history";
import { usePageTitle } from "../lib/usePageTitle";

/** Single clean Log in view. Once logged in, redirects straight to /analyze where upload history is shown. */
export default function SignIn() {
  usePageTitle("Log in");
  const navigate = useNavigate();
  const user = useStored(getDemoUser);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/analyze" replace />;
  }

  async function handleLogIn() {
    setBusy(true);
    setError(null);
    try {
      await logInWithDemoHistory();
      navigate("/analyze");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page narrow>
      <Panel className="mx-auto max-w-md space-y-5 text-center">
        <div className="flex justify-center"><HorizonMark size={44} /></div>
        <h1 className="text-2xl">Log in to GroundEd</h1>
        <p className="text-ink-muted">
          You don't need an account to upload and analyze a module. Logging in saves your history of uploads in this browser.
        </p>
        <Button onClick={handleLogIn} disabled={busy} className="w-full">
          {busy ? "Logging in…" : "Log in with demo account"}
        </Button>
        <p className="text-xs text-ink-subtle">
          Demo account: for trying GroundEd only. Upload history is stored in this browser.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
      </Panel>
    </Page>
  );
}
