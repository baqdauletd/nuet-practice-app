import { z } from "zod";

export const extractedProblemSchema = z.object({
  question_text: z.string().min(1, "question_text is required"),
  choices: z.record(z.string(), z.string()).nullable().optional().default(null),
  correct_answer: z.string().nullable().optional().default(null),
  solution: z.string().nullable().optional().default(null),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable().optional().default(null),
  source_page: z.number().int().nullable().optional().default(null),
});

export const extractionResponseSchema = z.object({
  problems: z.array(extractedProblemSchema),
});

export const gradingFeedbackSchema = z.object({
  is_correct: z.boolean(),
  feedback: z.string().min(1, "feedback is required"),
  mistakes: z.array(z.string()).default([]),
  guided_solution: z.string().min(1, "guided_solution is required"),
  optimal_solution: z.string().min(1, "optimal_solution is required"),
});

function stripCodeFences(input: string) {
  const fencedMatch = input.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1] : input;
}

export function extractJsonString(input: string) {
  const normalized = stripCodeFences(input).trim();
  const objectStart = normalized.indexOf("{");
  const objectEnd = normalized.lastIndexOf("}");

  if (objectStart === -1 || objectEnd === -1 || objectEnd < objectStart) {
    throw new Error("AI response did not contain a JSON object.");
  }

  return normalized.slice(objectStart, objectEnd + 1).trim();
}

export function parseExtractionResponse(input: string) {
  const jsonString = extractJsonString(input);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown JSON parse error.";
    throw new Error(`AI returned invalid JSON: ${message}`);
  }

  const result = extractionResponseSchema.safeParse(parsed);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`AI response failed schema validation: ${message}`);
  }

  return result.data;
}

export function parseGradingFeedback(input: string) {
  const jsonString = extractJsonString(input);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown JSON parse error.";
    throw new Error(`AI returned invalid grading JSON: ${message}`);
  }

  const result = gradingFeedbackSchema.safeParse(parsed);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`AI grading response failed schema validation: ${message}`);
  }

  return result.data;
}
