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

    const parsed = requestSchema.safeParse({
      uploadId,
      instructorId,
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

    const { uploadId: safeUploadId, instructorId: safeInstructorId } = parsed.data;

    await requireServerProfileRole(safeInstructorId, "instructor");

    const upload = await getOwnedTestUpload(safeUploadId, safeInstructorId);
    if (!upload) {
      return Response.json(
        { error: "Upload not found for this instructor." },
        { status: 404 },
      );
    }

    const fileBytes = await downloadTestUploadFile(upload.fileUrl);
    const mimeType = resolveUploadMimeType({
      displayName: upload.originalFilename,
      storageKey: upload.fileUrl,
      bytes: fileBytes,
    });
    const filename = sanitizeFilename(upload.originalFilename);

    return new Response(fileBytes, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
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
