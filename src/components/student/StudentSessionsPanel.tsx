"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getContinueProblemPath,
  listStudentSessionSummaries,
} from "../../lib/student-sessions/client";
import { getStudentSessionResultsRoute } from "../../lib/constants";
import type {
  AppUserProfile,
  StudentSessionStatus,
  StudentSessionSummary,
} from "../../lib/types";

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Oral",
  }).format(new Date(`${value}T00:00:00`));
}

function formatCreatedAt(value: string | null) {
  if (!value) {
    return "Unknown start time";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Oral",
  }).format(new Date(value));
}

function getStatusLabel(status: StudentSessionStatus) {
  switch (status) {
    case "completed":
      return "Completed";
    case "ready_for_grading":
      return "Ready for grading";
    case "in_progress":
      return "In progress";
    default:
      return "Not started";
  }
}

function getStatusClasses(status: StudentSessionStatus) {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "ready_for_grading":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "in_progress":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function SessionActions({ summary }: { summary: StudentSessionSummary }) {
  const continueHref = getContinueProblemPath(summary);
  const resultsHref = getStudentSessionResultsRoute(summary.session.id);

  if (summary.status === "completed" || summary.status === "ready_for_grading") {
    return (
      <Link
        href={resultsHref}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        View results
      </Link>
    );
  }

  return (
    <Link
      href={continueHref}
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      Continue session
    </Link>
  );
}

export function StudentSessionsPanel({
  profile,
}: {
  profile: AppUserProfile;
}) {
  const [summaries, setSummaries] = useState<StudentSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadSessions() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const nextSummaries = await listStudentSessionSummaries(profile.id);
        if (isActive) {
          setSummaries(nextSummaries);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load your session history.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      isActive = false;
    };
  }, [profile.id]);

  if (isLoading) {
    return (
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <p className="text-sm text-slate-600">Loading your sessions...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="border border-rose-300 bg-[rgba(255,243,240,0.95)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Session history unavailable
        </h2>
        <p className="mt-3 text-sm text-rose-700">{errorMessage}</p>
      </section>
    );
  }

  if (summaries.length === 0) {
    return (
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Session history
        </h2>
        <p className="mt-3 text-sm text-slate-700">No sessions yet.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      {summaries.map((summary) => (
        <article
          key={summary.session.id}
          className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase ${getStatusClasses(summary.status)}`}
              >
                {getStatusLabel(summary.status)}
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">
                {formatSessionDate(summary.session.sessionDate)}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Started {formatCreatedAt(summary.session.createdAt)}
              </p>
            </div>
            <SessionActions summary={summary} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Progress
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {summary.submittedCount} / {summary.totalProblems}
              </p>
            </div>
            <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Session size
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {summary.totalProblems} problems
              </p>
            </div>
            <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Next step
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {summary.status === "completed"
                  ? "Review graded results"
                  : summary.status === "ready_for_grading"
                    ? "Open results to grade"
                    : `Continue at problem ${summary.firstIncompleteIndex ?? 1}`}
              </p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
