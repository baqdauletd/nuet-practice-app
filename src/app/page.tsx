import Link from "next/link";
import { APP_NAME, ROUTES } from "../lib/constants";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_100px_-50px_rgba(15,23,42,0.45)] sm:p-10">
        <div className="space-y-4 text-center sm:space-y-5">
          <p className="text-sm font-semibold tracking-[0.18em] text-emerald-700 uppercase">
            Private Access
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            {APP_NAME}
          </h1>
          <p className="text-base leading-7 text-slate-700 sm:text-lg">
            Private Math practice for NUET preparation.
          </p>
          <p className="text-sm leading-6 text-slate-500">
            Use the account assigned by the instructor.
          </p>
        </div>

        <div className="mt-8">
          <Link
            href={ROUTES.login}
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
          >
            Log in
          </Link>
        </div>
      </section>
    </main>
  );
}
