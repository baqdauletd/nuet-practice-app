import Link from "next/link";
import { APP_NAME, ROUTES } from "../lib/constants";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <section className="w-full max-w-2xl border border-stone-300 bg-[rgba(255,253,248,0.94)] p-8 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)] sm:p-10">
        <div className="space-y-4 text-center sm:space-y-5">
          <p className="text-sm font-semibold tracking-[0.18em] text-[#526b5c] uppercase">
            Private Access
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            {APP_NAME}
          </h1>
          <p className="text-base leading-7 text-slate-700 sm:text-lg">
            Private Math practice for NUET preparation.
          </p>
          <p className="mx-auto max-w-lg text-sm leading-7 text-slate-600">
            Use the account assigned by the instructor. The workspace is built
            for reading, solving, and reviewing problem sets without unnecessary
            clutter.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link
            href={ROUTES.login}
            className="flex min-h-12 w-full items-center justify-center border border-[#43594c] bg-[#526b5c] px-5 py-3 text-base font-semibold text-white transition hover:bg-[#43594c]"
          >
            Log in
          </Link>
          <Link
            href={ROUTES.register}
            className="flex min-h-12 w-full items-center justify-center border border-stone-400 bg-[rgba(255,250,242,0.9)] px-5 py-3 text-base font-semibold text-slate-800 transition hover:border-stone-500 hover:bg-[rgba(247,241,232,0.95)]"
          >
            Register
          </Link>
        </div>
      </section>
    </main>
  );
}
