import { z } from "zod";
import {
  getCurrentServerUser,
  requireServerProfileRole,
} from "../../../../../../lib/auth/server";
import {
  downloadTestUploadFile,
  getOwnedTestUpload,
} from "../../../../../../lib/test-uploads/server";
import { resolveUploadMimeType } from "../../../../../../lib/problem-source-images/server";

const requestSchema = z.object({
  uploadId: z.string().uuid(),
  instructorId: z.string().uuid(),
  index: z.coerce.number().int().min(0).default(0),
});

function sanitizeFilename(filename: string) {
  return filename.replace(/[\r\n"]/g, "_");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ uploadId: string }> },
) {
  try {
    const { uploadId } = await context.params;
    const url = new URL(request.url);
    const instructorId = url.searchParams.get("instructorId");
    const index = url.searchParams.get("index") ?? "0";

    const parsed = requestSchema.safeParse({
      uploadId,
      instructorId,
      index,
    });

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid uploadId or instructorId." },
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

    const {
      uploadId: safeUploadId,
      instructorId: safeInstructorId,
      index: safeIndex,
    } = parsed.data;

    await requireServerProfileRole(safeInstructorId, "instructor");

    const upload = await getOwnedTestUpload(safeUploadId, safeInstructorId);
    if (!upload) {
      return Response.json(
        { error: "Upload not found for this instructor." },
        { status: 404 },
      );
    }

    const sourceFile = upload.sourceFiles[safeIndex];
    if (!sourceFile) {
      return Response.json(
        { error: "Uploaded file not found." },
        { status: 404 },
      );
    }

    const fileBytes = await downloadTestUploadFile(sourceFile.storageKey);
    const mimeType = resolveUploadMimeType({
      displayName: sourceFile.originalFilename,
      storageKey: sourceFile.storageKey,
      bytes: fileBytes,
    });
    const filename = sanitizeFilename(sourceFile.originalFilename);

    return new Response(fileBytes, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to open the uploaded file.";

    return Response.json(
      { error: message },
      {
        status:
          message === "Profile not found." ||
          message === "Profile role must be instructor."
            ? 400
            : 500,
      },
    );
  }
}
