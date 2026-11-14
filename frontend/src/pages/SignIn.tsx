import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, errorMessage } from "../api";
import { Page } from "../components/Layout";
import { Button } from "../components/ui/Button";
import { Panel } from "../components/ui/Card";
import { HorizonMark } from "../components/ui/Logo";
import { Notice } from "../components/ui/Notice";
import { getDemoUser, recordReport, signInDemo, signOutDemo, useStored } from "../lib/history";
import { usePageTitle } from "../lib/usePageTitle";

/** Browser-only demo account for the hackathon: one click, no password (docs/ux/information-architecture.md). */
export default function SignIn() {
  usePageTitle("Sign in");
  const navigate = useNavigate();
  const user = useStored(getDemoUser);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueAsDemo() {
    setBusy(true);
    setError(null);
    try {
      // Give the demo account a couple of sample reports to explore.
      const samples = await api.samples();
      signInDemo();
      for (const s of samples.slice(0, 2)) recordReport(await api.analyzeSample(s.id));
      navigate("/reports");
    } catch (e) {
      signOutDemo();
      setError(`${errorMessage(e)} Is the GroundEd backend running?`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page narrow>
      <Panel className="mx-auto max-w-md space-y-5 text-center">
        <div className="flex justify-center"><HorizonMark size={44} /></div>
        {user ? (
          <>
            <h1 className="text-2xl">Signed in as {user.name}</h1>
            <p className="text-ink-muted">Demo account: for trying GroundEd only. Reports are saved in this browser.</p>
            <Button variant="secondary" onClick={() => signOutDemo()}>Sign out</Button>
          </>
        ) : (
          <>
            <h1 className="text-2xl">Sign in to GroundEd</h1>
            <p className="text-ink-muted">You don't need an account to analyze a module. Signing in keeps a list of your reports.</p>
            <Button onClick={continueAsDemo} disabled={busy} className="w-full">
              {busy ? "Preparing demo…" : "Continue with demo account"}
            </Button>
            <p className="text-xs text-ink-subtle">Demo account: for trying GroundEd only. Reports are saved in this browser.</p>
            {error && <Notice tone="error">{error}</Notice>}
          </>
        )}
      </Panel>
    </Page>
  );
}
