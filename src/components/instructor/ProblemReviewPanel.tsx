"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ROUTES } from "../../lib/constants";
import { listProblemsForUpload, setProblemApproval, updateProblem } from "../../lib/problems/client";
import { getInstructorTestUpload } from "../../lib/test-uploads/client";
import type { AppUserProfile, ChoiceMap, Difficulty, Problem, TestUpload } from "../../lib/types";

type ProblemReviewPanelProps = {
  profile: AppUserProfile;
  uploadId: string;
};

type ChoiceFields = {
  A: string;
  B: string;
  C: string;
  D: string;
};

type ProblemDraft = {
  questionText: string;
  choices: ChoiceFields;
  correctAnswer: string;
  aiSolution: string;
  difficulty: "" | Difficulty;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeChoiceValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeChoices(choices: Record<string, unknown> | null | undefined): ChoiceFields {
  if (!choices || typeof choices !== "object") {
    return {
      A: "",
      B: "",
      C: "",
      D: "",
    };
  }

  return {
    A: normalizeChoiceValue(choices.A),
    B: normalizeChoiceValue(choices.B),
    C: normalizeChoiceValue(choices.C),
    D: normalizeChoiceValue(choices.D),
  };
}

function choicesToChoiceMap(choices: ChoiceFields): ChoiceMap {
  return {
    A: choices.A.trim(),
    B: choices.B.trim(),
    C: choices.C.trim(),
    D: choices.D.trim(),
  };
}

function createDraft(problem: Problem): ProblemDraft {
  return {
    questionText: problem.questionText,
    choices: normalizeChoices(problem.choices),
    correctAnswer: problem.correctAnswer ?? "",
    aiSolution: problem.aiSolution ?? "",
    difficulty: problem.difficulty ?? "",
  };
}

function ProblemEditorCard({
  problem,
  onProblemUpdated,
}: {
  problem: Problem;
  onProblemUpdated: (problem: Problem) => void;
}) {
  const [draft, setDraft] = useState<ProblemDraft>(() => createDraft(problem));
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateChoice(key: keyof ChoiceFields, value: string) {
    setDraft((current) => ({
      ...current,
      choices: {
        ...current.choices,
        [key]: value,
      },
    }));
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      // TODO: Add server-side ownership verification before real multi-user usage.
      const updated = await updateProblem(problem.id, {
        questionText: draft.questionText.trim(),
        choices: choicesToChoiceMap(draft.choices),
        correctAnswer: draft.correctAnswer.trim() || null,
        aiSolution: draft.aiSolution.trim() || null,
        difficulty: draft.difficulty || null,
      });

      onProblemUpdated(updated);
      setMessage("Changes saved.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save the problem.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApprovalChange(approved: boolean) {
    setIsUpdatingApproval(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      // TODO: Add server-side ownership verification before real multi-user usage.
      const updated = await setProblemApproval(problem.id, approved);
      onProblemUpdated(updated);
      setMessage(approved ? "Problem approved." : "Problem marked as pending.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update approval status.";
      setErrorMessage(message);
    } finally {
      setIsUpdatingApproval(false);
    }
  }

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Problem
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase ${
                problem.approved
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {problem.approved ? "approved" : "pending"}
            </span>
            {problem.sourcePage ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">
                Page {problem.sourcePage}
              </span>
            ) : null}
          </div>
        </div>
        <div className="text-sm text-slate-500">
          Created {formatDate(problem.createdAt)}
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        <div>
          <label
            htmlFor={`question-${problem.id}`}
            className="block text-sm font-medium text-slate-700"
          >
            Question text
          </label>
          <textarea
            id={`question-${problem.id}`}
            value={draft.questionText}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                questionText: event.target.value,
              }))
            }
            rows={5}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(["A", "B", "C", "D"] as const).map((choiceKey) => (
            <div key={choiceKey}>
              <label
                htmlFor={`${problem.id}-${choiceKey}`}
                className="block text-sm font-medium text-slate-700"
              >
                Choice {choiceKey}
              </label>
              <input
                id={`${problem.id}-${choiceKey}`}
                type="text"
                value={draft.choices[choiceKey]}
                onChange={(event) => updateChoice(choiceKey, event.target.value)}
                className="mt-2 w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`correct-answer-${problem.id}`}
              className="block text-sm font-medium text-slate-700"
            >
              Correct answer
            </label>
            <select
              id={`correct-answer-${problem.id}`}
              value={draft.correctAnswer}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  correctAnswer: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="">No answer selected</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
          <div>
            <label
              htmlFor={`difficulty-${problem.id}`}
              className="block text-sm font-medium text-slate-700"
            >
              Difficulty
            </label>
            <select
              id={`difficulty-${problem.id}`}
              value={draft.difficulty}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  difficulty: event.target.value as "" | Difficulty,
                }))
              }
              className="mt-2 w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="">Unset</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor={`solution-${problem.id}`}
            className="block text-sm font-medium text-slate-700"
          >
            AI solution
          </label>
          <textarea
            id={`solution-${problem.id}`}
            value={draft.aiSolution}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                aiSolution: event.target.value,
              }))
            }
            rows={6}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || isUpdatingApproval}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => void handleApprovalChange(true)}
            disabled={isSaving || isUpdatingApproval}
            className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {isUpdatingApproval && !problem.approved ? "Updating..." : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => void handleApprovalChange(false)}
            disabled={isSaving || isUpdatingApproval}
            className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:border-amber-400 hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {isUpdatingApproval && problem.approved ? "Updating..." : "Unapprove / Reject"}
          </button>
        </div>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ProblemReviewPanel({
  profile,
  uploadId,
}: ProblemReviewPanelProps) {
  const [upload, setUpload] = useState<TestUpload | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadReviewData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [uploadData, problemsData] = await Promise.all([
          getInstructorTestUpload(uploadId, profile.id),
          listProblemsForUpload(uploadId),
        ]);

        if (!isActive) {
          return;
        }

        if (!uploadData) {
          setErrorMessage("Upload not found for this instructor.");
          setUpload(null);
          setProblems([]);
          return;
        }

        setUpload(uploadData);
        setProblems(problemsData);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load the upload review page.";
        setErrorMessage(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadReviewData();

    return () => {
      isActive = false;
    };
  }, [profile.id, uploadId]);

  const approvedCount = useMemo(
    () => problems.filter((problem) => problem.approved).length,
    [problems],
  );
  const totalCount = problems.length;
  const pendingCount = totalCount - approvedCount;

  function handleProblemUpdated(updatedProblem: Problem) {
    setProblems((current) =>
      current.map((problem) =>
        problem.id === updatedProblem.id ? updatedProblem : problem,
      ),
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <p className="text-sm text-slate-600">Loading upload review...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <p className="text-sm font-semibold tracking-[0.16em] text-rose-700 uppercase">
          Review Error
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">
          We could not load this upload.
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">{errorMessage}</p>
        <div className="mt-6">
          <Link
            href={ROUTES.instructor}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            Back to instructor dashboard
          </Link>
        </div>
      </section>
    );
  }

  if (!upload) {
    return null;
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href={ROUTES.instructor}
              className="text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
            >
              Back to instructor dashboard
            </Link>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              {upload.originalFilename}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Review, edit, and approve extracted Math problems before they can
              be used later in student practice.
            </p>
          </div>
          <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-slate-600 uppercase">
            {upload.status}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Uploaded
            </p>
            <p className="mt-2 text-sm text-slate-800">{formatDate(upload.createdAt)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Extracted
            </p>
            <p className="mt-2 text-sm text-slate-800">{totalCount} problems</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Approved
            </p>
            <p className="mt-2 text-sm text-slate-800">{approvedCount} problems</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Storage key
            </p>
            <p className="mt-2 break-all text-sm text-slate-800">{upload.fileUrl}</p>
          </div>
        </div>

        <p className="mt-6 text-sm font-medium text-slate-600">
          {totalCount} extracted · {approvedCount} approved · {pendingCount} pending
        </p>
      </section>

      {problems.length === 0 ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
          <h3 className="text-xl font-semibold text-slate-950">
            No extracted problems yet.
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            If this upload is still marked as uploaded or failed, return to the
            instructor dashboard and run extraction first.
          </p>
        </section>
      ) : (
        <div className="grid gap-5">
          {problems.map((problem) => (
            <ProblemEditorCard
              key={problem.id}
              problem={problem}
              onProblemUpdated={handleProblemUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
