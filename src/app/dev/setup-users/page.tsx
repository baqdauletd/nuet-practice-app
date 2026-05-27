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
} from "../../../lib/auth";
import { APP_NAME, ROUTES } from "../../../lib/constants";
import type { UserRole } from "../../../lib/types";

type DebugErrorState = {
  step: string;
  message: string;
  raw?: unknown;
};

type SetupResult = {
  email: string;
  role: UserRole;
  profileStatus: "created" | "already_exists";
  warningMessage?: string;
};

const DEV_SETUP_ENABLED = process.env.NODE_ENV !== "production";

function serializeDebugError(raw: unknown) {
  if (raw instanceof Error) {
    const enriched = raw as Error & {
      code?: string | null;
      details?: unknown;
      raw?: unknown;
    };

    return {
      message: raw.message,
      code: enriched.code ?? null,
      details: enriched.details ?? null,
      raw: enriched.raw ?? null,
    };
  }

  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const source = raw as Record<string, unknown>;
  return {
    message: typeof source.message === "string" ? source.message : null,
    code: typeof source.code === "string" ? source.code : null,
    details: "details" in source ? source.details : null,
    raw,
  };
}

function SetupUserCard({ role }: { role: UserRole }) {
  const [step, setStep] = useState<"signup" | "verify" | "done">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<DebugErrorState | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);

  function clearMessages() {
    setErrorMessage(null);
    setInfoMessage(null);
    setDebugError(null);
  }

  function showStepError(stepName: string, message: string, raw?: unknown) {
    setErrorMessage(`${stepName} failed: ${message}`);
    setDebugError({
      step: stepName,
      message,
      raw: serializeDebugError(raw),
    });
  }

  function formatOtp(value: string) {
    return value.replace(/[\s-]+/g, "").trim();
  }

  async function createProfileForCurrentUser() {
    if (!DEV_SETUP_ENABLED) {
      setErrorMessage("Not available in production.");
      return;
    }

    let user;

    try {
      user = await getCurrentUser();
    } catch (error) {
      showStepError(
        "Manual fallback",
        "could not load the current signed-in user.",
        error,
      );
      return;
    }

    if (!user) {
      showStepError(
        "Manual fallback",
        "No signed-in user found. Go to /login first, then return here.",
      );
      return;
    }

    try {
      const profileResult = await createAppUserProfile({
        id: user.id,
        email,
        role,
        name,
      });

      let warningMessage: string | undefined;
      try {
        await signOut();
      } catch (error) {
        warningMessage =
          "Profile created, but sign-out failed. You may still be signed in.";
        setDebugError({
          step: "Step E",
          message: "Sign-out failed after profile creation.",
          raw: error,
        });
      }

      setResult({
        email: user.email,
        role,
        profileStatus: profileResult.status,
        warningMessage,
      });
      setStep("done");

      if (profileResult.status === "already_exists") {
        setInfoMessage("Profile already exists. Try logging in.");
        return;
      }

      setInfoMessage("Account and profile created. You can now log in.");
    } catch (error) {
      showStepError("Step D", "profile creation failed.", error);
    }
  }

  async function finishProfileCreation() {
    if (!DEV_SETUP_ENABLED) {
      setErrorMessage("Not available in production.");
      return;
    }

    clearMessages();

    const verificationResult = await verifyEmailCode(email, formatOtp(verificationCode));
    if (!verificationResult.ok) {
      showStepError(
        "Step A",
        "email verification failed. Use the newest code from your email.",
        verificationResult.raw,
      );
      return;
    }

    try {
      await signInWithEmailPassword(email, password);
    } catch (error) {
      showStepError(
        "Step B",
        "email verified, but sign-in failed. Try logging in at /login with the same credentials.",
        error,
      );
      return;
    }

    let user;
    try {
      user = await getCurrentUser();
    } catch (error) {
      showStepError(
        "Step C",
        "signed in, but current user could not be loaded.",
        error,
      );
      return;
    }

    if (!user) {
      showStepError(
        "Step C",
        "signed in, but current user could not be loaded.",
      );
      return;
    }

    let profileResult;
    try {
      profileResult = await createAppUserProfile({
        id: user.id,
        email,
        role,
        name,
      });
    } catch (error) {
      showStepError("Step D", "profile creation failed.", error);
      return;
    }

    let warningMessage: string | undefined;
    try {
      await signOut();
    } catch (error) {
      warningMessage =
        "Account and profile created, but sign-out failed. You may still be signed in.";
      setDebugError({
        step: "Step E",
        message: "Sign-out failed after account setup.",
        raw: error,
      });
    }

    setResult({
      email,
      role,
      profileStatus: profileResult.status,
      warningMessage,
    });
    setStep("done");

    if (profileResult.status === "already_exists") {
      setInfoMessage("Profile already exists. Try logging in.");
      return;
    }

    setInfoMessage("Account and profile created. You can now log in.");
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!DEV_SETUP_ENABLED) {
      setErrorMessage("Not available in production.");
      return;
    }
    setIsPending(true);
    clearMessages();
    setResult(null);

    try {
      const signUpResult = await signUpWithEmailPassword(email, password, name);

      if (signUpResult.status === "error") {
        showStepError("Sign-up", signUpResult.message, signUpResult.raw);
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

      setResult({
        email: signUpResult.user.email,
        role,
        profileStatus: profileResult.status,
      });
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
    if (!DEV_SETUP_ENABLED) {
      setErrorMessage("Not available in production.");
      return;
    }
    setIsPending(true);
    clearMessages();

    try {
      await finishProfileCreation();
    } catch (error) {
      showStepError(
        "Verification",
        "unexpected verification flow failure.",
        error,
      );
    } finally {
      setIsPending(false);
    }
  }

  async function handleResendCode() {
    if (!DEV_SETUP_ENABLED) {
      setErrorMessage("Not available in production.");
      return;
    }

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
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
      <p className="text-sm font-semibold tracking-[0.18em] text-emerald-700 uppercase">
        {role}
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-slate-950">
        Create {role}
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-700">
        Creates both the InsForge auth user and the matching `profiles` row for
        local MVP setup.
      </p>

      {step === "signup" ? (
        <form className="mt-6 space-y-4" onSubmit={handleSignUp}>
          <div className="space-y-2">
            <label
              htmlFor={`${role}-name`}
              className="text-sm font-medium text-slate-700"
            >
              Name
            </label>
            <input
              id={`${role}-name`}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`${role}-email`}
              className="text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id={`${role}-email`}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`${role}-password`}
              className="text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id={`${role}-password`}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isPending ? "Creating..." : `Create ${role}`}
          </button>
        </form>
      ) : null}

      {step === "verify" ? (
        <form className="mt-6 space-y-4" onSubmit={handleVerify}>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
            A verification code was sent to your email.
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`${role}-otp`}
              className="text-sm font-medium text-slate-700"
            >
              Verification code
            </label>
            <input
              id={`${role}-otp`}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={verificationCode}
              onChange={(event) =>
                setVerificationCode(formatOtp(event.target.value))
              }
              required
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`${role}-verify-password`}
              className="text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id={`${role}-verify-password`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isPending ? "Verifying..." : "Verify and create profile"}
          </button>

          <button
            type="button"
            onClick={handleResendCode}
            disabled={isResending}
            className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResending ? "Resending..." : "Resend verification email"}
          </button>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
            <p className="font-medium text-slate-900">
              Already verified and signed in?
            </p>
            <p className="mt-1">
              If verification worked but automatic sign-in did not, sign in at{" "}
              <code>/login</code>, then return here and create the profile for
              the current signed-in user.
            </p>
            <button
              type="button"
              onClick={() => {
                clearMessages();
                void createProfileForCurrentUser();
              }}
              disabled={isPending}
              className="mt-3 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create profile for current signed-in user
            </button>
          </div>
        </form>
      ) : null}

      {result ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-700">
          Created {result.role} user: {result.email}.{" "}
          {result.profileStatus === "created"
            ? "Account and profile created. You can now log in."
            : "Profile already exists. Try logging in."}
          {result.warningMessage ? ` ${result.warningMessage}` : ""}
        </div>
      ) : null}

      {infoMessage ? (
        <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-700">
          {infoMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {process.env.NODE_ENV !== "production" && debugError ? (
        <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <summary className="cursor-pointer font-medium text-slate-900">
            Debug details
          </summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">
            {JSON.stringify(debugError, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
}

export default function DevSetupUsersPage() {
  if (!DEV_SETUP_ENABLED) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
          <h1 className="text-2xl font-semibold text-slate-950">
            Not available in production.
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 justify-center px-6 py-12 sm:px-8 lg:px-12">
      <div className="flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 shadow-[0_30px_100px_-50px_rgba(15,23,42,0.45)] sm:p-10">
          <p className="text-sm font-semibold tracking-[0.18em] text-amber-700 uppercase">
            Development Only
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            {APP_NAME} setup users
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
            Development setup only. Remove or protect this page before
            production. Use it to create the initial instructor and student
            accounts so normal sign-in can work through <code>/login</code>.
          </p>
          <div className="mt-6">
            <Link
              href={ROUTES.login}
              className="text-sm font-medium text-slate-700 transition hover:text-slate-950"
            >
              Go to login
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <SetupUserCard role="instructor" />
          <SetupUserCard role="student" />
        </section>
      </div>
    </main>
  );
}
