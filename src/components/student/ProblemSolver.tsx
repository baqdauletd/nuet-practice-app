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
  const [photoSize, setPhotoSize] = useState<"full" | "compact">("full");
  const [photoRotations, setPhotoRotations] = useState<Record<string, number>>({});
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

  function rotatePhoto(photoKey: string) {
    setPhotoRotations((current) => ({
      ...current,
      [photoKey]: ((current[photoKey] ?? 0) + 90) % 360,
    }));
  }

  if (isLoading) {
    return (
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <p className="text-sm text-slate-600">Loading problem...</p>
      </section>
    );
  }

  if (errorMessage && !currentProblem) {
    return (
      <section className="border border-rose-300 bg-[rgba(255,243,240,0.95)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          We could not load this problem.
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">{errorMessage}</p>
      </section>
    );
  }

  if (!currentProblem) {
    return (
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
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
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-emerald-700 uppercase">
              Problem {currentProblemNumber} of {totalProblems}
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
                className={`min-h-11 min-w-11 border px-3 py-2 text-base font-semibold transition ${
                  isCurrent
                    ? "border-[#526b5c] bg-[rgba(239,247,241,0.92)] text-[#43594c]"
                    : isSubmitted
                      ? "border-stone-400 bg-[rgba(246,240,231,0.72)] text-slate-700 hover:border-[#526b5c]"
                      : "border-stone-300 bg-[rgba(255,253,248,0.92)] text-slate-500 hover:border-stone-400 hover:text-slate-700"
                }`}
              >
                {problemNumber}
              </Link>
            );
          })}
          </div>
        </div>
      </section>

      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
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
                className={`flex min-h-14 cursor-pointer items-start gap-3 border px-4 py-4 text-base leading-7 transition ${
                  selectedAnswer === choice.label
                    ? "border-[#526b5c] bg-[rgba(239,247,241,0.92)] text-slate-950"
                    : "border-stone-300 bg-[rgba(246,240,231,0.72)] text-slate-700 hover:border-stone-400"
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

        <div className="mt-6 border border-stone-300 bg-[rgba(246,240,231,0.72)] p-5">
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
          {selectedPhotos.length > 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              {selectedPhotos.map((photo) => photo.name).join(", ")}
            </p>
          ) : null}
          {currentProblem.submission?.solutionPhotoUrls.length ? (
            <div className="mt-4">
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPhotoSize("full")}
                  className={`border px-3 py-2 text-xs font-semibold tracking-[0.14em] uppercase ${
                    photoSize === "full"
                      ? "border-[#526b5c] bg-[rgba(239,247,241,0.92)] text-[#43594c]"
                      : "border-stone-400 bg-[rgba(255,253,248,0.9)] text-slate-700"
                  }`}
                >
                  Full photos
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoSize("compact")}
                  className={`border px-3 py-2 text-xs font-semibold tracking-[0.14em] uppercase ${
                    photoSize === "compact"
                      ? "border-[#526b5c] bg-[rgba(239,247,241,0.92)] text-[#43594c]"
                      : "border-stone-400 bg-[rgba(255,253,248,0.9)] text-slate-700"
                  }`}
                >
                  Compact photos
                </button>
              </div>
              <div className="mt-3 grid gap-3">
                {currentProblem.submission.solutionPhotoUrls.map((_, photoIndex) => (
                  <div
                    key={`${currentProblem.submission?.id ?? currentProblem.id}-photo-${photoIndex}`}
                    className={`border border-stone-300 bg-[rgba(255,253,248,0.92)] ${
                      photoSize === "compact" ? "max-w-md" : ""
                    }`}
                  >
                    <div className="flex justify-end border-b border-stone-300 px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          rotatePhoto(
                            `${currentProblem.submission?.id ?? currentProblem.id}-photo-${photoIndex}`,
                          )
                        }
                        className="border border-stone-400 bg-[rgba(255,253,248,0.9)] px-3 py-1 text-xs font-semibold tracking-[0.14em] text-slate-700 uppercase transition hover:border-stone-500"
                      >
                        Rotate
                      </button>
                    </div>
                    <div className="overflow-hidden">
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
                      className={`object-contain transition-transform ${
                        photoSize === "compact" ? "h-auto max-h-[28rem] w-full" : "h-auto w-full"
                      }`}
                      style={{
                        transform: `rotate(${photoRotations[`${currentProblem.submission?.id ?? currentProblem.id}-photo-${photoIndex}`] ?? 0}deg)`,
                        transformOrigin: "center",
                      }}
                    />
                    </div>
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
              className="min-h-12 border border-stone-400 bg-[rgba(255,253,248,0.9)] px-5 py-3 text-base font-semibold text-slate-700 transition hover:border-[#526b5c] hover:text-slate-950"
            >
              Previous
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || isCompleted}
            className="min-h-12 border border-[#43594c] bg-[#526b5c] px-5 py-3 text-base font-semibold text-white transition hover:bg-[#43594c] disabled:cursor-not-allowed disabled:border-stone-400 disabled:bg-stone-400"
          >
            {isSaving ? "Saving..." : "Save answer"}
          </button>
          {nextIndex ? (
            <Link
              href={getStudentSessionProblemRoute(sessionId, nextIndex)}
              className="min-h-12 border border-stone-400 bg-[rgba(255,253,248,0.9)] px-5 py-3 text-base font-semibold text-slate-700 transition hover:border-[#526b5c] hover:text-slate-950"
            >
              Next
            </Link>
          ) : null}
        </div>

        {successMessage ? (
          <div className="mt-6 border border-emerald-300 bg-[rgba(239,247,241,0.94)] px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 border border-rose-300 bg-[rgba(255,243,240,0.95)] px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}
      </section>
    </div>
  );
}
