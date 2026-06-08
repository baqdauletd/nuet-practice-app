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
  children?: React.ReactNode;
  renderContent?: (profile: AppUserProfile) => React.ReactNode;
};

function getDashboardRoute(role: UserRole) {
  return role === "instructor" ? ROUTES.instructor : ROUTES.student;
}

export function ProtectedDashboard({
  requiredRole,
  title,
  description,
  children,
  renderContent,
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
        <div className="rounded-[1.5rem] border border-stone-300 bg-[rgba(255,253,248,0.92)] px-6 py-5 text-sm text-slate-600 shadow-[0_18px_40px_-30px_rgba(50,44,35,0.35)]">
          Checking your access...
        </div>
      </main>
    );
  }

  if (missingProfile) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl rounded-[1.75rem] border border-amber-300 bg-[rgba(255,248,232,0.94)] p-8 shadow-[0_18px_40px_-30px_rgba(50,44,35,0.35)]">
          <p className="text-sm font-semibold tracking-[0.18em] text-amber-800 uppercase">
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
              className="rounded-full border border-stone-400 bg-[rgba(255,253,248,0.9)] px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-stone-500 hover:text-slate-950"
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
        <div className="w-full max-w-xl rounded-[1.75rem] border border-rose-300 bg-[rgba(255,243,240,0.95)] p-8 shadow-[0_18px_40px_-30px_rgba(50,44,35,0.35)]">
          <p className="text-sm font-semibold tracking-[0.18em] text-rose-800 uppercase">
            Access Error
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">
            We could not load your dashboard.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">{errorMessage}</p>
          <div className="mt-6">
            <Link
              href={ROUTES.login}
              className="rounded-full border border-stone-400 bg-[rgba(255,253,248,0.9)] px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-stone-500 hover:text-slate-950"
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
        <header className="flex flex-col gap-4 rounded-[1.75rem] border border-stone-300 bg-[linear-gradient(180deg,rgba(255,253,248,0.96),rgba(241,235,224,0.96))] p-8 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)] sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold tracking-[0.18em] text-[#526b5c] uppercase">
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
        {renderContent ? renderContent(profile) : null}
        {children}
      </div>
    </main>
  );
}
