import { Link, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import Analyze from "./pages/Analyze";
import Results from "./pages/Results";
import Feedback from "./pages/Feedback";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link to="/" className="font-semibold">GroundEd</Link>
          <Link to="/analyze" className="text-sm text-slate-600 hover:text-slate-900">Analyze a syllabus</Link>
          <Link to="/feedback" className="text-sm text-slate-600 hover:text-slate-900">Feedback</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/results/:id" element={<Results />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
