import "server-only";

import { GoogleGenAI } from "@google/genai";
import { getServerEnv } from "../env";
import {
  NUET_MATH_EXTRACTION_PROMPT,
  NUET_MATH_GRADING_PROMPT,
} from "./prompts";
import { parseExtractionResponse, parseGradingFeedback } from "./schemas";

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (geminiClient) {
    return geminiClient;
  }

  let GEMINI_API_KEY: string;
  try {
    ({ GEMINI_API_KEY } = getServerEnv());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server env error.";
    if (message.includes("GEMINI_API_KEY")) {
      throw new Error(
        "GEMINI_API_KEY is missing. Add it to .env.local and restart the dev server.",
      );
    }

    throw error;
  }

  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env.local and restart the dev server.",
    );
  }
  geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  return geminiClient;
}

function toBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

const extractionResponseJsonSchema = {
  type: "object",
  properties: {
    problems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question_text: { type: "string" },
          choices: {
            anyOf: [
              {
                type: "object",
                additionalProperties: { type: "string" },
              },
              { type: "null" },
            ],
          },
          correct_answer: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          solution: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          difficulty: {
            anyOf: [
              { type: "string", enum: ["easy", "medium", "hard"] },
              { type: "null" },
            ],
          },
          source_page: {
            anyOf: [{ type: "integer" }, { type: "null" }],
          },
        },
        required: ["question_text"],
      },
    },
  },
  required: ["problems"],
};

const gradingResponseJsonSchema = {
  type: "object",
  properties: {
    is_correct: { type: "boolean" },
    feedback: { type: "string" },
    mistakes: {
      type: "array",
      items: { type: "string" },
    },
    guided_solution: { type: "string" },
    optimal_solution: { type: "string" },
  },
  required: [
    "is_correct",
    "feedback",
    "mistakes",
    "guided_solution",
    "optimal_solution",
  ],
};

export async function extractMathProblemsWithGemini({
  bytes,
  mimeType,
  filename,
}: {
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
}) {
  const ai = getGeminiClient();
  const base64Data = toBase64(bytes);

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: `${NUET_MATH_EXTRACTION_PROMPT}\n\nFilename: ${filename}` },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: extractionResponseJsonSchema,
      temperature: 0.1,
    },
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("Gemini returned an empty response.");
  }

  return parseExtractionResponse(responseText).problems;
}

export async function gradeSubmissionWithGemini({
  problemText,
  choices,
  correctAnswer,
  officialSolution,
  selectedAnswer,
  solutionPhotoBytes,
  solutionPhotoMimeType,
}: {
  problemText: string;
  choices: Record<string, string> | null;
  correctAnswer: string | null;
  officialSolution: string | null;
  selectedAnswer: string | null;
  solutionPhotoBytes?: Uint8Array | null;
  solutionPhotoMimeType?: string | null;
}) {
  const ai = getGeminiClient();
  const parts: Array<
    | { text: string }
    | {
        inlineData: {
          mimeType: string;
          data: string;
        };
      }
  > = [
    {
      text: `${NUET_MATH_GRADING_PROMPT}

Problem text:
${problemText}

Choices:
${JSON.stringify(choices ?? {}, null, 2)}

Correct answer:
${correctAnswer ?? "Unknown"}

Instructor-approved solution:
${officialSolution ?? "No official solution available."}

Student selected answer:
${selectedAnswer ?? "No answer selected"}`,
    },
  ];

  if (solutionPhotoBytes && solutionPhotoMimeType) {
    parts.push({
      inlineData: {
        mimeType: solutionPhotoMimeType,
        data: toBase64(solutionPhotoBytes),
      },
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: gradingResponseJsonSchema,
      temperature: 0.1,
    },
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("Gemini returned an empty grading response.");
  }

  return parseGradingFeedback(responseText);
}
