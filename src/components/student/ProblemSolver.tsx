"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSessionProgress,
  getSessionProblems,
  upsertSubmission,
} from "../../lib/student-sessions/client";
import {
  getStudentSessionProblemRoute,
  getStudentSessionResultsRoute,
} from "../../lib/constants";
import type {
  AppUserProfile,
  SessionProblemWithProblem,
  SessionProgress,
} from "../../lib/types";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_FILE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function getChoiceValue(
  choices: Record<string, string> | null,
  key: "A" | "B" | "C" | "D",
) {
  return typeof choices?.[key] === "string" ? choices[key] : "";
}

function validatePhoto(file: File | null) {
  if (!file) {
    return null;
  }

  if (!ALLOWED_FILE_TYPES.has(file.type)) {
    return "Unsupported photo type. Upload PNG, JPEG, or WEBP.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Photo is too large. The limit is 20 MB.";
  }

  return null;
}

export function ProblemSolver({
  profile,
  sessionId,
  index,
}: {
  profile: AppUserProfile;
  sessionId: string;
  index: number;
}) {
  const router = useRouter();
  const [sessionProblems, setSessionProblems] = useState<SessionProblemWithProblem[]>([]);
  const [currentProblem, setCurrentProblem] = useState<SessionProblemWithProblem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadProblem() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        const [problems, nextProgress] = await Promise.all([
          getSessionProblems(sessionId, profile.id),
          getSessionProgress(sessionId, profile.id),
        ]);
        const problem = problems.find((item) => item.orderIndex === index - 1) ?? null;

        if (!isActive) {
          return;
        }

        setSessionProblems(problems);
        setProgress(nextProgress);
        setCurrentProblem(problem);
        setSelectedAnswer(problem?.submission?.selectedAnswer ?? "");
        setSelectedPhoto(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load the practice problem.";
        setErrorMessage(message);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProblem();

    return () => {
      isActive = false;
    };
  }, [index, profile.id, reloadNonce, sessionId]);

  async function handleSave() {
    if (!currentProblem) {
      return;
    }

    const normalizedAnswer = selectedAnswer.trim().toUpperCase();
    if (!["A", "B", "C", "D"].includes(normalizedAnswer)) {
      setErrorMessage("Choose one answer before saving.");
      return;
    }

    const photoError = validatePhoto(selectedPhoto);
    if (photoError) {
      setErrorMessage(photoError);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("sessionProblemId", currentProblem.id);
      formData.append("studentId", profile.id);
      formData.append("selectedAnswer", normalizedAnswer);

      if (selectedPhoto) {
        formData.append("file", selectedPhoto);
      }

      const payload = await upsertSubmission(formData);

      if (payload.allSubmitted) {
        router.push(getStudentSessionResultsRoute(sessionId));
        return;
      }

      setSuccessMessage("Answer saved.");
      setReloadNonce((current) => current + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save the answer.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <p className="text-sm text-slate-600">Loading problem...</p>
      </section>
    );
  }

  if (errorMessage && !currentProblem) {
    return (
      <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          We could not load this problem.
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">{errorMessage}</p>
      </section>
    );
  }

  if (!currentProblem) {
    return (
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Problem not found
        </h2>
      </section>
    );
  }

  const totalProblems = sessionProblems.length;
  const currentProblemNumber = currentProblem.orderIndex + 1;
  const isCompleted = progress?.session.completed ?? false;
  const previousIndex = currentProblemNumber > 1 ? currentProblemNumber - 1 : null;
  const nextIndex =
    currentProblemNumber < totalProblems ? currentProblemNumber + 1 : null;

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-emerald-700 uppercase">
              Problem {currentProblemNumber} of {totalProblems}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              Solve one problem at a time
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Correctness, solutions, and AI feedback stay locked until every
              problem in today&apos;s session has been submitted.
            </p>
          </div>
          <Link
            href={getStudentSessionResultsRoute(sessionId)}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            Session results
          </Link>
        </div>

        <div className="-mx-1 mt-6 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2 px-1">
          {sessionProblems.map((problem) => {
            const problemNumber = problem.orderIndex + 1;
            const isCurrent = problemNumber === currentProblemNumber;
            const isSubmitted = problem.submission !== null;

            return (
              <Link
                key={problem.id}
                href={getStudentSessionProblemRoute(sessionId, problemNumber)}
                className={`min-h-11 min-w-11 rounded-full border px-3 py-2 text-base font-semibold transition ${
                  isCurrent
                    ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                    : isSubmitted
                      ? "border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                {problemNumber}
              </Link>
            );
          })}
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h3 className="break-words text-xl leading-8 font-semibold text-slate-950 sm:text-2xl">
          {currentProblem.problem.questionText}
        </h3>

        <div className="mt-6 grid gap-3">
          {(["A", "B", "C", "D"] as const).map((choiceKey) => {
            const choiceValue = getChoiceValue(currentProblem.problem.choices, choiceKey);
            if (!choiceValue) {
              return null;
            }

            return (
              <label
                key={choiceKey}
                className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 text-base leading-7 transition ${
                  selectedAnswer === choiceKey
                    ? "border-emerald-400 bg-emerald-50 text-slate-950"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name={`selected-answer-${currentProblem.id}`}
                  value={choiceKey}
                  checked={selectedAnswer === choiceKey}
                  onChange={(event) => setSelectedAnswer(event.target.value)}
                  disabled={isCompleted}
                  className="mt-1"
                />
                <span className="break-words">
                  <span className="font-semibold">{choiceKey}.</span> {choiceValue}
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <label className="block text-sm font-medium text-slate-700">
            Notebook solution photo
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={isCompleted}
            onChange={(event) =>
              setSelectedPhoto(event.target.files?.[0] ?? null)
            }
            className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
          />
          <p className="mt-3 text-sm text-slate-500">
            Selected photo: {selectedPhoto?.name ?? "No new photo selected. On a phone, this opens your camera or gallery picker."}
          </p>
          {currentProblem.submission?.solutionPhotoUrl ? (
            <p className="mt-2 text-sm text-slate-500">
              Existing uploaded photo: {currentProblem.submission.solutionPhotoUrl}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {isCompleted ? (
            <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              This session has already been graded. Answers are now read-only.
            </div>
          ) : null}
          {previousIndex ? (
            <Link
              href={getStudentSessionProblemRoute(sessionId, previousIndex)}
              className="min-h-12 rounded-full border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              Previous
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || isCompleted}
            className="min-h-12 rounded-full bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSaving ? "Saving..." : "Save answer"}
          </button>
          {nextIndex ? (
            <Link
              href={getStudentSessionProblemRoute(sessionId, nextIndex)}
              className="min-h-12 rounded-full border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              Next
            </Link>
          ) : null}
        </div>

        {successMessage ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}
      </section>
    </div>
  );
}
