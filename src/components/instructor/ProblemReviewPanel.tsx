"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FormattedText } from "../shared/FormattedText";
import { ProblemSourceImage } from "../shared/ProblemSourceImage";
import { ROUTES } from "../../lib/constants";
import {
  choicesArrayToRecord,
  getChoiceLabels,
  normalizeChoices,
} from "../../lib/choices";
import type { ChoiceEntry } from "../../lib/choices";
import {
  listProblemsForUpload,
  setProblemApproval,
  updateProblem,
} from "../../lib/problems/client";
import {
  getInstructorTestUpload,
  updateInstructorTestUpload,
} from "../../lib/test-uploads/client";
import type {
  AppUserProfile,
  Difficulty,
  Problem,
  TestUpload,
} from "../../lib/types";

type ProblemReviewPanelProps = {
  profile: AppUserProfile;
  uploadId: string;
};

type ProblemDraft = {
  questionText: string;
  choices: ChoiceEntry[];
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

function createDraft(problem: Problem): ProblemDraft {
  return {
    questionText: problem.questionText,
    choices: normalizeChoices(problem.choices),
    correctAnswer: problem.correctAnswer ?? "",
    aiSolution: problem.aiSolution ?? "",
    difficulty: problem.difficulty ?? "",
  };
}

function addEmptyChoice(choices: ChoiceEntry[]) {
  return [...choices, { label: "", text: "" }];
}

function DifficultyBadge({ difficulty }: { difficulty: "" | Difficulty }) {
  if (!difficulty) {
    return (
      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">
        Unset
      </span>
    );
  }

  return (
    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-sky-700 uppercase">
      {difficulty}
    </span>
  );
}

function ProblemPreview({
  draft,
  problem,
  viewerId,
  sourcePage,
}: {
  draft: ProblemDraft;
  problem: Problem;
  viewerId: string;
  sourcePage: number | null;
}) {
  const visibleChoices = draft.choices.filter(
    (choice) => choice.label.trim() || choice.text.trim(),
  );

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Preview
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950 sm:text-xl">
            Student-facing problem view
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <DifficultyBadge difficulty={draft.difficulty} />
          {sourcePage ? (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">
              Source page {sourcePage}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
            Question
          </p>
          <ProblemSourceImage
            problemId={problem.id}
            sourceImageUrl={problem.sourceImageUrl}
            viewerId={viewerId}
            viewerRole="instructor"
            alt="Problem source figure"
            className="mt-3"
          />
          <FormattedText
            text={draft.questionText}
            emptyText="Question text is empty."
            className="mt-3"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
            Answer choices
          </p>
          {visibleChoices.length ? (
            <div className="mt-3 grid gap-3">
              {visibleChoices.map((choice, index) => {
                const isCorrect =
                  draft.correctAnswer.trim() !== "" &&
                  draft.correctAnswer.trim() === choice.label.trim();

                return (
                  <div
                    key={`preview-choice-${index}`}
                    className={`rounded-2xl border px-4 py-3 ${
                      isCorrect
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {choice.label.trim() || "Unlabeled"}.
                      </span>
                      {isCorrect ? (
                        <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs font-semibold tracking-[0.14em] text-emerald-700 uppercase">
                          Correct
                        </span>
                      ) : null}
                    </div>
                    <FormattedText
                      text={choice.text}
                      emptyText="Choice text is empty."
                      className="mt-2"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-7 text-slate-500">
              No answer choices yet.
            </p>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
              Correct answer
            </p>
            <p className="mt-3 break-words text-sm font-semibold text-slate-900">
              {draft.correctAnswer.trim() || "Not set"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
              Solution
            </p>
            <FormattedText
              text={draft.aiSolution}
              emptyText="No solution provided."
              className="mt-3"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemEditorCard({
  profile,
  problem,
  onProblemUpdated,
}: {
  profile: AppUserProfile;
  problem: Problem;
  onProblemUpdated: (problem: Problem) => void;
}) {
  const [draft, setDraft] = useState<ProblemDraft>(() => createDraft(problem));
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const choiceLabels = useMemo(() => getChoiceLabels(draft.choices), [draft.choices]);

  function updateChoiceLabel(index: number, nextLabel: string) {
    setDraft((current) => {
      const previousLabel = current.choices[index]?.label ?? "";
      const nextChoices = current.choices.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, label: nextLabel } : choice,
      );

      const currentCorrectAnswer = current.correctAnswer.trim();
      const nextCorrectAnswer =
        previousLabel.trim() !== "" &&
        currentCorrectAnswer === previousLabel.trim()
          ? nextLabel.trim()
          : current.correctAnswer;

      return {
        ...current,
        choices: nextChoices,
        correctAnswer: nextCorrectAnswer,
      };
    });
  }

  function updateChoiceText(index: number, nextText: string) {
    setDraft((current) => ({
      ...current,
      choices: current.choices.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, text: nextText } : choice,
      ),
    }));
  }

  function addChoice() {
    setDraft((current) => ({
      ...current,
      choices: addEmptyChoice(current.choices),
    }));
  }

  function removeChoice(index: number) {
    setDraft((current) => {
      const removedChoice = current.choices[index];
      const nextChoices = current.choices.filter((_, choiceIndex) => choiceIndex !== index);
      const nextCorrectAnswer =
        removedChoice && current.correctAnswer.trim() === removedChoice.label.trim()
          ? ""
          : current.correctAnswer;

      return {
        ...current,
        choices: nextChoices,
        correctAnswer: nextCorrectAnswer,
      };
    });
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const updated = await updateProblem(problem.id, {
        questionText: draft.questionText.trim(),
        choices: choicesArrayToRecord(draft.choices),
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
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] sm:p-6">
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
        <ProblemPreview
          draft={draft}
          problem={problem}
          viewerId={profile.id}
          sourcePage={problem.sourcePage}
        />

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Edit
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">
                Update extracted content
              </h3>
            </div>
            <button
              type="button"
              onClick={addChoice}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              Add choice
            </button>
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

            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  Answer choices
                </label>
                <p className="text-sm text-slate-500">
                  Edit any label and text. Labels are not limited to A-D.
                </p>
              </div>

              {draft.choices.length ? (
                <div className="mt-3 grid gap-4">
                  {draft.choices.map((choice, index) => (
                    <div
                      key={`edit-choice-${index}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.3fr)_minmax(0,1fr)_auto]">
                        <div>
                          <label
                            htmlFor={`${problem.id}-choice-label-${index}`}
                            className="block text-sm font-medium text-slate-700"
                          >
                            Label
                          </label>
                          <input
                            id={`${problem.id}-choice-label-${index}`}
                            type="text"
                            value={choice.label}
                            onChange={(event) =>
                              updateChoiceLabel(index, event.target.value)
                            }
                            className="mt-2 w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`${problem.id}-choice-text-${index}`}
                            className="block text-sm font-medium text-slate-700"
                          >
                            Choice text
                          </label>
                          <input
                            id={`${problem.id}-choice-text-${index}`}
                            type="text"
                            value={choice.text}
                            onChange={(event) =>
                              updateChoiceText(index, event.target.value)
                            }
                            className="mt-2 w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeChoice(index)}
                            className="inline-flex min-h-12 items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  No choices yet. Add one to start building the answer set.
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label
                  htmlFor={`correct-answer-select-${problem.id}`}
                  className="block text-sm font-medium text-slate-700"
                >
                  Correct answer
                </label>
                <select
                  id={`correct-answer-select-${problem.id}`}
                  value={choiceLabels.includes(draft.correctAnswer.trim()) ? draft.correctAnswer : ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      correctAnswer: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">Select from current labels</option>
                  {choiceLabels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`correct-answer-input-${problem.id}`}
                  className="block text-sm font-medium text-slate-700"
                >
                  Manual correct answer label
                </label>
                <input
                  id={`correct-answer-input-${problem.id}`}
                  type="text"
                  value={draft.correctAnswer}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      correctAnswer: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
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
          </div>
        </section>

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

function DashboardButton() {
  return (
    <Link
      href={ROUTES.instructor}
      className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
    >
      Back to Dashboard
    </Link>
  );
}

export function ProblemReviewPanel({
  profile,
  uploadId,
}: ProblemReviewPanelProps) {
  const [upload, setUpload] = useState<TestUpload | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadNameDraft, setUploadNameDraft] = useState("");
  const [isSavingUploadName, setIsSavingUploadName] = useState(false);
  const [uploadNameMessage, setUploadNameMessage] = useState<string | null>(null);
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
        setUploadNameDraft(uploadData.originalFilename);
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

  function getUploadFileRoute(targetUploadId: string, version?: string | null) {
    const query = new URLSearchParams({
      instructorId: profile.id,
    });

    if (version) {
      query.set("v", version);
    }

    return `/api/instructor/uploads/${targetUploadId}/file?${query.toString()}`;
  }

  function handleProblemUpdated(updatedProblem: Problem) {
    setProblems((current) =>
      current.map((problem) =>
        problem.id === updatedProblem.id ? updatedProblem : problem,
      ),
    );
  }

  async function handleUploadRename() {
    if (!upload) {
      return;
    }

    setIsSavingUploadName(true);
    setUploadNameMessage(null);
    setErrorMessage(null);

    try {
      const updated = await updateInstructorTestUpload(upload.id, profile.id, {
        originalFilename: uploadNameDraft.trim(),
      });

      setUpload(updated);
      setUploadNameDraft(updated.originalFilename);
      setUploadNameMessage("Upload name updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to rename the upload.";
      setErrorMessage(message);
    } finally {
      setIsSavingUploadName(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <DashboardButton />
        <p className="mt-4 text-sm text-slate-600">Loading upload review...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <DashboardButton />
        <p className="mt-4 text-sm font-semibold tracking-[0.16em] text-rose-700 uppercase">
          Review Error
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">
          We could not load this upload.
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">{errorMessage}</p>
        <div className="mt-6">
          <Link
            href={ROUTES.instructor}
            className="text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
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
            <DashboardButton />
            <Link
              href={ROUTES.instructor}
              className="mt-4 block text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
            >
              Back to instructor dashboard
            </Link>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={getUploadFileRoute(
                  upload.id,
                  `${upload.originalFilename}:${upload.createdAt ?? ""}`,
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                Open uploaded file
              </a>
            </div>
            <div className="mt-4 grid gap-3">
              <label
                htmlFor="upload-name"
                className="block text-sm font-medium text-slate-700"
              >
                Upload name
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="upload-name"
                  type="text"
                  value={uploadNameDraft}
                  onChange={(event) => setUploadNameDraft(event.target.value)}
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={() => void handleUploadRename()}
                  disabled={
                    isSavingUploadName ||
                    uploadNameDraft.trim() === "" ||
                    uploadNameDraft.trim() === upload.originalFilename
                  }
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSavingUploadName ? "Saving..." : "Save name"}
                </button>
              </div>
            </div>
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

        {uploadNameMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {uploadNameMessage}
          </div>
        ) : null}
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
              key={`${problem.id}-${problem.questionText}-${problem.sourceImageUrl ?? ""}-${problem.correctAnswer ?? ""}-${JSON.stringify(problem.choices ?? {})}-${problem.aiSolution ?? ""}-${problem.difficulty ?? ""}-${problem.approved ? "approved" : "pending"}`}
              profile={profile}
              problem={problem}
              onProblemUpdated={handleProblemUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
