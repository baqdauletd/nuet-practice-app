"use client";

import { useEffect, useMemo, useState } from "react";
import { FormattedText } from "../shared/FormattedText";
import {
  assignProblemsToStudent,
  disconnectStudent,
  listConnectedStudents,
  listAssignedProblemsForInstructorStudent,
  listInstructorConnectionRequests,
  listInstructorOwnedApprovedProblems,
  sendConnectionRequestByNickname,
} from "../../lib/connections/client";
import { useInstructorShell } from "./InstructorShellContext";
import type { AppUserProfile, AssignedProblem, ConnectionRequestSummary } from "../../lib/types";

function getDisplayName(profile: AppUserProfile) {
  return profile.name?.trim() || profile.nickname || profile.email;
}

export function InstructorStudentsPanel() {
  const { profile } = useInstructorShell();
  const [studentNickname, setStudentNickname] = useState("");
  const [requests, setRequests] = useState<ConnectionRequestSummary[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [students, setStudents] = useState<AppUserProfile[]>([]);
  const [ownedProblems, setOwnedProblems] = useState<
    Array<{ problem: AssignedProblem["problem"]; upload: AssignedProblem["upload"] }>
  >([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [assignedProblemIds, setAssignedProblemIds] = useState<Set<string>>(new Set());
  const [pendingProblemIds, setPendingProblemIds] = useState<string[]>([]);
  const [expandedUploadIds, setExpandedUploadIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDisconnectingStudentId, setIsDisconnectingStudentId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [nextRequests, nextStudents, nextOwnedProblems] = await Promise.all([
          listInstructorConnectionRequests(profile.id),
          listConnectedStudents(profile.id),
          listInstructorOwnedApprovedProblems(profile.id),
        ]);

        if (!isActive) {
          return;
        }

        setRequests(nextRequests);
        setStudents(nextStudents);
        setOwnedProblems(nextOwnedProblems);
        setSelectedStudentId((current) => current || nextStudents[0]?.id || "");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load students and assignments.",
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

  useEffect(() => {
    let isActive = true;

    async function loadAssignedProblems() {
      if (!selectedStudentId) {
        setAssignedProblemIds(new Set());
        setPendingProblemIds([]);
        return;
      }

      try {
        const nextAssignedProblems = await listAssignedProblemsForInstructorStudent(
          profile.id,
          selectedStudentId,
        );

        if (!isActive) {
          return;
        }

        setAssignedProblemIds(
          new Set(nextAssignedProblems.map((assignment) => assignment.problem.id)),
        );
        setPendingProblemIds([]);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load assigned problems.",
        );
      }
    }

    void loadAssignedProblems();

    return () => {
      isActive = false;
    };
  }, [profile.id, selectedStudentId]);

  const groupedOwnedProblems = useMemo(() => {
    const groups = new Map<
      string,
      {
        uploadId: string;
        uploadName: string;
        items: Array<{ problem: AssignedProblem["problem"]; upload: AssignedProblem["upload"] }>;
      }
    >();

    for (const item of ownedProblems) {
      const uploadId = item.upload?.id ?? `missing-${item.problem.id}`;
      const uploadName = item.upload?.originalFilename ?? "Untitled upload";
      const current = groups.get(uploadId) ?? {
        uploadId,
        uploadName,
        items: [],
      };
      current.items.push(item);
      groups.set(uploadId, current);
    }

    return [...groups.values()].sort((left, right) =>
      left.uploadName.localeCompare(right.uploadName),
    );
  }, [ownedProblems]);

  async function refreshStudentsData() {
    const [nextRequests, nextStudents] = await Promise.all([
      listInstructorConnectionRequests(profile.id),
      listConnectedStudents(profile.id),
    ]);
    setRequests(nextRequests);
    setStudents(nextStudents);
    setSelectedStudentId((current) => {
      if (current && nextStudents.some((student) => student.id === current)) {
        return current;
      }

      return nextStudents[0]?.id ?? "";
    });
  }

  async function handleSendRequest() {
    if (!studentNickname.trim()) {
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await sendConnectionRequestByNickname(
        profile.id,
        studentNickname.trim().toLowerCase(),
      );
      await refreshStudentsData();
      setStudentNickname("");
      setSuccessMessage("Connection request sent.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to send that connection request.",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleDisconnect(studentId: string) {
    setIsDisconnectingStudentId(studentId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await disconnectStudent(profile.id, studentId);
      await refreshStudentsData();
      setSuccessMessage("Student disconnected.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to disconnect that student.",
      );
    } finally {
      setIsDisconnectingStudentId("");
    }
  }

  async function handleAssignProblems() {
    if (!selectedStudentId || pendingProblemIds.length === 0) {
      return;
    }

    setIsAssigning(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await assignProblemsToStudent(profile.id, selectedStudentId, pendingProblemIds);
      const nextAssignedProblems = await listAssignedProblemsForInstructorStudent(
        profile.id,
        selectedStudentId,
      );
      setAssignedProblemIds(
        new Set(nextAssignedProblems.map((assignment) => assignment.problem.id)),
      );
      setPendingProblemIds([]);
      setSuccessMessage("Problems assigned to student.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to assign those problems.",
      );
    } finally {
      setIsAssigning(false);
    }
  }

  function togglePendingProblem(problemId: string) {
    if (assignedProblemIds.has(problemId)) {
      return;
    }

    setPendingProblemIds((current) =>
      current.includes(problemId)
        ? current.filter((item) => item !== problemId)
        : [...current, problemId],
    );
  }

  function toggleUploadExpanded(uploadId: string) {
    setExpandedUploadIds((current) =>
      current.includes(uploadId)
        ? current.filter((item) => item !== uploadId)
        : [...current, uploadId],
    );
  }

  function toggleWholeUpload(group: {
    uploadId: string;
    items: Array<{ problem: AssignedProblem["problem"] }>;
  }) {
    const unassignedProblemIds = group.items
      .map((item) => item.problem.id)
      .filter((problemId) => !assignedProblemIds.has(problemId));

    if (unassignedProblemIds.length === 0) {
      return;
    }

    const allPending = unassignedProblemIds.every((problemId) =>
      pendingProblemIds.includes(problemId),
    );

    setPendingProblemIds((current) => {
      if (allPending) {
        return current.filter((problemId) => !unassignedProblemIds.includes(problemId));
      }

      return [...new Set([...current, ...unassignedProblemIds])];
    });
  }

  return (
    <div className="grid gap-6">
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Manage students and assignments
        </h1>
      </section>

      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <p className="border border-emerald-300 bg-[rgba(239,247,241,0.92)] px-4 py-3 text-base font-semibold text-emerald-800">
              {profile.nickname ?? "Nickname unavailable"}
            </p>
          </div>

          <div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input
                type="text"
                value={studentNickname}
                onChange={(event) => setStudentNickname(event.target.value.toLowerCase())}
                placeholder="student nickname"
                className="border border-stone-400 bg-[rgba(246,240,231,0.9)] px-4 py-3 text-base text-slate-900 outline-none transition focus:border-[#526b5c]"
              />
              <button
                type="button"
                onClick={() => void handleSendRequest()}
                disabled={isSending || studentNickname.trim() === ""}
                className="border border-[#43594c] bg-[#526b5c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#43594c] disabled:cursor-not-allowed disabled:border-stone-400 disabled:bg-stone-400"
              >
                {isSending ? "Sending..." : "Send request"}
              </button>
              <button
                type="button"
                onClick={() => setShowRequests((current) => !current)}
                className="border border-stone-400 bg-[rgba(255,253,248,0.9)] px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-stone-500"
              >
                {showRequests ? "Hide requests" : `Requests (${requests.length})`}
              </button>
            </div>
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
                    {getDisplayName(request.student)}
                  </p>
                  <p className="mt-2 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                    {request.connection.status}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-5">
          <div className="grid gap-3">
            {isLoading ? (
              <p className="text-sm text-slate-600">Loading students...</p>
            ) : students.length === 0 ? (
              <p className="text-sm text-slate-600">No connected students yet.</p>
            ) : (
              students.map((student) => (
                <article
                  key={student.id}
                  className={`border p-4 ${
                    selectedStudentId === student.id
                      ? "border-[#526b5c] bg-[rgba(239,247,241,0.82)]"
                      : "border-stone-300 bg-[rgba(255,253,248,0.94)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentId(student.id)}
                      className="min-w-0 text-left"
                    >
                      <p className="font-medium text-slate-900">
                        {getDisplayName(student)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {student.nickname ?? "Unknown"}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDisconnect(student.id)}
                      disabled={isDisconnectingStudentId === student.id}
                      className="border border-rose-300 px-3 py-2 text-xs font-semibold tracking-[0.14em] text-rose-700 uppercase transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      {isDisconnectingStudentId === student.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Assign approved problems
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
              className="border border-stone-400 bg-[rgba(246,240,231,0.9)] px-4 py-3 text-sm text-slate-900 outline-none"
            >
              <option value="">Choose student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {getDisplayName(student)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleAssignProblems()}
              disabled={isAssigning || !selectedStudentId || pendingProblemIds.length === 0}
              className="border border-[#43594c] bg-[#526b5c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#43594c] disabled:cursor-not-allowed disabled:border-stone-400 disabled:bg-stone-400"
            >
              {isAssigning ? "Assigning..." : `Assign selected (${pendingProblemIds.length})`}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {!selectedStudentId ? (
            <p className="text-sm text-slate-600">Choose a student to manage assignments.</p>
          ) : groupedOwnedProblems.length === 0 ? (
            <p className="text-sm text-slate-600">No approved problems are available yet.</p>
          ) : (
            groupedOwnedProblems.map((group) => {
              const assignedCount = group.items.filter((item) =>
                assignedProblemIds.has(item.problem.id),
              ).length;
              const selectableCount = group.items.filter(
                (item) => !assignedProblemIds.has(item.problem.id),
              ).length;
              const isExpanded = expandedUploadIds.includes(group.uploadId);
              const unassignedProblemIds = group.items
                .map((item) => item.problem.id)
                .filter((problemId) => !assignedProblemIds.has(problemId));
              const wholeFileSelected =
                unassignedProblemIds.length > 0 &&
                unassignedProblemIds.every((problemId) =>
                  pendingProblemIds.includes(problemId),
                );

              return (
                <section
                  key={group.uploadId}
                  className="border border-stone-300 bg-[rgba(246,240,231,0.72)]"
                >
                  <div className="flex flex-col gap-3 border-b border-stone-300 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => toggleUploadExpanded(group.uploadId)}
                      className="flex items-center gap-3 text-left"
                    >
                      <span className="text-base text-slate-500">
                        {isExpanded ? "▾" : "▸"}
                      </span>
                      <p className="text-lg font-semibold text-slate-950">
                        {group.uploadName}
                      </p>
                      <span className="text-sm text-slate-600">
                        {assignedCount}/{group.items.length} assigned
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWholeUpload(group)}
                      disabled={selectableCount === 0}
                      className="border border-stone-400 bg-[rgba(255,253,248,0.9)] px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {wholeFileSelected
                        ? "Unselect whole file"
                        : selectableCount === 0
                          ? "Already fully assigned"
                          : "Select whole file"}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="grid gap-3 px-5 py-5">
                      {group.items.map((item) => {
                        const isAssigned = assignedProblemIds.has(item.problem.id);
                        const isPending = pendingProblemIds.includes(item.problem.id);

                        return (
                          <label
                            key={item.problem.id}
                            className={`grid gap-3 border p-4 ${
                              isAssigned
                                ? "border-emerald-300 bg-[rgba(239,247,241,0.92)]"
                                : isPending
                                  ? "border-amber-300 bg-[rgba(255,248,232,0.92)]"
                                  : "border-stone-300 bg-[rgba(255,253,248,0.94)]"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isAssigned || isPending}
                                disabled={isAssigned || isAssigning}
                                onChange={() => togglePendingProblem(item.problem.id)}
                                className="mt-1 h-4 w-4"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                                  {isAssigned
                                    ? "Assigned"
                                    : isPending
                                      ? "Selected"
                                      : "Not assigned"}
                                </p>
                                <FormattedText
                                  text={item.problem.questionText}
                                  emptyText="Question text is missing."
                                  className="mt-2"
                                />
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })
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
