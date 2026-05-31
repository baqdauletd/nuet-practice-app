"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { FormattedText } from "../shared/FormattedText";
import {
  assignProblemToStudent,
  listAssignedProblemsForInstructorStudent,
  listConnectedStudents,
  listInstructorConnectionRequests,
  listInstructorOwnedApprovedProblems,
  sendConnectionRequestByNickname,
} from "../../lib/connections/client";
import {
  getSessionProblemsForReview,
  listStudentSessionSummaries,
} from "../../lib/student-sessions/client";
import { getStudentSubmissionPhotoRoute } from "../../lib/constants";
import type {
  AppUserProfile,
  AssignedProblem,
  ConnectionRequestSummary,
  SessionProblemWithProblem,
  StudentSessionSummary,
} from "../../lib/types";

function getDisplayName(profile: AppUserProfile) {
  return profile.name?.trim() || profile.nickname || profile.email;
}

export function InstructorConnectionsPanel({
  profile,
}: {
  profile: AppUserProfile;
}) {
  const [studentNickname, setStudentNickname] = useState("");
  const [requests, setRequests] = useState<ConnectionRequestSummary[]>([]);
  const [students, setStudents] = useState<AppUserProfile[]>([]);
  const [ownedProblems, setOwnedProblems] = useState<
    Array<{ problem: AssignedProblem["problem"]; upload: AssignedProblem["upload"] }>
  >([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedProblemId, setSelectedProblemId] = useState("");
  const [assignedProblems, setAssignedProblems] = useState<AssignedProblem[]>([]);
  const [sessionSummaries, setSessionSummaries] = useState<StudentSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionProblems, setSessionProblems] = useState<SessionProblemWithProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isLoadingSessionData, setIsLoadingSessionData] = useState(false);
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
        setSelectedProblemId((current) => current || nextOwnedProblems[0]?.problem.id || "");
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

  useEffect(() => {
    let isActive = true;

    async function loadStudentData() {
      if (!selectedStudentId) {
        setAssignedProblems([]);
        setSessionSummaries([]);
        setSelectedSessionId("");
        setSessionProblems([]);
        return;
      }

      try {
        setIsLoadingSessionData(true);
        const [nextAssignedProblems, nextSessionSummaries] = await Promise.all([
          listAssignedProblemsForInstructorStudent(profile.id, selectedStudentId),
          listStudentSessionSummaries(selectedStudentId),
        ]);

        if (!isActive) {
          return;
        }

        setAssignedProblems(nextAssignedProblems);
        setSessionSummaries(nextSessionSummaries);
        setSelectedSessionId(nextSessionSummaries[0]?.session.id || "");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load student sessions.",
        );
      } finally {
        if (isActive) {
          setIsLoadingSessionData(false);
        }
      }
    }

    void loadStudentData();

    return () => {
      isActive = false;
    };
  }, [profile.id, selectedStudentId]);

  useEffect(() => {
    let isActive = true;

    async function loadSessionProblems() {
      if (!selectedStudentId || !selectedSessionId) {
        setSessionProblems([]);
        return;
      }

      try {
        setIsLoadingSessionData(true);
        const nextProblems = await getSessionProblemsForReview(
          selectedSessionId,
          selectedStudentId,
        );

        if (isActive) {
          setSessionProblems(nextProblems);
        }
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
          setIsLoadingSessionData(false);
        }
      }
    }

    void loadSessionProblems();

    return () => {
      isActive = false;
    };
  }, [selectedSessionId, selectedStudentId]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  );

  async function handleSendRequest() {
    if (!studentNickname.trim()) {
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await sendConnectionRequestByNickname(profile.id, studentNickname.trim().toLowerCase());
      const nextRequests = await listInstructorConnectionRequests(profile.id);
      setRequests(nextRequests);
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

  async function handleAssignProblem() {
    if (!selectedStudentId || !selectedProblemId) {
      return;
    }

    setIsAssigning(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await assignProblemToStudent(profile.id, selectedStudentId, selectedProblemId);
      const nextAssigned = await listAssignedProblemsForInstructorStudent(
        profile.id,
        selectedStudentId,
      );
      setAssignedProblems(nextAssigned);
      setSuccessMessage("Problem assigned to student.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to assign that problem.",
      );
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <p className="text-sm font-semibold tracking-[0.16em] text-emerald-700 uppercase">
          Student network
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">
          Your instructor nickname
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          Students will use this after you send them a nickname-based connection request.
        </p>
        <div className="mt-5 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-base font-semibold text-emerald-800">
          {profile.nickname ?? "Nickname unavailable"}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="text"
            value={studentNickname}
            onChange={(event) => setStudentNickname(event.target.value.toLowerCase())}
            placeholder="student nickname"
            className="rounded-full border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={() => void handleSendRequest()}
            disabled={isSending || studentNickname.trim() === ""}
            className="min-h-12 rounded-full bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSending ? "Sending..." : "Send request"}
          </button>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Connection requests and students
        </h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading connections...</p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-950">Requests</p>
              <div className="mt-3 grid gap-3">
                {requests.length === 0 ? (
                  <p className="text-sm text-slate-600">No requests yet.</p>
                ) : (
                  requests.map((request) => (
                    <div key={request.connection.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="font-medium text-slate-900">
                        {getDisplayName(request.student)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Nickname: {request.student.nickname ?? "Unknown"}
                      </p>
                      <p className="mt-2 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                        {request.connection.status}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-950">Connected students</p>
              <div className="mt-3 grid gap-3">
                {students.length === 0 ? (
                  <p className="text-sm text-slate-600">No connected students yet.</p>
                ) : (
                  students.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        selectedStudentId === student.id
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <p className="font-medium text-slate-900">
                        {getDisplayName(student)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Nickname: {student.nickname ?? "Unknown"}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Assign approved problems
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          Pick a connected student and assign any approved problem from your uploads.
        </p>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto]">
          <select
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
          >
            <option value="">Choose student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {getDisplayName(student)}
              </option>
            ))}
          </select>

          <select
            value={selectedProblemId}
            onChange={(event) => setSelectedProblemId(event.target.value)}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
          >
            <option value="">Choose approved problem</option>
            {ownedProblems.map((item) => (
              <option key={item.problem.id} value={item.problem.id}>
                {item.upload?.originalFilename ?? "Untitled upload"}: {item.problem.questionText.slice(0, 80)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void handleAssignProblem()}
            disabled={isAssigning || !selectedStudentId || !selectedProblemId}
            className="min-h-12 rounded-full bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isAssigning ? "Assigning..." : "Assign"}
          </button>
        </div>

        {selectedStudent ? (
          <div className="mt-5 grid gap-3">
            {assignedProblems.length === 0 ? (
              <p className="text-sm text-slate-600">
                No assigned problems yet for {getDisplayName(selectedStudent)}.
              </p>
            ) : (
              assignedProblems.map((assignment) => (
                <article
                  key={assignment.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {assignment.upload?.originalFilename ?? "Instructor upload"}
                  </p>
                  <FormattedText
                    text={assignment.problem.questionText}
                    emptyText="Question text is missing."
                    className="mt-2"
                  />
                </article>
              ))
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
        <h2 className="text-2xl font-semibold text-slate-950">
          Student sessions and solutions
        </h2>
        {!selectedStudent ? (
          <p className="mt-4 text-sm leading-7 text-slate-700">
            Connect to a student to review their sessions.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Reviewing {getDisplayName(selectedStudent)}.
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">Sessions</p>
                {isLoadingSessionData && sessionSummaries.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">Loading sessions...</p>
                ) : sessionSummaries.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">No sessions yet.</p>
                ) : (
                  <div className="mt-3 grid gap-3">
                    {sessionSummaries.map((summary) => (
                      <button
                        key={summary.session.id}
                        type="button"
                        onClick={() => setSelectedSessionId(summary.session.id)}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          selectedSessionId === summary.session.id
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="font-medium text-slate-900">
                          {summary.session.sessionDate}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {summary.submittedCount} / {summary.totalProblems} submitted
                        </p>
                        <p className="mt-1 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                          {summary.status}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">Session review</p>
                {!selectedSessionId ? (
                  <p className="mt-3 text-sm text-slate-600">Choose a session.</p>
                ) : isLoadingSessionData && sessionProblems.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">Loading session details...</p>
                ) : sessionProblems.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">No problems found for this session.</p>
                ) : (
                  <div className="mt-3 grid gap-4">
                    {sessionProblems.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                          Problem {item.orderIndex + 1}
                        </p>
                        <FormattedText
                          text={item.problem.questionText}
                          emptyText="Question text is missing."
                          className="mt-2"
                        />
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                              Student answer
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {item.submission?.selectedAnswer ?? "No answer"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                              Correct answer
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              {item.problem.correctAnswer ?? "Not set"}
                            </p>
                          </div>
                        </div>
                        {item.submission?.solutionPhotoUrl ? (
                          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <Image
                              src={getStudentSubmissionPhotoRoute(
                                item.id,
                                selectedStudent.id,
                                item.submission.submittedAt,
                              )}
                              alt="Student solution photo"
                              width={1200}
                              height={1600}
                              unoptimized
                              className="h-auto w-full object-contain"
                            />
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
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
