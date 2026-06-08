"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUserProfile, signOut } from "../../lib/auth";
import { ROUTES } from "../../lib/constants";
import { listConnectedStudents } from "../../lib/connections/client";
import { listStudentSessionSummaries } from "../../lib/student-sessions/client";
import type { AppUserProfile, StudentSessionSummary } from "../../lib/types";
import { InstructorShellProvider } from "./InstructorShellContext";

function getDisplayName(profile: AppUserProfile) {
  return profile.name?.trim() || profile.nickname || profile.email;
}

function getReviewHref(studentId: string, sessionId?: string) {
  const query = new URLSearchParams();
  query.set("studentId", studentId);

  if (sessionId) {
    query.set("sessionId", sessionId);
  }

  return `${ROUTES.instructor}/review?${query.toString()}`;
}

export function InstructorAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [students, setStudents] = useState<AppUserProfile[]>([]);
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
            "Your account exists, but no instructor profile has been assigned yet.",
          );
          return;
        }

        if (result.profile.role !== "instructor") {
          router.replace(
            result.profile.role === "student" ? ROUTES.student : ROUTES.login,
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

        const nextStudents = await listConnectedStudents(profile.id);

        if (!isActive) {
          return;
        }

        setStudents(nextStudents);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSidebarErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load connected students.",
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

  const selectedSidebarStudentId = useMemo(() => {
    const requestedStudentId = searchParams.get("studentId");

    if (requestedStudentId && students.some((student) => student.id === requestedStudentId)) {
      return requestedStudentId;
    }

    return students[0]?.id ?? "";
  }, [searchParams, students]);

  useEffect(() => {
    let isActive = true;

    async function loadSessionSummaries() {
      if (!selectedSidebarStudentId) {
        setSessionSummaries([]);
        return;
      }

      try {
        setIsSidebarLoading(true);
        const nextSessionSummaries = await listStudentSessionSummaries(
          selectedSidebarStudentId,
        );

        if (!isActive) {
          return;
        }

        setSessionSummaries(nextSessionSummaries);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSidebarErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load the selected student's sessions.",
        );
      } finally {
        if (isActive) {
          setIsSidebarLoading(false);
        }
      }
    }

    void loadSessionSummaries();

    return () => {
      isActive = false;
    };
  }, [selectedSidebarStudentId]);

  const selectedSidebarSessionId = useMemo(() => {
    const requestedSessionId = searchParams.get("sessionId");

    if (
      requestedSessionId &&
      sessionSummaries.some((summary) => summary.session.id === requestedSessionId)
    ) {
      return requestedSessionId;
    }

    return sessionSummaries[0]?.session.id ?? "";
  }, [searchParams, sessionSummaries]);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut();
      router.replace(ROUTES.login);
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleSidebarStudentChange(studentId: string) {
    if (!studentId) {
      return;
    }

    router.push(getReviewHref(studentId));
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#111111] px-6 py-12 text-stone-100">
        <div className="border border-stone-800 bg-[#171717] px-5 py-4 text-sm text-stone-300">
          Loading instructor workspace...
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
            {errorMessage ?? "Unable to load the instructor workspace."}
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
    <InstructorShellProvider value={{ profile }}>
      <div className="min-h-screen bg-[#111111] text-stone-100">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="w-full shrink-0 border-b border-stone-800 bg-[#0c0c0c] lg:w-[320px] lg:border-r lg:border-b-0">
            <div className="border-b border-stone-800 px-5 py-5">
              <Link href={`${ROUTES.instructor}/students`} className="text-xl font-semibold tracking-tight">
                Instructor
              </Link>
            </div>

            <div className="px-4 py-4 lg:h-[calc(100vh-157px)] lg:overflow-y-auto">
              <div className="grid gap-8">
                <section>
                  <p className="px-2 text-[11px] font-semibold tracking-[0.18em] text-stone-500 uppercase">
                    Manage
                  </p>
                  <div className="mt-3 grid gap-1">
                    <Link
                      href={`${ROUTES.instructor}/students`}
                      className={`px-3 py-3 text-sm transition ${
                        pathname.startsWith(`${ROUTES.instructor}/students`) ||
                        pathname.startsWith(`${ROUTES.instructor}/review`)
                          ? "bg-[#1b1b1b] text-stone-100"
                          : "text-stone-400 hover:bg-[#151515] hover:text-stone-200"
                      }`}
                    >
                      Students
                    </Link>
                    <Link
                      href={`${ROUTES.instructor}/uploads`}
                      className={`px-3 py-3 text-sm transition ${
                        pathname.startsWith(`${ROUTES.instructor}/uploads`)
                          ? "bg-[#1b1b1b] text-stone-100"
                          : "text-stone-400 hover:bg-[#151515] hover:text-stone-200"
                      }`}
                    >
                      Uploaded files
                    </Link>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between gap-3 px-2">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-stone-500 uppercase">
                      Sessions
                    </p>
                    {students.length > 0 ? (
                      <span className="text-[11px] text-stone-500">{students.length}</span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-3">
                    <select
                      value={selectedSidebarStudentId}
                      onChange={(event) => handleSidebarStudentChange(event.target.value)}
                      className="border border-stone-800 bg-[#121212] px-3 py-3 text-sm text-stone-200 outline-none"
                    >
                      <option value="">Choose student</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {getDisplayName(student)}
                        </option>
                      ))}
                    </select>

                    {sidebarErrorMessage ? (
                      <p className="px-2 text-xs leading-6 text-rose-300">
                        {sidebarErrorMessage}
                      </p>
                    ) : null}

                    {isSidebarLoading && selectedSidebarStudentId ? (
                      <p className="px-2 text-xs text-stone-500">Loading sessions...</p>
                    ) : !selectedSidebarStudentId ? (
                      <p className="px-2 text-xs text-stone-500">
                        Choose a connected student to review sessions.
                      </p>
                    ) : sessionSummaries.length === 0 ? (
                      <p className="px-2 text-xs text-stone-500">No sessions yet.</p>
                    ) : (
                      <div className="grid gap-1">
                        {sessionSummaries.map((summary) => (
                          <Link
                            key={summary.session.id}
                            href={getReviewHref(
                              selectedSidebarStudentId,
                              summary.session.id,
                            )}
                            className={`px-3 py-3 transition ${
                              pathname.startsWith(`${ROUTES.instructor}/review`) &&
                              selectedSidebarSessionId === summary.session.id
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
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <div className="border-t border-stone-800 px-4 py-4">
              <Link
                href={`${ROUTES.instructor}/account`}
                className={`block px-3 py-3 text-sm transition ${
                  pathname.startsWith(`${ROUTES.instructor}/account`)
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
    </InstructorShellProvider>
  );
}
