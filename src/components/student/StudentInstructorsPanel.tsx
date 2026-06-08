"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  listInstructorAssignedProblemProgress,
  listConnectedInstructors,
  listIncomingStudentConnectionRequests,
  respondToConnectionRequest,
} from "../../lib/connections/client";
import { getStudentInstructorRoute } from "../../lib/constants";
import { useStudentShell } from "./StudentShellContext";
import type {
  AppUserProfile,
  ConnectionRequestSummary,
  InstructorAssignedProblemProgress,
} from "../../lib/types";

function getDisplayName(profile: AppUserProfile) {
  return profile.name?.trim() || profile.nickname || profile.email;
}

export function StudentInstructorsPanel() {
  const { profile } = useStudentShell();
  const [showRequests, setShowRequests] = useState(false);
  const [requests, setRequests] = useState<ConnectionRequestSummary[]>([]);
  const [instructors, setInstructors] = useState<AppUserProfile[]>([]);
  const [instructorProgress, setInstructorProgress] = useState<
    InstructorAssignedProblemProgress[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRespondingId, setIsRespondingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [nextRequests, nextInstructors, nextInstructorProgress] = await Promise.all([
          listIncomingStudentConnectionRequests(profile.id),
          listConnectedInstructors(profile.id),
          listInstructorAssignedProblemProgress(profile.id),
        ]);

        if (!isActive) {
          return;
        }

        setRequests(nextRequests);
        setInstructors(nextInstructors);
        setInstructorProgress(nextInstructorProgress);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load instructor connections.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isActive = false;
    };
  }, [profile.id]);

  async function handleRespond(connectionId: string, accepted: boolean) {
    setIsRespondingId(connectionId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await respondToConnectionRequest(connectionId, profile.id, accepted);
      const [nextRequests, nextInstructors, nextInstructorProgress] = await Promise.all([
        listIncomingStudentConnectionRequests(profile.id),
        listConnectedInstructors(profile.id),
        listInstructorAssignedProblemProgress(profile.id),
      ]);

      setRequests(nextRequests);
      setInstructors(nextInstructors);
      setInstructorProgress(nextInstructorProgress);
      setSuccessMessage(
        accepted
          ? "Instructor connection accepted."
          : "Instructor connection declined.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update that request.",
      );
    } finally {
      setIsRespondingId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Instructor problems
        </h1>
      </section>

      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <p className="border border-emerald-300 bg-[rgba(239,247,241,0.92)] px-4 py-3 text-base font-semibold text-emerald-800">
              {profile.nickname ?? "Nickname unavailable"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowRequests((current) => !current)}
              className="border border-stone-400 bg-[rgba(255,253,248,0.9)] px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-stone-500"
            >
              {showRequests ? "Hide requests" : `Requests (${requests.length})`}
            </button>
          </div>
        </div>
      </section>

      {showRequests ? (
        <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
          <div className="grid gap-3">
            {isLoading ? (
              <p className="text-sm text-slate-600">Loading requests...</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-slate-600">No requests yet.</p>
            ) : (
              requests.map((request) => (
                <article
                  key={request.connection.id}
                  className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4"
                >
                  <p className="font-medium text-slate-900">
                    {getDisplayName(request.instructor)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleRespond(request.connection.id, true)}
                      disabled={isRespondingId === request.connection.id}
                      className="border border-[#43594c] bg-[#526b5c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#43594c] disabled:cursor-not-allowed disabled:border-stone-400 disabled:bg-stone-400"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRespond(request.connection.id, false)}
                      disabled={isRespondingId === request.connection.id}
                      className="border border-stone-400 bg-[rgba(255,253,248,0.9)] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-stone-500 disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <div className="grid gap-3">
          {isLoading ? (
            <p className="text-sm text-slate-600">Loading instructors...</p>
          ) : instructors.length === 0 ? (
            <p className="text-sm text-slate-600">No instructors connected yet.</p>
          ) : (
            instructorProgress.map((item) => (
              <Link
                key={item.instructor.id}
                href={getStudentInstructorRoute(item.instructor.id)}
                className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-5 transition hover:border-[#526b5c]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">
                      {getDisplayName(item.instructor)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.solvedCount}/{item.totalCount}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {successMessage ? (
          <div className="mt-6 border border-emerald-300 bg-[rgba(239,247,241,0.94)] px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 border border-rose-300 bg-[rgba(255,243,240,0.95)] px-4 py-3 text-sm text-rose-800">
            {errorMessage}
          </div>
        ) : null}
      </section>
    </div>
  );
}
