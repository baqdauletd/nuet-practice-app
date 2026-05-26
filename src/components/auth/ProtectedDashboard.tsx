"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUserProfile } from "../../lib/auth";
import { APP_NAME, ROUTES } from "../../lib/constants";
import type { AppUserProfile, UserRole } from "../../lib/types";
import { LogoutButton } from "./LogoutButton";

type ProtectedDashboardProps = {
  requiredRole: UserRole;
  title: string;
  description: string;
};

function getDashboardRoute(role: UserRole) {
  return role === "instructor" ? ROUTES.instructor : ROUTES.student;
}

export function ProtectedDashboard({
  requiredRole,
  title,
  description,
}: ProtectedDashboardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [missingProfile, setMissingProfile] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadAuthState() {
      try {
        const result = await getCurrentUserProfile();

        if (!isActive) {
          return;
        }

        if (result.status === "signed_out") {
          router.replace(ROUTES.login);
          return;
        }

        if (result.status === "missing_profile") {
          setMissingProfile(true);
          return;
        }

        if (result.profile.role !== requiredRole) {
          router.replace(getDashboardRoute(result.profile.role));
          return;
        }

        setProfile(result.profile);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load your account.";
        setErrorMessage(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadAuthState();

    return () => {
      isActive = false;
    };
  }, [requiredRole, router]);

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
          Checking your access...
        </div>
      </main>
    );
  }

  if (missingProfile) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl rounded-[1.75rem] border border-amber-200 bg-amber-50 p-8 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold tracking-[0.18em] text-amber-700 uppercase">
            Profile Required
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">
            Your account exists, but no app profile has been assigned yet.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            Ask an instructor or admin to create a row for your account in the
            `profiles` table before using {APP_NAME}.
          </p>
          <div className="mt-6">
            <Link
              href={ROUTES.login}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              Back to login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl rounded-[1.75rem] border border-rose-200 bg-rose-50 p-8 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold tracking-[0.18em] text-rose-700 uppercase">
            Access Error
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">
            We could not load your dashboard.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">{errorMessage}</p>
          <div className="mt-6">
            <Link
              href={ROUTES.login}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              Return to login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="flex flex-1 justify-center px-6 py-12 sm:px-8 lg:px-12">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-[1.75rem] border border-white/60 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(236,253,245,0.96))] p-8 shadow-[0_30px_100px_-50px_rgba(15,23,42,0.45)] sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold tracking-[0.18em] text-emerald-700 uppercase">
              {profile.role}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-700">
              {description}
            </p>
            <p className="text-sm text-slate-500">
              Signed in as {profile.email}
              {profile.name ? ` (${profile.name})` : ""}
            </p>
          </div>
          <LogoutButton />
        </header>
      </div>
    </main>
  );
}
