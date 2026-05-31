"use client";

import { getInsforgeClient } from "../insforge/client";
import type {
  AppUserProfile,
  AssignedProblem,
  ConnectionRequestSummary,
  ConnectionStatus,
  InstructorProblemLibraryItem,
  InstructorStudentConnection,
  Problem,
  TestUpload,
} from "../types";

type ProfileRow = {
  id: string;
  email: string;
  role: "instructor" | "student";
  name: string | null;
  nickname: string | null;
  created_at: string | null;
};

type ConnectionRow = {
  id: string;
  instructor_id: string;
  student_id: string;
  status: ConnectionStatus;
  created_at: string | null;
  responded_at: string | null;
};

type TestUploadRow = {
  id: string;
  instructor_id: string | null;
  file_url: string;
  original_filename: string;
  status: string;
  created_at: string | null;
};

type ProblemRow = {
  id: string;
  upload_id: string | null;
  subject: string;
  question_text: string;
  source_image_url: string | null;
  choices: Record<string, string> | null;
  correct_answer?: string | null;
  ai_solution?: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  source_page: number | null;
  approved: boolean;
  created_at: string | null;
};

type AssignedProblemRow = {
  id: string;
  instructor_id: string;
  student_id: string;
  problem_id: string;
  created_at: string | null;
};

function toProfile(row: ProfileRow): AppUserProfile {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    nickname: row.nickname,
    createdAt: row.created_at,
  };
}

function toConnection(row: ConnectionRow): InstructorStudentConnection {
  return {
    id: row.id,
    instructorId: row.instructor_id,
    studentId: row.student_id,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

function toUpload(row: TestUploadRow): TestUpload {
  return {
    id: row.id,
    instructorId: row.instructor_id,
    fileUrl: row.file_url,
    originalFilename: row.original_filename,
    status: row.status as TestUpload["status"],
    createdAt: row.created_at,
  };
}

function toProblem(row: ProblemRow): Problem {
  return {
    id: row.id,
    uploadId: row.upload_id,
    subject: row.subject,
    questionText: row.question_text,
    sourceImageUrl: row.source_image_url,
    choices: row.choices,
    correctAnswer: row.correct_answer ?? null,
    aiSolution: row.ai_solution ?? null,
    difficulty: row.difficulty,
    sourcePage: row.source_page,
    approved: row.approved,
    createdAt: row.created_at,
  };
}

function maybeHideProblemAnswers(problem: Problem, includeAnswers?: boolean) {
  if (includeAnswers) {
    return problem;
  }

  return {
    ...problem,
    correctAnswer: null,
    aiSolution: null,
  };
}

async function listProfilesByIds(profileIds: string[]) {
  if (profileIds.length === 0) {
    return [];
  }

  const insforge = getInsforgeClient();
  const { data, error } = await insforge.database
    .from("profiles")
    .select("id, email, role, name, nickname, created_at")
    .in("id", profileIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toProfile(row as ProfileRow));
}

async function getConnectionRowsForStudent(studentId: string, statuses?: ConnectionStatus[]) {
  const insforge = getInsforgeClient();
  let query = insforge.database
    .from("instructor_student_connections")
    .select("id, instructor_id, student_id, status, created_at, responded_at")
    .eq("student_id", studentId);

  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toConnection(row as ConnectionRow));
}

async function getConnectionRowsForInstructor(
  instructorId: string,
  statuses?: ConnectionStatus[],
) {
  const insforge = getInsforgeClient();
  let query = insforge.database
    .from("instructor_student_connections")
    .select("id, instructor_id, student_id, status, created_at, responded_at")
    .eq("instructor_id", instructorId);

  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toConnection(row as ConnectionRow));
}

async function getProfileByNickname(nickname: string) {
  const insforge = getInsforgeClient();
  const { data, error } = await insforge.database
    .from("profiles")
    .select("id, email, role, name, nickname, created_at")
    .eq("nickname", nickname.trim().toLowerCase())
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toProfile(data) : null;
}

async function getConnectionByPair(instructorId: string, studentId: string) {
  const insforge = getInsforgeClient();
  const { data, error } = await insforge.database
    .from("instructor_student_connections")
    .select("id, instructor_id, student_id, status, created_at, responded_at")
    .eq("instructor_id", instructorId)
    .eq("student_id", studentId)
    .maybeSingle<ConnectionRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toConnection(data) : null;
}

function mapConnectionSummaries(
  connections: InstructorStudentConnection[],
  profiles: AppUserProfile[],
) {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return connections
    .map((connection) => {
      const instructor = profilesById.get(connection.instructorId);
      const student = profilesById.get(connection.studentId);

      if (!instructor || !student) {
        return null;
      }

      return {
        connection,
        instructor,
        student,
      } satisfies ConnectionRequestSummary;
    })
    .filter((item): item is ConnectionRequestSummary => item !== null);
}

async function listUploadsByIds(uploadIds: string[]) {
  if (uploadIds.length === 0) {
    return [];
  }

  const insforge = getInsforgeClient();
  const { data, error } = await insforge.database
    .from("test_uploads")
    .select("id, instructor_id, file_url, original_filename, status, created_at")
    .in("id", uploadIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toUpload(row as TestUploadRow));
}

async function listProblemsByUploadIds(
  uploadIds: string[],
  options?: {
    approvedOnly?: boolean;
    includeAnswers?: boolean;
  },
) {
  if (uploadIds.length === 0) {
    return [];
  }

  const insforge = getInsforgeClient();
  let query = insforge.database
    .from("problems")
    .select(
      "id, upload_id, subject, question_text, source_image_url, choices, correct_answer, ai_solution, difficulty, source_page, approved, created_at",
    )
    .in("upload_id", uploadIds)
    .order("created_at", { ascending: false });

  if (options?.approvedOnly !== false) {
    query = query.eq("approved", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    maybeHideProblemAnswers(
      toProblem(row as ProblemRow),
      options?.includeAnswers,
    ),
  );
}

async function listProblemsByIds(
  problemIds: string[],
  options?: {
    includeAnswers?: boolean;
  },
) {
  if (problemIds.length === 0) {
    return [];
  }

  const insforge = getInsforgeClient();
  const { data, error } = await insforge.database
    .from("problems")
    .select(
      "id, upload_id, subject, question_text, source_image_url, choices, correct_answer, ai_solution, difficulty, source_page, approved, created_at",
    )
    .in("id", problemIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    maybeHideProblemAnswers(
      toProblem(row as ProblemRow),
      options?.includeAnswers,
    ),
  );
}

export async function sendConnectionRequestByNickname(
  instructorId: string,
  studentNickname: string,
) {
  const student = await getProfileByNickname(studentNickname.trim().toLowerCase());

  if (!student || student.role !== "student") {
    throw new Error("Student nickname not found.");
  }

  if (student.id === instructorId) {
    throw new Error("You cannot connect to yourself.");
  }

  const insforge = getInsforgeClient();
  const existing = await getConnectionByPair(instructorId, student.id);

  if (existing?.status === "accepted") {
    throw new Error("You are already connected to this student.");
  }

  if (existing?.status === "pending") {
    return existing;
  }

  if (existing) {
    const { data, error } = await insforge.database
      .from("instructor_student_connections")
      .update({
        status: "pending",
        responded_at: null,
      })
      .eq("id", existing.id)
      .select("id, instructor_id, student_id, status, created_at, responded_at")
      .single<ConnectionRow>();

    if (error) {
      throw new Error(error.message);
    }

    return toConnection(data);
  }

  const { data, error } = await insforge.database
    .from("instructor_student_connections")
    .insert([
      {
        instructor_id: instructorId,
        student_id: student.id,
        status: "pending",
      },
    ])
    .select("id, instructor_id, student_id, status, created_at, responded_at")
    .single<ConnectionRow>();

  if (error) {
    throw new Error(error.message);
  }

  return toConnection(data);
}

export async function respondToConnectionRequest(
  connectionId: string,
  studentId: string,
  accepted: boolean,
) {
  const insforge = getInsforgeClient();
  const { data, error } = await insforge.database
    .from("instructor_student_connections")
    .update({
      status: accepted ? "accepted" : "rejected",
      responded_at: new Date().toISOString(),
    })
    .eq("id", connectionId)
    .eq("student_id", studentId)
    .select("id, instructor_id, student_id, status, created_at, responded_at")
    .single<ConnectionRow>();

  if (error) {
    throw new Error(error.message);
  }

  return toConnection(data);
}

export async function listIncomingStudentConnectionRequests(studentId: string) {
  const connections = await getConnectionRowsForStudent(studentId, ["pending"]);
  const profiles = await listProfilesByIds(
    connections.flatMap((connection) => [
      connection.instructorId,
      connection.studentId,
    ]),
  );

  return mapConnectionSummaries(connections, profiles);
}

export async function listInstructorConnectionRequests(instructorId: string) {
  const connections = await getConnectionRowsForInstructor(instructorId, [
    "pending",
    "accepted",
  ]);
  const profiles = await listProfilesByIds(
    connections.flatMap((connection) => [
      connection.instructorId,
      connection.studentId,
    ]),
  );

  return mapConnectionSummaries(connections, profiles);
}

export async function listConnectedStudents(instructorId: string) {
  const connections = await getConnectionRowsForInstructor(instructorId, ["accepted"]);
  const studentIds = connections.map((connection) => connection.studentId);
  return listProfilesByIds(studentIds);
}

export async function listConnectedInstructors(studentId: string) {
  const connections = await getConnectionRowsForStudent(studentId, ["accepted"]);
  const instructorIds = connections.map((connection) => connection.instructorId);
  return listProfilesByIds(instructorIds);
}

export async function listInstructorOwnedApprovedProblems(instructorId: string) {
  const insforge = getInsforgeClient();
  const { data: uploadData, error: uploadError } = await insforge.database
    .from("test_uploads")
    .select("id, instructor_id, file_url, original_filename, status, created_at")
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const uploads = (uploadData ?? []).map((row) => toUpload(row as TestUploadRow));
  const uploadIds = uploads.map((upload) => upload.id);
  const problems = await listProblemsByUploadIds(uploadIds, {
    approvedOnly: true,
    includeAnswers: false,
  });
  const uploadsById = new Map(uploads.map((upload) => [upload.id, upload]));

  return problems.map((problem) => ({
    problem,
    upload: problem.uploadId ? uploadsById.get(problem.uploadId) ?? null : null,
  }));
}

export async function assignProblemToStudent(
  instructorId: string,
  studentId: string,
  problemId: string,
) {
  const connection = await getConnectionByPair(instructorId, studentId);

  if (!connection || connection.status !== "accepted") {
    throw new Error("This student is not connected to you.");
  }

  const availableProblems = await listInstructorOwnedApprovedProblems(instructorId);
  const target = availableProblems.find((item) => item.problem.id === problemId);

  if (!target) {
    throw new Error("Problem not found for this instructor.");
  }

  const insforge = getInsforgeClient();
  const existing = await insforge.database
    .from("assigned_problems")
    .select("id, instructor_id, student_id, problem_id, created_at")
    .eq("instructor_id", instructorId)
    .eq("student_id", studentId)
    .eq("problem_id", problemId)
    .maybeSingle<AssignedProblemRow>();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) {
    throw new Error("That problem is already assigned to this student.");
  }

  const { data, error } = await insforge.database
    .from("assigned_problems")
    .insert([
      {
        instructor_id: instructorId,
        student_id: studentId,
        problem_id: problemId,
      },
    ])
    .select("id, instructor_id, student_id, problem_id, created_at")
    .single<AssignedProblemRow>();

  if (error) {
    throw new Error(error.message);
  }

  const [instructor] = await listProfilesByIds([instructorId]);
  const [student] = await listProfilesByIds([studentId]);

  return {
    id: data.id,
    instructor,
    student,
    problem: target.problem,
    upload: target.upload,
    createdAt: data.created_at,
  } satisfies AssignedProblem;
}

export async function listAssignedProblemsForStudent(studentId: string) {
  const insforge = getInsforgeClient();
  const { data, error } = await insforge.database
    .from("assigned_problems")
    .select("id, instructor_id, student_id, problem_id, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as AssignedProblemRow[];
  const profiles = await listProfilesByIds(
    rows.flatMap((row) => [row.instructor_id, row.student_id]),
  );
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const problems = await listProblemsByIds(rows.map((row) => row.problem_id), {
    includeAnswers: false,
  });
  const problemsById = new Map(problems.map((problem) => [problem.id, problem]));
  const uploads = await listUploadsByIds(
    problems
      .map((problem) => problem.uploadId)
      .filter((value): value is string => typeof value === "string"),
  );
  const uploadsById = new Map(uploads.map((upload) => [upload.id, upload]));

  return rows
    .map((row) => {
      const instructor = profilesById.get(row.instructor_id);
      const student = profilesById.get(row.student_id);
      const problem = problemsById.get(row.problem_id);

      if (!instructor || !student || !problem) {
        return null;
      }

      return {
        id: row.id,
        instructor,
        student,
        problem,
        upload: problem.uploadId ? uploadsById.get(problem.uploadId) ?? null : null,
        createdAt: row.created_at,
      } satisfies AssignedProblem;
    })
    .filter((item): item is AssignedProblem => item !== null);
}

export async function listAssignedProblemsForInstructorStudent(
  instructorId: string,
  studentId: string,
) {
  const assigned = await listAssignedProblemsForStudent(studentId);
  return assigned.filter(
    (item) => item.instructor.id === instructorId && item.student.id === studentId,
  );
}

export async function listConnectedInstructorProblemLibrary(studentId: string) {
  const instructors = await listConnectedInstructors(studentId);
  const instructorIds = instructors.map((instructor) => instructor.id);

  if (instructorIds.length === 0) {
    return [];
  }

  const insforge = getInsforgeClient();
  const { data: uploadData, error: uploadError } = await insforge.database
    .from("test_uploads")
    .select("id, instructor_id, file_url, original_filename, status, created_at")
    .in("instructor_id", instructorIds)
    .order("created_at", { ascending: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const uploads = (uploadData ?? []).map((row) => toUpload(row as TestUploadRow));
  const uploadIds = uploads.map((upload) => upload.id);
  const problems = await listProblemsByUploadIds(uploadIds, {
    approvedOnly: false,
    includeAnswers: false,
  });
  const uploadsById = new Map(uploads.map((upload) => [upload.id, upload]));
  const instructorsById = new Map(
    instructors.map((instructor) => [instructor.id, instructor]),
  );
  const assigned = await listAssignedProblemsForStudent(studentId);
  const assignedByProblemId = new Map(
    assigned.map((item) => [item.problem.id, item]),
  );

  return problems
    .map((problem) => {
      const upload = problem.uploadId ? uploadsById.get(problem.uploadId) ?? null : null;
      const instructor = upload?.instructorId
        ? instructorsById.get(upload.instructorId) ?? null
        : null;

      if (!instructor) {
        return null;
      }

      const assignment = assignedByProblemId.get(problem.id) ?? null;

      return {
        problem,
        instructor,
        upload,
        assignedAt: assignment?.createdAt ?? null,
        assignmentId: assignment?.id ?? null,
      } satisfies InstructorProblemLibraryItem;
    })
    .filter((item): item is InstructorProblemLibraryItem => item !== null);
}
