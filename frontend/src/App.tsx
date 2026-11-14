import { Navigate, Route, Routes, useParams } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Analyze from "./pages/Analyze";
import Report from "./pages/Report";
import FindingDetail from "./pages/FindingDetail";
import Reports from "./pages/Reports";
import SignIn from "./pages/SignIn";
import Feedback from "./pages/Feedback";
import Methodology from "./pages/Methodology";
import NotFound from "./pages/NotFound";

/** Old /results/:id links keep working. */
function LegacyResults() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/reports/${id ?? ""}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/:id" element={<Report />} />
        <Route path="/reports/:id/findings/:fid" element={<FindingDetail />} />
        <Route path="/results/:id" element={<LegacyResults />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
