"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getContinueProblemPath,
  getSessionProgress,
  getSessionProblemsForResults,
} from "../../lib/student-sessions/client";
import type {
  AppUserProfile,
  GradingFeedback,
  SessionProblemWithProblem,
  SessionProgress,
} from "../../lib/types";
import { getStudentSessionResultsRoute } from "../../lib/constants";

function getChoiceValue(
  choices: Record<string, string> | null,
  key: "A" | "B" | "C" | "D",
) {
  return typeof choices?.[key] === "string" ? choices[key] : "";
}

function GradingCard({
  item,
}: {
  item: SessionProblemWithProblem;
}) {
  const feedback = item.submission?.aiFeedback as GradingFeedback | null;

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Problem {item.orderIndex + 1}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">
            {item.problem.questionText}
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase ${
            item.submission?.isCorrect
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {item.submission?.isCorrect ? "correct" : "incorrect"}
        </span>
      </div>

      <div className="mt-5 grid gap-2 text-sm text-slate-700">
        {(["A", "B", "C", "D"] as const).map((choiceKey) => {
          const choiceValue = getChoiceValue(item.problem.choices, choiceKey);
          if (!choiceValue) {
            return null;
          }

          return (
            <p key={choiceKey}>
              <span className="font-semibold">{choiceKey}.</span> {choiceValue}
            </p>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p>
          <span className="font-semibold text-slate-900">Your answer:</span>{" "}
          {item.submission?.selectedAnswer ?? "No answer"}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Correct answer:</span>{" "}
          {item.problem.correctAnswer ?? "Unknown"}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Feedback:</span>{" "}
          {feedback?.feedback ?? "No feedback available."}
        </p>
        <div>
          <p className="font-semibold text-slate-900">Mistakes</p>
          {feedback?.mistakes?.length ? (
            <ul className="mt-2 list-disc pl-5">
              {feedback.mistakes.map((mistake) => (
                <li key={mistake}>{mistake}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">No specific mistakes recorded.</p>
          )}
        </div>
        <p>
          <span className="font-semibold text-slate-900">Guided solution:</span>{" "}
          {feedback?.guided_solution ?? "No guided solution available."}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Optimal solution:</span>{" "}
          {feedback?.optimal_solution ?? "No optimal solution available."}
        </p>
      </div>
    </article>
  );
}

export function ResultsPanel({
  profile,
  sessionId,
}: {
  profile: AppUserProfile;
  sessionId: string;
}) {
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [problems, setProblems] = useState<SessionProblemWithProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGrading, setIsGrading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadResultsData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const nextProgress = await getSessionProgress(sessionId, profile.id);
        if (!isActive) {
          return;
        }

        setProgress(nextProgress);

        if (nextProgress.allSubmitted && nextProgress.session.completed) {
          const resultProblems = await getSessionProblemsForResults(
            sessionId,
            profile.id,
          );

          if (isActive) {
            setProblems(resultProblems);
          }
        } else if (isActive) {
          setProblems([]);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load session results.";
        setErrorMessage(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadResultsData();

    return () => {
      isActive = false;
    };
  }, [profile.id, sessionId]);

  const correctCount = useMemo(
    () => problems.filter((item) => item.submission?.isCorrect).length,
    [problems],
  );

  async function handleGradeSession() {
    setIsGrading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/student/grade-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          studentId: profile.id,
        }),
      });

      const payload = (await response.json()) as
        | { ok: true; gradedCount: number }
        | { error?: string; details?: string };

      if (!response.ok || !("ok" in payload && payload.ok)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Unable to generate AI feedback.",
        );
      }

      const [nextProgress, resultProblems] = await Promise.all([
        getSessionProgress(sessionId, profile.id),
        getSessionProblemsForResults(sessionId, profile.id),
      ]);

      setProgress(nextProgress);
      setProblems(resultProblems);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to generate AI feedback.";
      setErrorMessage(message);
    } finally {
      setIsGrading(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <p className="text-sm text-slate-600">Loading results...</p>
      </section>
    );
  }

  if (errorMessage && !progress) {
    return (
      <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          We could not load these results.
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">{errorMessage}</p>
      </section>
    );
  }

  if (!progress) {
    return null;
  }

  if (!progress.allSubmitted) {
    return (
      <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Results are locked
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          Finish all today&apos;s problems before seeing correctness, solutions,
          or feedback.
        </p>
        <p className="mt-4 text-sm font-medium text-slate-800">
          Progress: {progress.submittedCount} / {progress.totalProblems}
        </p>
        <div className="mt-6">
          <Link
            href={getContinueProblemPath(progress)}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Continue solving
          </Link>
        </div>
      </section>
    );
  }

  if (!progress.session.completed) {
    return (
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          All problems submitted
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          Generate feedback when ready. This will compare your MCQ answers,
          analyze any notebook photos, and prepare guidance for each problem.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleGradeSession()}
            disabled={isGrading}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isGrading ? "Generating..." : "Generate AI Feedback"}
          </button>
          <Link
            href={getContinueProblemPath(progress)}
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            Review submissions
          </Link>
        </div>
        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Session results
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Review correctness, AI tutoring feedback, and more efficient ways
              to solve each problem.
            </p>
          </div>
          <Link
            href={getStudentSessionResultsRoute(sessionId)}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            Refresh results
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Total
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">{problems.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">
              Correct
            </p>
            <p className="mt-2 text-sm font-medium text-emerald-900">{correctCount}</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-rose-700 uppercase">
              Incorrect
            </p>
            <p className="mt-2 text-sm font-medium text-rose-900">
              {problems.length - correctCount}
            </p>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}
      </section>

      <div className="grid gap-5">
        {problems.map((item) => (
          <GradingCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
