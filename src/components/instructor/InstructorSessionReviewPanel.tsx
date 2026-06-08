"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { FormattedText } from "../shared/FormattedText";
import {
  getSessionProblemsForReview,
  listStudentSessionSummaries,
} from "../../lib/student-sessions/client";
import { getStudentSubmissionPhotoRoute } from "../../lib/constants";
import { listConnectedStudents } from "../../lib/connections/client";
import { useInstructorShell } from "./InstructorShellContext";
import type {
  AppUserProfile,
  SessionProblemWithProblem,
  StudentSessionSummary,
} from "../../lib/types";

function getDisplayName(profile: AppUserProfile) {
  return profile.name?.trim() || profile.nickname || profile.email;
}

export function InstructorSessionReviewPanel({
  studentId,
  sessionId,
}: {
  studentId?: string;
  sessionId?: string;
}) {
  const { profile } = useInstructorShell();
  const [photoSize, setPhotoSize] = useState<"full" | "compact">("full");
  const [photoRotations, setPhotoRotations] = useState<Record<string, number>>({});
  const [students, setStudents] = useState<AppUserProfile[]>([]);
  const [sessionSummaries, setSessionSummaries] = useState<StudentSessionSummary[]>([]);
  const [sessionProblems, setSessionProblems] = useState<SessionProblemWithProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadReviewData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const nextStudents = await listConnectedStudents(profile.id);
        if (!isActive) {
          return;
        }

        setStudents(nextStudents);
        const resolvedStudentId =
          studentId && nextStudents.some((student) => student.id === studentId)
            ? studentId
            : nextStudents[0]?.id ?? "";

        if (!resolvedStudentId) {
          setSessionSummaries([]);
          setSessionProblems([]);
          return;
        }

        const nextSummaries = await listStudentSessionSummaries(resolvedStudentId);

        if (!isActive) {
          return;
        }

        setSessionSummaries(nextSummaries);
        const resolvedSessionId =
          sessionId &&
          nextSummaries.some((summary) => summary.session.id === sessionId)
            ? sessionId
            : nextSummaries[0]?.session.id ?? "";

        if (!resolvedSessionId) {
          setSessionProblems([]);
          return;
        }

        const nextProblems = await getSessionProblemsForReview(
          resolvedSessionId,
          resolvedStudentId,
        );

        if (!isActive) {
          return;
        }

        setSessionProblems(nextProblems);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load this session review.",
        );
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
  }, [profile.id, sessionId, studentId]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === studentId) ?? students[0] ?? null,
    [studentId, students],
  );
  const selectedSummary = useMemo(
    () => sessionSummaries.find((summary) => summary.session.id === sessionId) ?? sessionSummaries[0] ?? null,
    [sessionId, sessionSummaries],
  );

  function rotatePhoto(photoKey: string) {
    setPhotoRotations((current) => ({
      ...current,
      [photoKey]: ((current[photoKey] ?? 0) + 90) % 360,
    }));
  }

  if (isLoading) {
    return (
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <p className="text-sm text-slate-600">Loading session review...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="border border-rose-300 bg-[rgba(255,243,240,0.95)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <h1 className="text-2xl font-semibold text-slate-950">Session review unavailable</h1>
        <p className="mt-3 text-sm leading-7 text-rose-800">{errorMessage}</p>
      </section>
    );
  }

  if (!selectedStudent) {
    return (
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <h1 className="text-2xl font-semibold text-slate-950">Session review</h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          Connect to a student first, then choose a session from the left sidebar.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          {getDisplayName(selectedStudent)}
        </h1>
      </section>

      {selectedSummary ? (
        <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Student
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {getDisplayName(selectedStudent)}
              </p>
            </div>
            <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Session date
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {selectedSummary.session.sessionDate}
              </p>
            </div>
            <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Submitted
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {selectedSummary.submittedCount}/{selectedSummary.totalProblems}
              </p>
            </div>
            <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Status
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {selectedSummary.status}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold text-slate-950">Problems and solutions</h2>
          <div className="flex gap-2">
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
        </div>
        {sessionProblems.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No problems found for this session.</p>
        ) : (
          <div className="mt-5 grid gap-5">
            {sessionProblems.map((item) => {
              const feedback = item.submission?.aiFeedback ?? null;
              const isCorrect = item.submission?.isCorrect ?? feedback?.is_correct ?? null;

              return (
                <article
                  key={item.id}
                  className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                        Problem {item.orderIndex + 1}
                      </p>
                      <FormattedText
                        text={item.problem.questionText}
                        emptyText="Question text is missing."
                        className="mt-2"
                      />
                    </div>
                    <span
                      className={`border px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase ${
                        isCorrect === true
                          ? "border-emerald-300 bg-[rgba(239,247,241,0.94)] text-emerald-800"
                          : isCorrect === false
                            ? "border-rose-300 bg-[rgba(255,243,240,0.95)] text-rose-800"
                            : "border-stone-300 bg-[rgba(255,253,248,0.9)] text-slate-700"
                      }`}
                    >
                      {isCorrect === true
                        ? "Correct"
                        : isCorrect === false
                          ? "Wrong"
                          : "Ungraded"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-4">
                      <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                        Student answer
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {item.submission?.selectedAnswer ?? "No answer"}
                      </p>
                    </div>
                    <div className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-4">
                      <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                        Correct answer
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {item.problem.correctAnswer ?? "Not set"}
                      </p>
                    </div>
                    <div className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-4">
                      <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                        AI verdict
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {feedback?.feedback ?? "No AI feedback yet"}
                      </p>
                    </div>
                  </div>

                  {item.submission?.solutionPhotoUrls.length ? (
                    <div className="mt-4 grid gap-3">
                      {item.submission.solutionPhotoUrls.map((_, photoIndex) => (
                        <div
                          key={`${item.submission?.id ?? item.id}-photo-${photoIndex}`}
                          className={`border border-stone-300 bg-[rgba(255,253,248,0.94)] ${
                            photoSize === "compact" ? "max-w-md" : ""
                          }`}
                        >
                          <div className="flex justify-end border-b border-stone-300 px-3 py-2">
                            <button
                              type="button"
                              onClick={() =>
                                rotatePhoto(
                                  `${item.submission?.id ?? item.id}-photo-${photoIndex}`,
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
                              item.id,
                              selectedStudent.id,
                              item.submission?.submittedAt,
                              photoIndex,
                            )}
                            alt={`Student solution photo ${photoIndex + 1}`}
                            width={1200}
                            height={1600}
                            unoptimized
                            className={`object-contain transition-transform ${photoSize === "compact" ? "h-auto max-h-[28rem] w-full" : "h-auto w-full"}`}
                            style={{
                              transform: `rotate(${photoRotations[`${item.submission?.id ?? item.id}-photo-${photoIndex}`] ?? 0}deg)`,
                              transformOrigin: "center",
                            }}
                          />
                        </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-4">
                    <div className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-4">
                      <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                        Guided solution
                      </p>
                      <FormattedText
                        text={feedback?.guided_solution ?? item.problem.aiSolution ?? ""}
                        emptyText="No AI solution available."
                        className="mt-2"
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
