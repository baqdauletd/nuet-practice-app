"use client";

import { getStudentSessionProblemRoute } from "../constants";
import { getInsforgeClient } from "../insforge/client";
import type {
  DailySession,
  DailySessionProblem,
  GradingFeedback,
  Problem,
  SessionProblemWithProblem,
  SessionProgress,
  Submission,
} from "../types";

type DailySessionRow = {
  id: string;
  student_id: string | null;
  session_date: string;
  problem_count: number;
  completed: boolean;
  created_at: string | null;
};

type DailySessionProblemRow = {
  id: string;
  session_id: string | null;
  problem_id: string | null;
  order_index: number;
};

type ProblemRow = {
  id: string;
  upload_id: string | null;
  subject: string;
  question_text: string;
  source_image_url: string | null;
  choices: Record<string, string> | null;
  correct_answer: string | null;
  ai_solution: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  source_page: number | null;
  approved: boolean;
  created_at: string | null;
};

type SafeProblemRow = Omit<ProblemRow, "correct_answer" | "ai_solution"> & {
  correct_answer?: string | null;
  ai_solution?: string | null;
};

type SubmissionRow = {
  id: string;
  session_problem_id: string | null;
  student_id: string | null;
  selected_answer: string | null;
  solution_photo_url: string | null;
  ai_feedback: GradingFeedback | null;
  is_correct: boolean | null;
  submitted_at: string | null;
};

function getTodayDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Oral",
  }).format(new Date());
}

function toDailySession(row: DailySessionRow): DailySession {
  return {
    id: row.id,
    studentId: row.student_id,
    sessionDate: row.session_date,
    problemCount: row.problem_count,
    completed: row.completed,
    createdAt: row.created_at,
  };
}

function toDailySessionProblem(row: DailySessionProblemRow): DailySessionProblem {
  return {
    id: row.id,
    sessionId: row.session_id,
    problemId: row.problem_id,
    orderIndex: row.order_index,
  };
}

function toProblem(row: SafeProblemRow): Problem {
  return {
    id: row.id,
    uploadId: row.upload_id,
    subject: row.subject,
    questionText: row.question_text,
    sourceImageUrl: row.source_image_url ?? null,
    choices: row.choices,
    correctAnswer: row.correct_answer ?? null,
    aiSolution: row.ai_solution ?? null,
    difficulty: row.difficulty,
    sourcePage: row.source_page,
    approved: row.approved,
    createdAt: row.created_at,
  };
}

function toSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    sessionProblemId: row.session_problem_id,
    studentId: row.student_id,
    selectedAnswer: row.selected_answer,
    solutionPhotoUrl: row.solution_photo_url,
    aiFeedback: row.ai_feedback,
    isCorrect: row.is_correct,
    submittedAt: row.submitted_at,
  };
}

function getSessionStatus(progress: {
  session: DailySession;
  allSubmitted: boolean;
  submittedCount: number;
}) {
  if (progress.session.completed) {
    return "completed" as const;
  }

  if (progress.allSubmitted) {
    return "ready_for_grading" as const;
  }

  if (progress.submittedCount > 0) {
    return "in_progress" as const;
  }

  return "not_started" as const;
}

export async function getTodaySession(studentId: string) {
  const insforge = getInsforgeClient();
  const today = getTodayDateString();

  const { data, error } = await insforge.database
    .from("daily_sessions")
    .select("id, student_id, session_date, problem_count, completed, created_at")
    .eq("student_id", studentId)
    .eq("session_date", today)
    .maybeSingle<DailySessionRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toDailySession(data) : null;
}

export async function getSessionById(sessionId: string) {
  const insforge = getInsforgeClient();

  const { data, error } = await insforge.database
    .from("daily_sessions")
    .select("id, student_id, session_date, problem_count, completed, created_at")
    .eq("id", sessionId)
    .maybeSingle<DailySessionRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toDailySession(data) : null;
}

export async function createDailySession(studentId: string, problemCount: number) {
  const response = await fetch("/api/student/create-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      studentId,
      problemCount,
    }),
  });

  const payload = (await response.json()) as
    | {
        error?: string;
        details?: string;
      }
    | {
        sessionId: string;
        problemCount: number;
        firstProblemPath: string;
      };

  if (!response.ok || !("sessionId" in payload)) {
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : "Unable to create today's practice session.",
    );
  }

  return payload;
}

export async function getSessionProblems(
  sessionId: string,
  studentId?: string,
): Promise<SessionProblemWithProblem[]> {
  return getSessionProblemsInternal(sessionId, {
    studentId,
    includeResultsFields: false,
  });
}

export async function getSessionProblemsForResults(
  sessionId: string,
  studentId: string,
) {
  const progress = await getSessionProgress(sessionId, studentId);

  if (!progress.allSubmitted || !progress.session.completed) {
    throw new Error(
      "Results are locked until all problems are submitted and grading is complete.",
    );
  }

  return getSessionProblemsInternal(sessionId, {
    studentId,
    includeResultsFields: true,
  });
}

async function getSessionProblemsInternal(
  sessionId: string,
  options: {
    studentId?: string;
    includeResultsFields: boolean;
  },
): Promise<SessionProblemWithProblem[]> {
  const insforge = getInsforgeClient();
  const { data: sessionProblemData, error: sessionProblemError } = await insforge.database
    .from("daily_session_problems")
    .select("id, session_id, problem_id, order_index")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });

  if (sessionProblemError) {
    throw new Error(sessionProblemError.message);
  }

  const sessionProblems = (sessionProblemData ?? []).map((row) =>
    toDailySessionProblem(row as DailySessionProblemRow),
  );
  const problemIds = sessionProblems
    .map((item) => item.problemId)
    .filter((value): value is string => typeof value === "string");

  const problemData = problemIds.length
    ? (
        await insforge.database
          .from("problems")
          .select(
            options.includeResultsFields
              ? "id, upload_id, subject, question_text, source_image_url, choices, correct_answer, ai_solution, difficulty, source_page, approved, created_at"
              : "id, upload_id, subject, question_text, source_image_url, choices, difficulty, source_page, approved, created_at",
          )
          .in("id", problemIds)
      )
    : { data: [], error: null };

  if (problemData.error) {
    throw new Error(problemData.error.message);
  }

  const problemsById = new Map(
    ((problemData.data ?? []) as ProblemRow[]).map((row) => {
      const problem = toProblem(row as ProblemRow);
      return [problem.id, problem] as const;
    }),
  );

  let submissionsBySessionProblemId = new Map<string | null, Submission>();
  if (options.studentId && sessionProblems.length > 0) {
    const { data: submissionData, error: submissionError } = await insforge.database
      .from("submissions")
      .select(
        "id, session_problem_id, student_id, selected_answer, solution_photo_url, ai_feedback, is_correct, submitted_at",
      )
      .eq("student_id", options.studentId)
      .in(
        "session_problem_id",
        sessionProblems.map((item) => item.id),
      );

    if (submissionError) {
      throw new Error(submissionError.message);
    }

    submissionsBySessionProblemId = new Map(
      (submissionData ?? []).map((row) => {
        const submission = toSubmission(row as SubmissionRow);
        return [submission.sessionProblemId, submission] as const;
      }),
    );
  }

  return sessionProblems
    .map((sessionProblem) => {
      const problem = sessionProblem.problemId
        ? problemsById.get(sessionProblem.problemId)
        : null;

      if (!problem) {
        return null;
      }

      return {
        id: sessionProblem.id,
        sessionId: sessionProblem.sessionId,
        problemId: sessionProblem.problemId,
        orderIndex: sessionProblem.orderIndex,
        problem,
        submission:
          submissionsBySessionProblemId.get(sessionProblem.id) ?? null,
      } satisfies SessionProblemWithProblem;
    })
    .filter((item): item is SessionProblemWithProblem => item !== null);
}

export async function getSessionProgress(
  sessionId: string,
  studentId: string,
): Promise<SessionProgress> {
  const session = await getSessionById(sessionId);

  if (!session) {
    throw new Error("Session not found.");
  }

  const sessionProblems = await getSessionProblems(sessionId, studentId);
  const submittedCount = sessionProblems.filter(
    (item) => item.submission !== null,
  ).length;
  const totalProblems = sessionProblems.length;
  const firstIncomplete = sessionProblems.find((item) => item.submission === null);
  const allSubmitted = totalProblems > 0 && submittedCount >= totalProblems;

  return {
    session,
    totalProblems,
    submittedCount,
    allSubmitted,
    status: getSessionStatus({
      session,
      allSubmitted,
      submittedCount,
    }),
    firstIncompleteIndex: firstIncomplete ? firstIncomplete.orderIndex + 1 : null,
  };
}

export async function getSessionProblemByIndex(
  sessionId: string,
  index: number,
  studentId?: string,
) {
  if (index < 1) {
    return null;
  }

  const sessionProblems = await getSessionProblemsInternal(sessionId, {
    studentId,
    includeResultsFields: false,
  });
  return sessionProblems.find((item) => item.orderIndex === index - 1) ?? null;
}

export async function getSubmissionForSessionProblem(
  sessionProblemId: string,
  studentId: string,
) {
  const insforge = getInsforgeClient();
  const { data, error } = await insforge.database
    .from("submissions")
    .select(
      "id, session_problem_id, student_id, selected_answer, solution_photo_url, ai_feedback, is_correct, submitted_at",
    )
    .eq("session_problem_id", sessionProblemId)
    .eq("student_id", studentId)
    .maybeSingle<SubmissionRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toSubmission(data) : null;
}

export async function upsertSubmission(formData: FormData) {
  const response = await fetch("/api/student/submit-answer", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as
    | { ok: true; allSubmitted: boolean }
    | { ok?: false; error?: string; details?: string };

  if (!response.ok || !payload.ok) {
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : "Unable to save the answer.",
    );
  }

  return payload;
}

export async function markSessionCompletedIfAllSubmitted(
  sessionId: string,
  studentId: string,
) {
  const progress = await getSessionProgress(sessionId, studentId);
  return progress.allSubmitted;
}

export function getContinueProblemPath(progress: SessionProgress) {
  return getStudentSessionProblemRoute(
    progress.session.id,
    progress.firstIncompleteIndex ?? 1,
  );
}
