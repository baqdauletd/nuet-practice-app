"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { FormattedText } from "../shared/FormattedText";
import { getChoiceEntries } from "../../lib/choices";
import { formatAiText } from "../../lib/formatting";
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

function DashboardButton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <Link
      href="/student"
      className={`inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 ${className}`.trim()}
    >
      Back to Dashboard
    </Link>
  );
}

function StructuredText({
  text,
  emptyText,
  ordered = false,
}: {
  text: string | null | undefined;
  emptyText: string;
  ordered?: boolean;
}) {
  const formatted = formatAiText(text);

  if (!formatted) {
    return <p className="break-words text-sm leading-7 text-slate-600">{emptyText}</p>;
  }

  if (ordered && formatted.kind === "steps") {
    return (
      <ol className="grid gap-3 pl-5 text-sm leading-7 text-slate-700 marker:font-semibold marker:text-slate-500">
        {formatted.items.map((item, index) => (
          <li key={`${index}-${item}`} className="break-words">
            {item}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="grid gap-3 text-sm leading-7 text-slate-700">
      {formatted.items.map((item, index) => (
        <p key={`${index}-${item}`} className="break-words whitespace-pre-wrap">
          {item}
        </p>
      ))}
    </div>
  );
}

function FeedbackSection({
  title,
  children,
  tone = "default",
}: {
  title: string;
  children: ReactNode;
  tone?: "default" | "accent";
}) {
  const toneClasses =
    tone === "accent"
      ? "border-sky-200 bg-sky-50/80"
      : "border-slate-200 bg-white/80";

  return (
    <section className={`rounded-2xl border p-4 sm:p-5 ${toneClasses}`}>
      <h4 className="text-sm font-semibold tracking-[0.14em] text-slate-500 uppercase">
        {title}
      </h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function GradingCard({
  item,
}: {
  item: SessionProblemWithProblem;
}) {
  const feedback = item.submission?.aiFeedback as GradingFeedback | null;
  const usedFallbackFeedback =
    feedback?.feedback === "AI feedback failed, but MCQ correctness was recorded.";

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Problem {item.orderIndex + 1}
          </p>
          <div className="mt-2">
            <FormattedText
              text={item.problem.questionText}
              emptyText="Question text is missing."
              className="text-base leading-7 font-semibold text-slate-950 sm:text-lg sm:leading-8"
            />
          </div>
        </div>
        <span
          className={`shrink-0 self-start rounded-full px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase ${
            item.submission?.isCorrect
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {item.submission?.isCorrect ? "correct" : "incorrect"}
        </span>
      </div>

      <div className="mt-5 grid gap-2 text-sm leading-7 text-slate-700">
        {getChoiceEntries(item.problem.choices).map((choice) => {
          return (
            <div key={`${choice.label}-${choice.text}`} className="break-words">
              <span className="font-semibold">{choice.label}.</span>
              <FormattedText
                text={choice.text}
                emptyText="Choice text is missing."
                className="mt-1"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 sm:p-5">
        <p>
          <span className="font-semibold text-slate-900">Your answer:</span>{" "}
          {item.submission?.selectedAnswer ?? "No answer"}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Correct answer:</span>{" "}
          {item.problem.correctAnswer ?? "Unknown"}
        </p>
        {usedFallbackFeedback ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            AI tutoring feedback could not be generated for this problem, but your MCQ correctness was still recorded.
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4">
        <FeedbackSection title="Feedback">
          <StructuredText
            text={feedback?.feedback}
            emptyText="No feedback available."
          />
        </FeedbackSection>

        <FeedbackSection title="Mistakes">
          {feedback?.mistakes?.length ? (
            <ul className="grid gap-2 pl-5 text-sm leading-7 text-slate-700">
              {feedback.mistakes.map((mistake, index) => (
                <li key={`${index}-${mistake}`} className="break-words list-disc">
                  {mistake}
                </li>
              ))}
            </ul>
          ) : (
            <p className="break-words text-sm leading-7 text-slate-600">
              No specific mistakes recorded.
            </p>
          )}
        </FeedbackSection>

        <FeedbackSection title="Guided Solution">
          <StructuredText
            text={feedback?.guided_solution}
            emptyText="No guided solution available."
            ordered
          />
        </FeedbackSection>

        <FeedbackSection title="Optimal / Faster Method" tone="accent">
          <StructuredText
            text={feedback?.optimal_solution}
            emptyText="No optimal solution available."
          />
        </FeedbackSection>
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
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] sm:p-7">
        <DashboardButton className="mb-4" />
        <p className="text-sm text-slate-600">Loading results...</p>
      </section>
    );
  }

  if (errorMessage && !progress) {
    return (
      <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <DashboardButton className="mb-4" />
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
        <DashboardButton className="mb-4" />
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
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={getContinueProblemPath(progress)}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
          >
            Continue solving
          </Link>
        </div>
      </section>
    );
  }

  if (!progress.session.completed) {
    return (
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] sm:p-7">
        <DashboardButton className="mb-4" />
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
            className="min-h-12 rounded-full bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isGrading ? "Generating..." : "Generate AI Feedback"}
          </button>
          <Link
            href={getContinueProblemPath(progress)}
            className="min-h-12 rounded-full border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
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
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <DashboardButton className="mb-4" />
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
            className="min-h-12 rounded-full border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
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

      <div className="flex justify-start">
        <DashboardButton />
      </div>
    </div>
  );
}
