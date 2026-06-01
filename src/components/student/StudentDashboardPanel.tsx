"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getContinueProblemPath,
  getSessionProgress,
  getTodaySession,
  createDailySession,
  listDailySessionSourceOptions,
} from "../../lib/student-sessions/client";
import {
  getStudentSessionResultsRoute,
  getStudentSessionsRoute,
} from "../../lib/constants";
import type {
  AppUserProfile,
  DailySessionSourceOption,
  SessionProgress,
} from "../../lib/types";

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
  const [fileCustomCount, setFileCustomCount] = useState("2");
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [todayProgress, setTodayProgress] = useState<SessionProgress | null>(null);
  const [sourceOptions, setSourceOptions] = useState<DailySessionSourceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadTodaySession() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [session, nextSourceOptions] = await Promise.all([
          getTodaySession(profile.id),
          listDailySessionSourceOptions(profile.id),
        ]);

        if (isActive) {
          setSourceOptions(nextSourceOptions);
          setSelectedUploadId((current) => current || nextSourceOptions[0]?.uploadId || "");
        }

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

  async function handleStartWholeFile(uploadId: string) {
    setIsStarting(true);
    setErrorMessage(null);

    try {
      const payload = await createDailySession({
        studentId: profile.id,
        uploadId,
        useEntireUpload: true,
      });
      router.push(payload.firstProblemPath);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to start that file-based practice session.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  async function handleStartCustomFilePractice() {
    const problemCount = Number.parseInt(fileCustomCount, 10);

    if (!selectedUploadId) {
      setErrorMessage("Choose a file for the custom practice session.");
      return;
    }

    if (!Number.isFinite(problemCount) || problemCount < 1 || problemCount > 30) {
      setErrorMessage("Choose a custom file problem count between 1 and 30.");
      return;
    }

    const selectedSource = sourceOptions.find(
      (option) => option.uploadId === selectedUploadId,
    );

    if (selectedSource && problemCount > selectedSource.approvedProblemCount) {
      setErrorMessage(
        `This file only has ${selectedSource.approvedProblemCount} approved problems.`,
      );
      return;
    }

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const payload = await createDailySession({
        studentId: profile.id,
        problemCount,
        uploadId: selectedUploadId,
      });
      router.push(payload.firstProblemPath);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to start that custom file-based practice session.",
      );
    } finally {
      setIsStarting(false);
    }
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
        <div className="mt-5">
          <button
            type="button"
            onClick={() => router.push(getStudentSessionsRoute())}
            className="min-h-11 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            View all sessions
          </button>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Start today&apos;s practice
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          Solve one whole uploaded file, or choose a custom amount from a specific file.
        </p>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-semibold text-slate-950">
            Solve a whole file
          </h3>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            If an uploaded file has fewer than 15 approved problems, you can solve all of them in one session.
          </p>
          {isLoading ? (
            <p className="mt-4 text-sm text-slate-600">Loading file options...</p>
          ) : sourceOptions.filter((option) => option.canUseEntireUpload).length === 0 ? (
            <p className="mt-4 text-sm leading-7 text-slate-700">
              No uploaded files are currently eligible for an all-problems session.
            </p>
          ) : (
            <div className="mt-5 flex flex-wrap gap-3">
              {sourceOptions
                .filter((option) => option.canUseEntireUpload)
                .map((option) => (
                  <button
                    key={option.uploadId}
                    type="button"
                    onClick={() => void handleStartWholeFile(option.uploadId)}
                    disabled={isStarting}
                    className="min-h-12 rounded-full border border-slate-300 bg-white px-5 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {option.originalFilename} - {option.approvedProblemCount} problems
                  </button>
                ))}
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-semibold text-slate-950">
            Custom from one file
          </h3>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            Choose at least 1 problem and the file it should come from.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
            <label className="grid gap-2 text-sm text-slate-700">
              <span>File</span>
              <select
                value={selectedUploadId}
                onChange={(event) => setSelectedUploadId(event.target.value)}
                className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
              >
                <option value="">Choose a file</option>
                {sourceOptions.map((option) => (
                  <option key={option.uploadId} value={option.uploadId}>
                    {option.originalFilename} ({option.approvedProblemCount} problems)
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              <span>Problems</span>
              <input
                type="number"
                min={1}
                max={30}
                value={fileCustomCount}
                onChange={(event) => setFileCustomCount(event.target.value)}
                className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleStartCustomFilePractice()}
              disabled={isStarting}
              className="min-h-12 rounded-full bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Start file practice
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Latest session today
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
