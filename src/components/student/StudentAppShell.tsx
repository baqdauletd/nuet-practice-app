"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUserProfile, signOut } from "../../lib/auth";
import {
  getContinueProblemPath,
  listStudentSessionSummaries,
} from "../../lib/student-sessions/client";
import {
  getStudentSessionResultsRoute,
  ROUTES,
} from "../../lib/constants";
import type { AppUserProfile, StudentSessionSummary } from "../../lib/types";
import { StudentShellProvider } from "./StudentShellContext";

function getSessionHref(summary: StudentSessionSummary) {
  if (summary.status === "completed" || summary.status === "ready_for_grading") {
    return getStudentSessionResultsRoute(summary.session.id);
  }

  return getContinueProblemPath(summary);
}

export function StudentAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [sessionSummaries, setSessionSummaries] = useState<StudentSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarLoading, setIsSidebarLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sidebarErrorMessage, setSidebarErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const result = await getCurrentUserProfile();

        if (!isActive) {
          return;
        }

        if (result.status === "signed_out") {
          router.replace(ROUTES.login);
          return;
        }

        if (result.status === "missing_profile") {
          setErrorMessage(
            "Your account exists, but no student profile has been assigned yet.",
          );
          return;
        }

        if (result.profile.role !== "student") {
          router.replace(
            result.profile.role === "instructor" ? ROUTES.instructor : ROUTES.login,
          );
          return;
        }

        setProfile(result.profile);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load your account.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, [router]);

  useEffect(() => {
    let isActive = true;

    async function loadSidebarData() {
      if (!profile) {
        return;
      }

      try {
        setIsSidebarLoading(true);
        setSidebarErrorMessage(null);

        const nextSummaries = await listStudentSessionSummaries(profile.id);

        if (!isActive) {
          return;
        }

        setSessionSummaries(nextSummaries);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSidebarErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load your sessions.",
        );
      } finally {
        if (isActive) {
          setIsSidebarLoading(false);
        }
      }
    }

    void loadSidebarData();

    return () => {
      isActive = false;
    };
  }, [profile]);

  const activeSessionId = useMemo(() => {
    const match = pathname.match(/\/student\/session\/([^/]+)/);
    return match?.[1] ?? "";
  }, [pathname]);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut();
      router.replace(ROUTES.login);
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#111111] px-6 py-12 text-stone-100">
        <div className="border border-stone-800 bg-[#171717] px-5 py-4 text-sm text-stone-300">
          Loading student workspace...
        </div>
      </main>
    );
  }

  if (!profile || errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#111111] px-6 py-12 text-stone-100">
        <div className="max-w-xl border border-rose-900 bg-[#171110] p-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-rose-300 uppercase">
            Workspace Error
          </p>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            {errorMessage ?? "Unable to load the student workspace."}
          </p>
          <Link
            href={ROUTES.login}
            className="mt-6 inline-flex border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-stone-500"
          >
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <StudentShellProvider value={{ profile }}>
      <div className="min-h-screen bg-[#111111] text-stone-100">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="w-full shrink-0 border-b border-stone-800 bg-[#0c0c0c] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[320px] lg:self-start lg:flex-col lg:border-r lg:border-b-0">
            <div className="border-b border-stone-800 px-5 py-5">
              <Link href={`${ROUTES.student}/practice`} className="text-xl font-semibold tracking-tight">
                Student
              </Link>
            </div>

            <div className="px-4 py-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <div className="grid gap-8">
                <section>
                  <p className="px-2 text-[11px] font-semibold tracking-[0.18em] text-stone-500 uppercase">
                    Manage
                  </p>
                  <div className="mt-3 grid gap-1">
                    <Link
                      href={`${ROUTES.student}/practice`}
                      className={`px-3 py-3 text-sm transition ${
                        pathname.startsWith(`${ROUTES.student}/practice`) ||
                        pathname.startsWith(`${ROUTES.student}/sessions`) ||
                        pathname.startsWith(`${ROUTES.student}/session`)
                          ? "bg-[#1b1b1b] text-stone-100"
                          : "text-stone-400 hover:bg-[#151515] hover:text-stone-200"
                      }`}
                    >
                      Practice
                    </Link>
                    <Link
                      href={`${ROUTES.student}/instructors`}
                      className={`px-3 py-3 text-sm transition ${
                        pathname.startsWith(`${ROUTES.student}/instructors`)
                          ? "bg-[#1b1b1b] text-stone-100"
                          : "text-stone-400 hover:bg-[#151515] hover:text-stone-200"
                      }`}
                    >
                      Instructor problems
                    </Link>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between gap-3 px-2">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-stone-500 uppercase">
                      Sessions
                    </p>
                    {sessionSummaries.length > 0 ? (
                      <span className="text-[11px] text-stone-500">{sessionSummaries.length}</span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-1">
                    {sidebarErrorMessage ? (
                      <p className="px-2 text-xs leading-6 text-rose-300">
                        {sidebarErrorMessage}
                      </p>
                    ) : isSidebarLoading ? (
                      <p className="px-2 text-xs text-stone-500">Loading...</p>
                    ) : sessionSummaries.length === 0 ? (
                      <p className="px-2 text-xs text-stone-500">No sessions yet.</p>
                    ) : (
                      sessionSummaries.map((summary) => (
                        <Link
                          key={summary.session.id}
                          href={getSessionHref(summary)}
                          className={`px-3 py-3 transition ${
                            activeSessionId === summary.session.id
                              ? "bg-[#1b1b1b] text-stone-100"
                              : "text-stone-400 hover:bg-[#151515] hover:text-stone-200"
                          }`}
                        >
                          <p className="text-sm font-medium">
                            {summary.session.sessionDate}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            {summary.submittedCount}/{summary.totalProblems} submitted
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>

            <div className="border-t border-stone-800 px-4 py-4 lg:mt-auto">
              <Link
                href={`${ROUTES.student}/account`}
                className={`block px-3 py-3 text-sm transition ${
                  pathname.startsWith(`${ROUTES.student}/account`)
                    ? "bg-[#1b1b1b] text-stone-100"
                    : "text-stone-400 hover:bg-[#151515] hover:text-stone-200"
                }`}
              >
                Account settings
              </Link>
              <div className="mt-4 px-3">
                <p className="text-sm font-medium text-stone-200">
                  {profile.name?.trim() || profile.email}
                </p>
                <p className="mt-1 text-xs text-stone-500">{profile.email}</p>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={isSigningOut}
                  className="mt-4 border border-stone-700 px-3 py-2 text-xs font-semibold tracking-[0.14em] text-stone-200 uppercase transition hover:border-stone-500 disabled:opacity-60"
                >
                  {isSigningOut ? "Signing out..." : "Log out"}
                </button>
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1 bg-[#f4efe4] text-slate-900">
            <div className="mx-auto min-h-screen max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </StudentShellProvider>
  );
}
