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
      <section className="w-full max-w-md border border-stone-300 bg-[rgba(255,253,248,0.95)] p-8 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)] sm:p-10">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-[0.18em] text-[#526b5c] uppercase">
            Private Access
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            {APP_NAME}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Sign in with your assigned email and password to continue to your
            practice workspace.
          </p>
        </div>

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
              className="min-h-12 w-full border border-stone-400 bg-[rgba(246,240,231,0.9)] px-4 py-3 text-base text-slate-950 outline-none transition focus:border-[#526b5c] focus:bg-[rgba(255,253,248,0.98)]"
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
              className="min-h-12 w-full border border-stone-400 bg-[rgba(246,240,231,0.9)] px-4 py-3 text-base text-slate-950 outline-none transition focus:border-[#526b5c] focus:bg-[rgba(255,253,248,0.98)]"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="min-h-12 w-full border border-[#43594c] bg-[#526b5c] px-5 py-3 text-base font-semibold text-white transition hover:bg-[#43594c] disabled:cursor-not-allowed disabled:border-stone-400 disabled:bg-stone-400"
          >
            {isPending ? "Signing in..." : "Log in"}
          </button>

          {errorMessage ? (
            <div className="space-y-2">
              <div className="border border-rose-300 bg-[rgba(255,243,240,0.95)] px-4 py-3 text-sm leading-7 text-rose-800">
                {errorMessage}
              </div>
            </div>
          ) : null}
        </form>

        <div className="mt-6 border-t border-slate-200 pt-6 text-center">
          <Link
            href={ROUTES.home}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
