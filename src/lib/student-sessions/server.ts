import "server-only";

import {
  getStudentSessionProblemRoute,
  SOLUTION_PHOTOS_BUCKET,
} from "../constants";
import { getInsforgeServerClient } from "../insforge/server";
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
  choices: Record<string, string> | null;
  correct_answer: string | null;
  ai_solution: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  source_page: number | null;
  approved: boolean;
  created_at: string | null;
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

type ApprovedProblemIdRow = {
  id: string;
};

function getTodayDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Oral",
  }).format(new Date());
}

function normalizeSolutionPhotoStorageKey(storageKey: string) {
  const normalized = storageKey.trim().replace(/^\/+/, "");
  const bucketPrefix = `${SOLUTION_PHOTOS_BUCKET}/`;

  if (normalized.startsWith(bucketPrefix)) {
    return normalized.slice(bucketPrefix.length);
  }

  return normalized;
}

function inferSolutionPhotoMimeType(storageKey: string, blobType: string) {
  if (blobType && blobType !== "application/octet-stream" && blobType !== "binary/octet-stream") {
    return blobType;
  }

  const normalizedKey = storageKey.toLowerCase();

  if (normalizedKey.endsWith(".png")) {
    return "image/png";
  }

  if (normalizedKey.endsWith(".jpg") || normalizedKey.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (normalizedKey.endsWith(".webp")) {
    return "image/webp";
  }

  return blobType || "application/octet-stream";
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
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

function toProblem(row: ProblemRow): Problem {
  return {
    id: row.id,
    uploadId: row.upload_id,
    subject: row.subject,
    questionText: row.question_text,
    choices: row.choices,
    correctAnswer: row.correct_answer,
    aiSolution: row.ai_solution,
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
  const insforge = getInsforgeServerClient();
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
  const insforge = getInsforgeServerClient();

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

export async function getSessionProblemRows(sessionId: string) {
  const insforge = getInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("daily_session_problems")
    .select("id, session_id, problem_id, order_index")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toDailySessionProblem(row as DailySessionProblemRow));
}

export async function getDailySessionProblemById(sessionProblemId: string) {
  const insforge = getInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("daily_session_problems")
    .select("id, session_id, problem_id, order_index")
    .eq("id", sessionProblemId)
    .maybeSingle<DailySessionProblemRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toDailySessionProblem(data) : null;
}

export async function getOwnedSessionByStudentId(
  sessionId: string,
  studentId: string,
) {
  const session = await getSessionById(sessionId);

  if (!session) {
    return null;
  }

  if (session.studentId !== studentId) {
    return null;
  }

  return session;
}

export async function getOwnedSessionProblemByStudentId(
  sessionProblemId: string,
  studentId: string,
) {
  const sessionProblem = await getDailySessionProblemById(sessionProblemId);

  if (!sessionProblem || !sessionProblem.sessionId) {
    return null;
  }

  const session = await getOwnedSessionByStudentId(
    sessionProblem.sessionId,
    studentId,
  );

  if (!session) {
    return null;
  }

  return {
    sessionProblem,
    session,
  };
}

export async function getProblemRows(problemIds: string[]) {
  if (problemIds.length === 0) {
    return [];
  }

  const insforge = getInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("problems")
    .select(
      "id, upload_id, subject, question_text, choices, correct_answer, ai_solution, difficulty, source_page, approved, created_at",
    )
    .in("id", problemIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toProblem(row as ProblemRow));
}

export async function getSubmissionRowsForSession(
  sessionProblemIds: string[],
  studentId: string,
) {
  if (sessionProblemIds.length === 0) {
    return [];
  }

  const insforge = getInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("submissions")
    .select(
      "id, session_problem_id, student_id, selected_answer, solution_photo_url, ai_feedback, is_correct, submitted_at",
    )
    .eq("student_id", studentId)
    .in("session_problem_id", sessionProblemIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toSubmission(row as SubmissionRow));
}

export async function getSessionProblems(
  sessionId: string,
  studentId?: string,
): Promise<SessionProblemWithProblem[]> {
  const sessionProblems = await getSessionProblemRows(sessionId);
  const problemIds = sessionProblems
    .map((item) => item.problemId)
    .filter((value): value is string => typeof value === "string");
  const problems = await getProblemRows(problemIds);
  const problemsById = new Map(problems.map((problem) => [problem.id, problem]));

  const submissions = studentId
    ? await getSubmissionRowsForSession(
        sessionProblems.map((item) => item.id),
        studentId,
      )
    : [];
  const submissionsBySessionProblemId = new Map(
    submissions.map((submission) => [submission.sessionProblemId, submission]),
  );

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

export async function getSessionProblemByIndex(
  sessionId: string,
  index: number,
  studentId?: string,
) {
  if (index < 1) {
    return null;
  }

  const sessionProblems = await getSessionProblems(sessionId, studentId);
  return sessionProblems.find((item) => item.orderIndex === index - 1) ?? null;
}

export async function getSubmissionForSessionProblem(
  sessionProblemId: string,
  studentId: string,
) {
  const insforge = getInsforgeServerClient();
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

export async function getSessionProgress(
  sessionId: string,
  studentId: string,
): Promise<SessionProgress> {
  const session = await getSessionById(sessionId);

  if (!session) {
    throw new Error("Session not found.");
  }

  const sessionProblems = await getSessionProblemRows(sessionId);
  const submissions = await getSubmissionRowsForSession(
    sessionProblems.map((item) => item.id),
    studentId,
  );

  const submittedSessionProblemIds = new Set(
    submissions.map((submission) => submission.sessionProblemId),
  );
  const firstIncomplete = sessionProblems.find(
    (item) => !submittedSessionProblemIds.has(item.id),
  );
  const submittedCount = submittedSessionProblemIds.size;
  const totalProblems = sessionProblems.length;
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

export async function createDailySession(studentId: string, problemCount: number) {
  const existingSession = await getTodaySession(studentId);

  if (existingSession) {
    const progress = await getSessionProgress(existingSession.id, studentId);
    const targetIndex = progress.firstIncompleteIndex ?? 1;

    return {
      session: existingSession,
      problemCount: progress.totalProblems,
      firstProblemPath: getStudentSessionProblemRoute(
        existingSession.id,
        targetIndex,
      ),
      created: false,
    };
  }

  const insforge = getInsforgeServerClient();
  const today = getTodayDateString();
  const { data: approvedProblemRows, error: approvedProblemsError } =
    await insforge.database
      .from("problems")
      .select("id")
      .eq("approved", true)
      .eq("subject", "math");

  if (approvedProblemsError) {
    throw new Error(approvedProblemsError.message);
  }

  const approvedProblemIds = (approvedProblemRows ?? []).map(
    (row) => (row as ApprovedProblemIdRow).id,
  );

  if (approvedProblemIds.length < problemCount) {
    throw new Error("Not enough approved problems available.");
  }

  const selectedProblemIds = shuffleArray(approvedProblemIds).slice(0, problemCount);

  const { data: createdSessionRows, error: createSessionError } = await insforge.database
    .from("daily_sessions")
    .insert([
      {
        student_id: studentId,
        session_date: today,
        problem_count: problemCount,
        completed: false,
      },
    ])
    .select("id, student_id, session_date, problem_count, completed, created_at");

  if (createSessionError) {
    throw new Error(createSessionError.message);
  }

  const createdSessionRow = createdSessionRows?.[0] as DailySessionRow | undefined;
  if (!createdSessionRow) {
    throw new Error("Session creation returned no data.");
  }

  const session = toDailySession(createdSessionRow);

  const { error: createSessionProblemsError } = await insforge.database
    .from("daily_session_problems")
    .insert(
      selectedProblemIds.map((problemId, orderIndex) => ({
        session_id: session.id,
        problem_id: problemId,
        order_index: orderIndex,
      })),
    );

  if (createSessionProblemsError) {
    throw new Error(createSessionProblemsError.message);
  }

  return {
    session,
    problemCount,
    firstProblemPath: getStudentSessionProblemRoute(session.id, 1),
    created: true,
  };
}

export async function upsertSubmission({
  sessionProblemId,
  studentId,
  selectedAnswer,
  solutionPhotoUrl,
}: {
  sessionProblemId: string;
  studentId: string;
  selectedAnswer: string;
  solutionPhotoUrl?: string | null;
}) {
  const existingSubmission = await getSubmissionForSessionProblem(
    sessionProblemId,
    studentId,
  );
  const insforge = getInsforgeServerClient();
  const submittedAt = new Date().toISOString();

  if (existingSubmission) {
    const { data, error } = await insforge.database
      .from("submissions")
      .update({
        selected_answer: selectedAnswer,
        solution_photo_url:
          solutionPhotoUrl ?? existingSubmission.solutionPhotoUrl ?? null,
        submitted_at: submittedAt,
      })
      .eq("id", existingSubmission.id)
      .select(
        "id, session_problem_id, student_id, selected_answer, solution_photo_url, ai_feedback, is_correct, submitted_at",
      )
      .single<SubmissionRow>();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Updating the submission returned no data.");
    }

    return toSubmission(data);
  }

  const { data, error } = await insforge.database
    .from("submissions")
    .insert([
      {
        session_problem_id: sessionProblemId,
        student_id: studentId,
        selected_answer: selectedAnswer,
        solution_photo_url: solutionPhotoUrl ?? null,
        submitted_at: submittedAt,
      },
    ])
    .select(
      "id, session_problem_id, student_id, selected_answer, solution_photo_url, ai_feedback, is_correct, submitted_at",
    )
    .single<SubmissionRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Creating the submission returned no data.");
  }

  return toSubmission(data);
}

export async function markSessionCompletedIfAllSubmitted(
  sessionId: string,
  studentId: string,
) {
  const progress = await getSessionProgress(sessionId, studentId);

  // For this MVP, "completed" stays reserved for the grading-complete state.
  // This helper answers the "all submitted?" question without flipping the row.
  return progress.allSubmitted;
}

export async function setSessionCompleted(sessionId: string, completed: boolean) {
  const insforge = getInsforgeServerClient();
  const { error } = await insforge.database
    .from("daily_sessions")
    .update({ completed })
    .eq("id", sessionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateSubmissionGrading(
  submissionId: string,
  grading: {
    isCorrect: boolean;
    aiFeedback: GradingFeedback;
  },
) {
  const insforge = getInsforgeServerClient();
  const { error } = await insforge.database
    .from("submissions")
    .update({
      is_correct: grading.isCorrect,
      ai_feedback: grading.aiFeedback,
    })
    .eq("id", submissionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function downloadSolutionPhoto(storageKey: string) {
  const insforge = getInsforgeServerClient();
  const normalizedKey = normalizeSolutionPhotoStorageKey(storageKey);
  const { data, error } = await insforge.storage
    .from(SOLUTION_PHOTOS_BUCKET)
    .download(normalizedKey);

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Solution photo download returned no file.");
  }

  const arrayBuffer = await data.arrayBuffer();

  return {
    bytes: new Uint8Array(arrayBuffer),
    mimeType: inferSolutionPhotoMimeType(normalizedKey, data.type),
  };
}
