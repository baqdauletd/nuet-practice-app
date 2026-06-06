"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormattedText } from "../shared/FormattedText";
import { ProblemSourceImage } from "../shared/ProblemSourceImage";
import { getChoiceEntries } from "../../lib/choices";
import {
  getSessionProgress,
  getSessionProblems,
  upsertSubmission,
} from "../../lib/student-sessions/client";
import {
  getStudentSessionProblemRoute,
  getStudentSessionResultsRoute,
  getStudentSubmissionPhotoRoute,
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

function validatePhotos(files: File[]) {
  for (const file of files) {
    const error = validatePhoto(file);

    if (error) {
      return error;
    }
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
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
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
        setSelectedPhotos([]);
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

    const normalizedAnswer = selectedAnswer.trim();
    const choiceLabels = getChoiceEntries(currentProblem.problem.choices).map((choice) =>
      choice.label.trim(),
    );

    if (!choiceLabels.includes(normalizedAnswer)) {
      setErrorMessage("Choose one answer before saving.");
      return;
    }

    const photoError = validatePhotos(selectedPhotos);
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

      for (const photo of selectedPhotos) {
        formData.append("files", photo);
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
        <ProblemSourceImage
          problemId={currentProblem.problem.id}
          sourceImageUrl={currentProblem.problem.sourceImageUrl}
          viewerId={profile.id}
          viewerRole="student"
          alt="Problem source figure"
          className="mb-5"
        />
        <div className="break-words text-xl leading-8 font-semibold text-slate-950 sm:text-2xl">
          <FormattedText
            text={currentProblem.problem.questionText}
            emptyText="Question text is missing."
            className="text-xl leading-8 font-semibold text-slate-950 sm:text-2xl"
          />
        </div>

        <div className="mt-6 grid gap-3">
          {getChoiceEntries(currentProblem.problem.choices).map((choice) => {
            return (
              <label
                key={`${choice.label}-${choice.text}`}
                className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 text-base leading-7 transition ${
                  selectedAnswer === choice.label
                    ? "border-emerald-400 bg-emerald-50 text-slate-950"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name={`selected-answer-${currentProblem.id}`}
                  value={choice.label}
                  checked={selectedAnswer === choice.label}
                  onChange={(event) => setSelectedAnswer(event.target.value)}
                  disabled={isCompleted}
                  className="mt-1"
                />
                <div className="min-w-0 break-words">
                  <span className="font-semibold">{choice.label}.</span>
                  <FormattedText
                    text={choice.text}
                    emptyText="Choice text is missing."
                    className="mt-1"
                  />
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <label className="block text-sm font-medium text-slate-700">
            Notebook solution photos
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            disabled={isCompleted}
            onChange={(event) =>
              setSelectedPhotos(Array.from(event.target.files ?? []))
            }
            className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
          />
          <p className="mt-3 text-sm text-slate-500">
            {selectedPhotos.length > 0
              ? `Selected photos: ${selectedPhotos.map((photo) => photo.name).join(", ")}`
              : "No new photos selected. On a phone, this opens your camera or gallery picker."}
          </p>
          {currentProblem.submission?.solutionPhotoUrls.length ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700">
                Existing uploaded photos
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Choose one or more files above and save again to replace them.
              </p>
              <div className="mt-3 grid gap-3">
                {currentProblem.submission.solutionPhotoUrls.map((_, photoIndex) => (
                  <div
                    key={`${currentProblem.submission?.id ?? currentProblem.id}-photo-${photoIndex}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <Image
                      src={getStudentSubmissionPhotoRoute(
                        currentProblem.id,
                        profile.id,
                        currentProblem.submission?.submittedAt,
                        photoIndex,
                      )}
                      alt={`Uploaded notebook solution ${photoIndex + 1}`}
                      width={1200}
                      height={1600}
                      unoptimized
                      className="h-auto w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
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
