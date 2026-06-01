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
import type {
  AppUserProfile,
  ConnectionRequestSummary,
  InstructorAssignedProblemProgress,
} from "../../lib/types";

function getDisplayName(profile: AppUserProfile) {
  return profile.name?.trim() || profile.nickname || profile.email;
}

export function StudentConnectionsPanel({
  profile,
}: {
  profile: AppUserProfile;
}) {
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
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <p className="text-sm font-semibold tracking-[0.16em] text-emerald-700 uppercase">
          Instructor network
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">
          Your student nickname
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          Share this nickname with an instructor so they can send you a connection request.
        </p>
        <div className="mt-5 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-base font-semibold text-emerald-800">
          {profile.nickname ?? "Nickname unavailable"}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Pending instructor requests
        </h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="mt-4 text-sm leading-7 text-slate-700">
            No instructor requests yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-4">
            {requests.map((request) => (
              <article
                key={request.connection.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-lg font-semibold text-slate-950">
                  {getDisplayName(request.instructor)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Nickname: {request.instructor.nickname ?? "Unknown"}
                </p>
                <p className="mt-4 text-sm text-slate-700">
                  Connect so this instructor can assign questions and review your sessions.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleRespond(request.connection.id, true)}
                    disabled={isRespondingId === request.connection.id}
                    className="min-h-11 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRespond(request.connection.id, false)}
                    disabled={isRespondingId === request.connection.id}
                    className="min-h-11 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Decline
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Connected instructors
        </h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading instructors...</p>
        ) : instructors.length === 0 ? (
          <p className="mt-4 text-sm leading-7 text-slate-700">
            No instructors connected yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {instructors.map((instructor) => (
              <article
                key={instructor.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-lg font-semibold text-slate-950">
                  {getDisplayName(instructor)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Nickname: {instructor.nickname ?? "Unknown"}
                </p>
                <p className="mt-1 text-sm text-slate-600">{instructor.email}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Instructor problem pages
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          Open a separate page for each instructor and track how many assigned problems you have solved.
        </p>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading instructor pages...</p>
        ) : instructorProgress.length === 0 ? (
          <p className="mt-4 text-sm leading-7 text-slate-700">
            No instructor pages are available yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {instructorProgress.map((item) => (
              <Link
                key={item.instructor.id}
                href={getStudentInstructorRoute(item.instructor.id)}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <p className="text-lg font-semibold text-slate-950">
                  {getDisplayName(item.instructor)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {item.solvedCount}/{item.totalCount}
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  {item.unsolvedCount === 0
                    ? "Everything assigned by this instructor is solved."
                    : `${item.unsolvedCount} assigned problem${item.unsolvedCount === 1 ? "" : "s"} still pending.`}
                </p>
              </Link>
            ))}
          </div>
        )}

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
