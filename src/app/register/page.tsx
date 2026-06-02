"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useState } from "react";
import {
  createAppUserProfile,
  getCurrentUser,
  resendVerificationEmail,
  signInWithEmailPassword,
  signOut,
  signUpWithEmailPassword,
  verifyEmailCode,
} from "../../lib/auth";
import { APP_NAME, ROUTES } from "../../lib/constants";
import type { UserRole } from "../../lib/types";

function formatOtp(value: string) {
  return value.replace(/[\s-]+/g, "").trim();
}

export default function RegisterPage() {
  const [step, setStep] = useState<"signup" | "verify" | "done">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [verificationCode, setVerificationCode] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  function clearMessages() {
    setErrorMessage(null);
    setInfoMessage(null);
  }

  async function finishProfileCreation() {
    const verificationResult = await verifyEmailCode(
      email,
      formatOtp(verificationCode),
    );

    if (!verificationResult.ok) {
      setErrorMessage(
        "Email verification failed. Use the newest code sent to your email.",
      );
      return;
    }

    await signInWithEmailPassword(email, password);

    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Signed in, but current user could not be loaded.");
    }

    const profileResult = await createAppUserProfile({
      id: user.id,
      email,
      role,
      name,
    });

    await signOut();

    setStep("done");
    if (profileResult.status === "already_exists") {
      setInfoMessage("Profile already exists. Try logging in.");
      return;
    }

    setInfoMessage("Account and profile created. You can now log in.");
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    clearMessages();

    try {
      const signUpResult = await signUpWithEmailPassword(email, password, name);

      if (signUpResult.status === "error") {
        setErrorMessage(signUpResult.message);
        return;
      }

      if (signUpResult.status === "verification_required") {
        setStep("verify");
        setInfoMessage(
          "Email verification is required. Enter the code sent to your email.",
        );
        return;
      }

      const profileResult = await createAppUserProfile({
        id: signUpResult.user.id,
        email: signUpResult.user.email,
        role,
        name,
      });

      await signOut();

      setStep("done");
      if (profileResult.status === "already_exists") {
        setInfoMessage("Profile already exists. Try logging in.");
        return;
      }

      setInfoMessage("Account and profile created. You can now log in.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create the user.";
      setErrorMessage(message);
    } finally {
      setIsPending(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    clearMessages();

    try {
      await finishProfileCreation();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected verification flow failure.";
      setErrorMessage(message);
    } finally {
      setIsPending(false);
    }
  }

  async function handleResendCode() {
    setIsResending(true);
    clearMessages();

    try {
      await resendVerificationEmail(email);
      setInfoMessage("A new verification code was sent to your email.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to resend the verification email.";
      setErrorMessage(message);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_100px_-50px_rgba(15,23,42,0.45)] sm:p-10">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-[0.18em] text-emerald-700 uppercase">
            Private Access
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            {APP_NAME}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Create your account, verify your email if needed, and we will set up
            your app profile using the existing registration flow.
          </p>
        </div>

        {step === "signup" ? (
          <form className="space-y-5" onSubmit={handleSignUp}>
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-slate-700"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </div>

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
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Role</span>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={role === "student"}
                    onChange={() => setRole("student")}
                    className="mr-2"
                  />
                  Student
                </label>
                <label className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="role"
                    value="instructor"
                    checked={role === "instructor"}
                    onChange={() => setRole("instructor")}
                    className="mr-2"
                  />
                  Instructor
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="min-h-12 w-full rounded-full bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              {isPending ? "Creating..." : "Register"}
            </button>
          </form>
        ) : null}

        {step === "verify" ? (
          <form className="space-y-5" onSubmit={handleVerify}>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
              A verification code was sent to your email.
            </div>

            <div className="space-y-2">
              <label
                htmlFor="verification-code"
                className="text-sm font-medium text-slate-700"
              >
                Verification code
              </label>
              <input
                id="verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verificationCode}
                onChange={(event) =>
                  setVerificationCode(formatOtp(event.target.value))
                }
                required
                className="min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="verify-password"
                className="text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="verify-password"
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
              {isPending ? "Verifying..." : "Verify and create profile"}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={isResending}
              className="min-h-12 w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResending ? "Resending..." : "Resend verification email"}
            </button>
          </form>
        ) : null}

        {step === "done" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-700">
            {infoMessage ?? "Account created. You can now log in."}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {infoMessage && step !== "done" ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-700">
            {infoMessage}
          </div>
        ) : null}

        <div className="mt-6 border-t border-slate-200 pt-6 text-center">
          <Link
            href={step === "done" ? ROUTES.login : ROUTES.home}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            {step === "done" ? "Go to login" : "Back to home"}
          </Link>
        </div>
      </section>
    </main>
  );
}
