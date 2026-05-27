import { z } from "zod";
import {
  getCurrentServerUser,
  requireServerProfileRole,
} from "../../../../lib/auth/server";
import { TEST_UPLOADS_BUCKET } from "../../../../lib/constants";
import { getInsforgeServerClient } from "../../../../lib/insforge/server";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
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

const instructorIdSchema = z.string().uuid();

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
    const file = formData.get("file");
    const instructorId = formData.get("instructorId");

    if (!(file instanceof File)) {
      return Response.json(
        { ok: false, message: "File is required." },
        { status: 400 },
      );
    }

    if (typeof instructorId !== "string" || !instructorId.trim()) {
      return Response.json(
        { ok: false, message: "Instructor ID is required." },
        { status: 400 },
      );
    }

    const parsedInstructorId = instructorIdSchema.safeParse(instructorId);
    if (!parsedInstructorId.success) {
      return Response.json(
        { ok: false, message: "Instructor ID is invalid." },
        { status: 400 },
      );
    }

    const currentServerUser = await getCurrentServerUser();
    if (currentServerUser.available) {
      return Response.json(
        { ok: false, message: "Server-authenticated session enforcement is not wired yet." },
        { status: 501 },
      );
    }

    const instructorProfile = await requireServerProfileRole(
      parsedInstructorId.data,
      "instructor",
    );

    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      return Response.json(
        {
          ok: false,
          message: "Unsupported file type. Upload a PDF, PNG, JPEG, or WEBP file.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json(
        { ok: false, message: "File is too large. The limit is 20 MB." },
        { status: 400 },
      );
    }

    const safeFilename = sanitizeFilename(file.name) || "upload";
    const timestamp = Date.now();
    const objectPath = `instructor-tests/${instructorProfile.id}/${timestamp}-${safeFilename}`;

    const insforge = getInsforgeServerClient();

    const { data: storageObject, error: storageError } = await insforge.storage
      .from(TEST_UPLOADS_BUCKET)
      .upload(objectPath, file);

    if (storageError) {
      return Response.json(
        {
          ok: false,
          message: "Upload failed.",
          details: storageError.message,
        },
        { status: 500 },
      );
    }

    if (!storageObject) {
      return Response.json(
        {
          ok: false,
          message: "Upload failed.",
          details: "Storage upload returned no object.",
        },
        { status: 500 },
      );
    }

    const { data: uploadRow, error: uploadError } = await insforge.database
      .from("test_uploads")
      .insert({
        instructor_id: instructorProfile.id,
        // TODO: Replace client-provided instructorId with a server-authenticated user id once InsForge server session API is available.
        // TODO: Rename file_url to file_path when schema evolves; we store the durable storage key here.
        file_url: storageObject.key,
        original_filename: file.name,
        status: "uploaded",
      })
      .select("id, instructor_id, file_url, original_filename, status, created_at")
      .single();

    if (uploadError) {
      return Response.json(
        {
          ok: false,
          message: "Upload failed.",
          details: uploadError.message,
        },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      upload: uploadRow,
    });
  } catch (error) {
    logRouteError("Instructor upload-test failed.", error);
    const message =
      error instanceof Error ? error.message : "Upload failed unexpectedly.";

    return Response.json(
      {
        ok: false,
        message: "Upload failed.",
      },
      { status: message === "Profile not found." || message === "Profile role must be instructor." ? 400 : 500 },
    );
  }
}
