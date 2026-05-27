"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getContinueProblemPath,
  getSessionProgress,
  getTodaySession,
  createDailySession,
} from "../../lib/student-sessions/client";
import { getStudentSessionResultsRoute } from "../../lib/constants";
import type { AppUserProfile, SessionProgress } from "../../lib/types";

function formatToday() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Oral",
  }).format(new Date());
}

function formatStatusLabel(status: SessionProgress["status"]) {
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

export function StudentDashboardPanel({
  profile,
}: {
  profile: AppUserProfile;
}) {
  const router = useRouter();
  const [selectedCount, setSelectedCount] = useState(5);
  const [customCount, setCustomCount] = useState("5");
  const [todayProgress, setTodayProgress] = useState<SessionProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadTodaySession() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const session = await getTodaySession(profile.id);
        if (!session) {
          if (isActive) {
            setTodayProgress(null);
          }
          return;
        }

        const progress = await getSessionProgress(session.id, profile.id);
        if (isActive) {
          setTodayProgress(progress);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load today's practice session.";
        setErrorMessage(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTodaySession();

    return () => {
      isActive = false;
    };
  }, [profile.id]);

  async function handleStartPractice() {
    const problemCount = Number.parseInt(customCount, 10);

    if (!Number.isFinite(problemCount) || problemCount < 1 || problemCount > 30) {
      setErrorMessage("Choose a daily problem count between 1 and 30.");
      return;
    }

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const payload = await createDailySession(profile.id, problemCount);
      router.push(payload.firstProblemPath);
    } catch (error) {
      const rawMessage =
        error instanceof Error
          ? error.message
          : "Unable to start today's practice.";
      const message =
        rawMessage === "Not enough approved problems available."
          ? "Not enough approved problems are available yet. Ask the instructor to review and approve more Math problems first."
          : rawMessage;
      setErrorMessage(message);
    } finally {
      setIsStarting(false);
    }
  }

  function handlePresetSelect(count: number) {
    setSelectedCount(count);
    setCustomCount(String(count));
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <p className="text-sm font-semibold tracking-[0.16em] text-emerald-700 uppercase">
          Today
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">
          Student Practice
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">{formatToday()}</p>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Start today&apos;s practice
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          Choose how many approved Math problems you want to solve today.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {[3, 5, 7].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => handlePresetSelect(count)}
              className={`min-h-12 rounded-full border px-5 py-3 text-base font-semibold transition ${
                selectedCount === count
                  ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-950"
              }`}
            >
              {count} problems
            </button>
          ))}
          <label className="flex min-h-12 items-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700">
            <span>Custom</span>
            <input
              type="number"
              min={1}
              max={30}
              value={customCount}
              onChange={(event) => {
                setCustomCount(event.target.value);
                setSelectedCount(Number.parseInt(event.target.value, 10) || 0);
              }}
              className="min-h-10 w-20 rounded-full border border-slate-200 px-3 py-1 text-base text-slate-900 outline-none focus:border-emerald-500"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleStartPractice()}
            disabled={isStarting}
            className="min-h-12 rounded-full bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isStarting ? "Starting..." : "Start today’s practice"}
          </button>
          <p className="text-sm text-slate-500">
            Existing daily sessions are reused instead of creating duplicates.
          </p>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Today&apos;s session
        </h2>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading session status...</p>
        ) : !todayProgress ? (
          <p className="mt-4 text-sm leading-7 text-slate-700">
            No session has been started yet for today.
          </p>
        ) : (
          <div className="mt-5 grid gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  Status
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatStatusLabel(todayProgress.status)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  Progress
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {todayProgress.submittedCount} / {todayProgress.totalProblems}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  Session
                </p>
                <p className="mt-2 break-all text-sm font-medium text-slate-900">
                  {todayProgress.session.id}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push(getContinueProblemPath(todayProgress))
                }
                className="min-h-12 rounded-full bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    getStudentSessionResultsRoute(todayProgress.session.id),
                  )
                }
                className="min-h-12 rounded-full border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                View results
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
