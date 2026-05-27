import { z } from "zod";
import {
  getCurrentServerUser,
  requireServerProfileRole,
} from "../../../../lib/auth/server";
import { SOLUTION_PHOTOS_BUCKET } from "../../../../lib/constants";
import { getInsforgeServerClient } from "../../../../lib/insforge/server";
import {
  getOwnedSessionProblemByStudentId,
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

const requestSchema = z.object({
  sessionProblemId: z.string().uuid(),
  studentId: z.string().uuid(),
  selectedAnswer: z.enum(["A", "B", "C", "D"]),
});

function logRouteError(message: string, error: unknown, context?: object) {
  if (process.env.NODE_ENV !== "production") {
    console.error(message, {
      ...(context ?? {}),
      error: error instanceof Error ? error.message : error,
    });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sessionProblemId = formData.get("sessionProblemId");
    const studentId = formData.get("studentId");
    const selectedAnswer = formData.get("selectedAnswer");
    const file = formData.get("file");

    const parsed = requestSchema.safeParse({
      sessionProblemId,
      studentId,
      selectedAnswer:
        typeof selectedAnswer === "string"
          ? normalizeAnswer(selectedAnswer)
          : selectedAnswer,
    });

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid session problem, student, or selected answer." },
        { status: 400 },
      );
    }

    const currentServerUser = await getCurrentServerUser();
    if (currentServerUser.available) {
      return Response.json(
        { error: "Server-authenticated session enforcement is not wired yet." },
        { status: 501 },
      );
    }

    const { sessionProblemId: safeSessionProblemId, studentId: safeStudentId, selectedAnswer: normalizedAnswer } =
      parsed.data;

    await requireServerProfileRole(safeStudentId, "student");

    const ownedSessionProblem = await getOwnedSessionProblemByStudentId(
      safeSessionProblemId,
      safeStudentId,
    );
    if (!ownedSessionProblem) {
      return Response.json(
        { error: "Session problem not found for this student." },
        { status: 404 },
      );
    }

    const { sessionProblem, session } = ownedSessionProblem;

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
      const objectPath = `${safeStudentId}/${safeSessionProblemId}/${timestamp}-${safeFilename}`;
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

    // TODO: Replace client-provided studentId with a server-authenticated user id once InsForge server session API is available.
    await upsertSubmission({
      sessionProblemId: safeSessionProblemId,
      studentId: safeStudentId,
      selectedAnswer: normalizedAnswer,
      solutionPhotoUrl,
    });

    const allSubmitted = await markSessionCompletedIfAllSubmitted(
      session.id,
      safeStudentId,
    );

    return Response.json({
      ok: true,
      allSubmitted,
    });
  } catch (error) {
    logRouteError("Student submit-answer failed.", error);
    const message =
      error instanceof Error ? error.message : "Unable to save the answer.";

    return Response.json(
      {
        error: "Unable to save the answer.",
      },
      { status: message === "Profile not found." || message === "Profile role must be student." ? 400 : 500 },
    );
  }
}
