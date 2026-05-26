import Link from "next/link";
import {
  APP_NAME,
  ROUTES,
  TEST_UPLOADS_BUCKET,
  SOLUTION_PHOTOS_BUCKET,
} from "../lib/constants";

const workflow = [
  "Instructor uploads mixed NUET test files for review.",
  "AI extracts Math problems into a structured practice pool.",
  "Student completes a daily set one problem at a time.",
  "Correctness, solutions, and AI feedback unlock only after the full daily set is submitted.",
];

const upcomingAreas = [
  {
    href: ROUTES.instructor,
    title: "Instructor Dashboard",
    description:
      "Upload test materials, review extracted Math problems, and approve content for practice.",
  },
  {
    href: ROUTES.student,
    title: "Student Practice",
    description:
      "Choose a daily problem count, answer MCQs, and submit notebook photos before results unlock.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 justify-center px-6 py-12 sm:px-8 lg:px-12">
      <div className="flex w-full max-w-6xl flex-col gap-10">
        <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(236,253,245,0.96))] p-8 shadow-[0_30px_100px_-50px_rgba(15,23,42,0.45)] sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:items-end">
            <div className="space-y-6">
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-emerald-800 uppercase">
                Foundation Slice
              </span>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {APP_NAME}
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-700">
                  A private AI-assisted Math practice app for Nazarbayev
                  University Entrance Test preparation.
                </p>
              </div>
              <ul className="grid gap-3 text-sm leading-7 text-slate-700 sm:text-base">
                {workflow.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <aside className="rounded-[1.75rem] border border-slate-200/80 bg-slate-950 p-6 text-slate-50 shadow-[0_30px_70px_-40px_rgba(2,6,23,0.9)]">
              <p className="text-sm font-medium tracking-[0.2em] text-emerald-300 uppercase">
                Guardrail
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                Results stay locked during the session.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Students can submit answers and notebook photos, but they do not
                see correctness, solutions, or AI tutoring feedback until the
                full daily set is complete.
              </p>
              <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <p>Test uploads bucket: {TEST_UPLOADS_BUCKET}</p>
                <p>Solution photos bucket: {SOLUTION_PHOTOS_BUCKET}</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-3">
          <Link
            href={ROUTES.login}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Login
          </Link>
          <p className="text-sm text-slate-600">
            Private access only. Accounts and roles are assigned internally.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {upcomingAreas.map((area) => (
            <Link
              key={area.href}
              href={area.href}
              className="group rounded-[1.5rem] border border-slate-200 bg-white/90 p-6 opacity-80 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 hover:opacity-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Coming soon
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    {area.title}
                  </h2>
                </div>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                  Disabled
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {area.description}
              </p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
