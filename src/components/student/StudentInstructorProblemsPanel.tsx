"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FormattedText } from "../shared/FormattedText";
import { getInstructorAssignedProblemProgress } from "../../lib/connections/client";
import { getStudentInstructorRoute } from "../../lib/constants";
import type {
  AppUserProfile,
  InstructorAssignedProblemProgress,
} from "../../lib/types";

function getDisplayName(profile: AppUserProfile) {
  return profile.name?.trim() || profile.nickname || profile.email;
}

export function StudentInstructorProblemsPanel({
  profile,
  instructorId,
}: {
  profile: AppUserProfile;
  instructorId: string;
}) {
  const [progress, setProgress] = useState<InstructorAssignedProblemProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadProgress() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const nextProgress = await getInstructorAssignedProblemProgress(
          profile.id,
          instructorId,
        );

        if (!isActive) {
          return;
        }

        setProgress(nextProgress);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load this instructor page.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProgress();

    return () => {
      isActive = false;
    };
  }, [instructorId, profile.id]);

  if (isLoading) {
    return (
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <p className="text-sm text-slate-600">Loading instructor problems...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="border border-rose-300 bg-[rgba(255,243,240,0.95)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <p className="text-sm font-semibold tracking-[0.16em] text-rose-700 uppercase">
          Load Error
        </p>
        <p className="mt-3 text-sm leading-7 text-rose-700">{errorMessage}</p>
      </section>
    );
  }

  if (!progress) {
    return (
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <p className="text-sm text-slate-700">This instructor page is not available.</p>
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={getStudentInstructorRoute(progress.instructor.id)}
            className="min-h-11 border border-[#43594c] bg-[#526b5c] px-4 py-2 text-sm font-semibold text-white"
          >
            {getDisplayName(progress.instructor)} {progress.solvedCount}/{progress.totalCount}
          </Link>
        </div>

        <h2 className="mt-5 text-2xl font-semibold text-slate-950">
          {getDisplayName(progress.instructor)}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Solved
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {progress.solvedCount} / {progress.totalCount}
            </p>
          </div>
          <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Unsolved
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {progress.unsolvedCount}
            </p>
          </div>
          <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Nickname
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {progress.instructor.nickname ?? "Unknown"}
            </p>
          </div>
        </div>
      </section>

      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <h2 className="text-2xl font-semibold text-slate-950">Assigned problems</h2>

        {progress.items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-700">
            This instructor has not assigned any problems yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-4">
            {progress.items.map((item) => (
              <article
                key={item.assignment.id}
                className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Problem {item.assignment.problem.id.slice(0, 8)}
                    </p>
                    {item.assignment.upload ? (
                      <p className="mt-1 text-sm text-slate-600">
                        Upload: {item.assignment.upload.originalFilename}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase ${
                      item.solved
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.solved ? "Solved" : "Unsolved"}
                  </span>
                </div>

                <div className="mt-4 border border-stone-300 bg-[rgba(255,253,248,0.92)] p-4">
                  <FormattedText
                    text={item.assignment.problem.questionText}
                    emptyText="Question text is missing."
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
