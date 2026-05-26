"use client";

import { getInsforgeClient } from "../insforge/client";
import type { ChoiceMap, Difficulty, Problem } from "../types";

type ProblemRow = {
  id: string;
  upload_id: string | null;
  subject: string;
  question_text: string;
  choices: Record<string, string> | null;
  correct_answer: string | null;
  ai_solution: string | null;
  difficulty: Difficulty | null;
  source_page: number | null;
  approved: boolean;
  created_at: string | null;
};

type ProblemUpdates = {
  questionText?: string;
  choices?: ChoiceMap | null;
  correctAnswer?: string | null;
  aiSolution?: string | null;
  difficulty?: Difficulty | null;
  approved?: boolean;
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

function toProblemUpdateRow(updates: ProblemUpdates) {
  const row: Record<string, unknown> = {};

  if ("questionText" in updates) {
    row.question_text = updates.questionText;
  }

  if ("choices" in updates) {
    row.choices = updates.choices ?? null;
  }

  if ("correctAnswer" in updates) {
    row.correct_answer = updates.correctAnswer ?? null;
  }

  if ("aiSolution" in updates) {
    row.ai_solution = updates.aiSolution ?? null;
  }

  if ("difficulty" in updates) {
    row.difficulty = updates.difficulty ?? null;
  }

  if ("approved" in updates) {
    row.approved = updates.approved;
  }

  return row;
}

export async function listProblemsForUpload(uploadId: string) {
  const insforge = getInsforgeClient();

  const { data, error } = await insforge.database
    .from("problems")
    .select(
      "id, upload_id, subject, question_text, choices, correct_answer, ai_solution, difficulty, source_page, approved, created_at",
    )
    .eq("upload_id", uploadId)
    .order("source_page", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toProblem(row as ProblemRow));
}

export async function updateProblem(problemId: string, updates: ProblemUpdates) {
  const insforge = getInsforgeClient();

  const { data, error } = await insforge.database
    .from("problems")
    .update(toProblemUpdateRow(updates))
    .eq("id", problemId)
    .select(
      "id, upload_id, subject, question_text, choices, correct_answer, ai_solution, difficulty, source_page, approved, created_at",
    )
    .single<ProblemRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Updating the problem returned no data.");
  }

  return toProblem(data);
}

export async function setProblemApproval(problemId: string, approved: boolean) {
  return updateProblem(problemId, { approved });
}
