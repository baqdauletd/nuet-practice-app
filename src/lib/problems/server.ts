import "server-only";

import { getInsforgeServerClient } from "../insforge/server";
import type { ExtractedProblem, Problem } from "../types";

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

export async function insertExtractedProblems(
  uploadId: string,
  problems: ExtractedProblem[],
) {
  if (problems.length === 0) {
    return [];
  }

  const insforge = getInsforgeServerClient();
  const rows = problems.map((problem) => ({
    upload_id: uploadId,
    subject: "math",
    question_text: problem.question_text,
    choices: problem.choices,
    correct_answer: problem.correct_answer,
    ai_solution: problem.solution,
    difficulty: problem.difficulty,
    source_page: problem.source_page,
    approved: false,
  }));

  const { data, error } = await insforge.database
    .from("problems")
    .insert(rows)
    .select(
      "id, upload_id, subject, question_text, choices, correct_answer, ai_solution, difficulty, source_page, approved, created_at",
    );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toProblem(row as ProblemRow));
}

export async function countProblemsForUpload(uploadId: string) {
  const insforge = getInsforgeServerClient();
  const { count, error } = await insforge.database
    .from("problems")
    .select("id", { count: "exact", head: true })
    .eq("upload_id", uploadId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function listProblemsForUpload(uploadId: string) {
  const insforge = getInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("problems")
    .select(
      "id, upload_id, subject, question_text, choices, correct_answer, ai_solution, difficulty, source_page, approved, created_at",
    )
    .eq("upload_id", uploadId)
    .order("source_page", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toProblem(row as ProblemRow));
}
