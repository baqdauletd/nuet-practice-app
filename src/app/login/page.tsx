"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  getCurrentUserProfile,
  signInWithEmailPassword,
} from "../../lib/auth";
import { APP_NAME, ROUTES } from "../../lib/constants";

function getDashboardRoute(role: "instructor" | "student") {
  return role === "instructor" ? ROUTES.instructor : ROUTES.student;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    try {
      await signInWithEmailPassword(email, password);
      const result = await getCurrentUserProfile();

      if (result.status === "missing_profile") {
        setErrorMessage(
          "Your account exists, but no app profile has been assigned yet.",
        );
        return;
      }

      if (result.status === "signed_out") {
        setErrorMessage("Your session could not be established.");
        return;
      }

      router.replace(getDashboardRoute(result.profile.role));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in.";
      setErrorMessage(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(236,253,245,0.96))] p-8 shadow-[0_30px_100px_-50px_rgba(15,23,42,0.45)] sm:p-10">
          <p className="text-sm font-semibold tracking-[0.18em] text-emerald-700 uppercase">
            Private Access
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            Sign in to {APP_NAME}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-700">
            Accounts are private. Sign in with your assigned email and password,
            then the app will load your role from the `profiles` table and send
            you to the correct dashboard.
          </p>
          <ul className="mt-8 grid gap-3 text-sm leading-7 text-slate-700">
            <li className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3">
              Instructor accounts will be routed to the instructor dashboard.
            </li>
            <li className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3">
              Student accounts will be routed to the student practice area.
            </li>
            <li className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3">
              If auth succeeds but no profile row exists, access stays blocked
              until a profile is assigned.
            </li>
          </ul>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_100px_-50px_rgba(15,23,42,0.45)] sm:p-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="min-h-12 w-full rounded-full bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              {isPending ? "Signing in..." : "Sign in"}
            </button>

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-700">
                {errorMessage}
              </div>
            ) : null}
          </form>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <Link
              href={ROUTES.home}
              className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
            >
              Back to home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
