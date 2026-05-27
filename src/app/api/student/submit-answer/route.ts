import { SOLUTION_PHOTOS_BUCKET } from "../../../../lib/constants";
import { getInsforgeServerClient } from "../../../../lib/insforge/server";
import {
  getDailySessionProblemById,
  getSessionById,
  markSessionCompletedIfAllSubmitted,
  upsertSubmission,
} from "../../../../lib/student-sessions/server";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function sanitizeFilename(filename: string) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeAnswer(value: string) {
  return value.trim().toUpperCase();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sessionProblemId = formData.get("sessionProblemId");
    const studentId = formData.get("studentId");
    const selectedAnswer = formData.get("selectedAnswer");
    const file = formData.get("file");

    if (typeof sessionProblemId !== "string" || !sessionProblemId.trim()) {
      return Response.json({ error: "Session problem ID is required." }, { status: 400 });
    }

    if (typeof studentId !== "string" || !studentId.trim()) {
      return Response.json({ error: "Student ID is required." }, { status: 400 });
    }

    if (typeof selectedAnswer !== "string" || !selectedAnswer.trim()) {
      return Response.json({ error: "Selected answer is required." }, { status: 400 });
    }

    const normalizedAnswer = normalizeAnswer(selectedAnswer);
    if (!["A", "B", "C", "D"].includes(normalizedAnswer)) {
      return Response.json(
        { error: "Selected answer must be A, B, C, or D." },
        { status: 400 },
      );
    }

    const sessionProblem = await getDailySessionProblemById(sessionProblemId);
    if (!sessionProblem || !sessionProblem.sessionId) {
      return Response.json({ error: "Session problem not found." }, { status: 404 });
    }

    const session = await getSessionById(sessionProblem.sessionId);
    if (!session) {
      return Response.json({ error: "Session not found." }, { status: 404 });
    }

    if (session.completed) {
      return Response.json(
        { error: "This session has already been graded and can no longer be edited." },
        { status: 400 },
      );
    }

    let solutionPhotoUrl: string | null | undefined;

    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return Response.json(
          { error: "Unsupported photo type. Upload PNG, JPEG, or WEBP." },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return Response.json(
          { error: "Photo is too large. The limit is 20 MB." },
          { status: 400 },
        );
      }

      const safeFilename = sanitizeFilename(file.name) || "solution-photo";
      const timestamp = Date.now();
      const objectPath = `solution-photos/${studentId}/${sessionProblemId}/${timestamp}-${safeFilename}`;
      const insforge = getInsforgeServerClient();

      const { data: storageObject, error: storageError } = await insforge.storage
        .from(SOLUTION_PHOTOS_BUCKET)
        .upload(objectPath, file);

      if (storageError) {
        return Response.json(
          { error: "Upload failed.", details: storageError.message },
          { status: 500 },
        );
      }

      if (!storageObject) {
        return Response.json(
          { error: "Upload failed.", details: "Storage upload returned no object." },
          { status: 500 },
        );
      }

      solutionPhotoUrl = storageObject.key;
    }

    // TODO: Add server-side auth and ownership checks before real multi-user usage.
    await upsertSubmission({
      sessionProblemId,
      studentId,
      selectedAnswer: normalizedAnswer,
      solutionPhotoUrl,
    });

    const allSubmitted = await markSessionCompletedIfAllSubmitted(
      sessionProblem.sessionId,
      studentId,
    );

    return Response.json({
      ok: true,
      allSubmitted,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save the answer.";

    return Response.json(
      {
        error: "Unable to save the answer.",
        details: message,
      },
      { status: 500 },
    );
  }
}
