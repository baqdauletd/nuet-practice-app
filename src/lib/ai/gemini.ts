import "server-only";

import { GoogleGenAI } from "@google/genai";
import { getServerEnv } from "../env";
import { NUET_MATH_EXTRACTION_PROMPT } from "./prompts";
import { parseExtractionResponse } from "./schemas";

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (geminiClient) {
    return geminiClient;
  }

  const { GEMINI_API_KEY } = getServerEnv();
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
    model: "gemini-2.5-flash",
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
