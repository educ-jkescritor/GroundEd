import { Link } from "react-router-dom";

// TODO (design): problem statement, how it works (3 steps), trust principles, CTA.
export default function Landing() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-bold">Keep your syllabus current, with sources.</h1>
      <p className="max-w-2xl text-lg text-slate-600">
        GroundEd finds the languages, frameworks and tools in your syllabus and checks each one
        against endoflife.date. Every finding cites its source, and nothing changes without your approval.
      </p>
      <Link to="/analyze" className="inline-block rounded-lg bg-slate-900 px-5 py-3 text-white">
        Analyze a syllabus
      </Link>
    </section>
  );
}
