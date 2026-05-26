import { z } from "zod";
import { extractMathProblemsWithGemini } from "../../../lib/ai/gemini";
import { countProblemsForUpload, insertExtractedProblems } from "../../../lib/problems/server";
import {
  downloadTestUploadFile,
  getTestUpload,
  updateTestUploadStatus,
} from "../../../lib/test-uploads/server";

const requestSchema = z.object({
  uploadId: z.string().uuid(),
});

export async function POST(request: Request) {
  let uploadId: string | null = null;

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid uploadId." },
        { status: 400 },
      );
    }

    uploadId = parsed.data.uploadId;

    const upload = await getTestUpload(uploadId);
    if (!upload) {
      return Response.json({ error: "Upload not found." }, { status: 404 });
    }

    // TODO: Add server-side auth and instructor ownership verification before real multi-user usage.
    await updateTestUploadStatus(uploadId, "extracting");

    const fileBytes = await downloadTestUploadFile(upload.fileUrl);
    const mimeType = upload.originalFilename.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : upload.originalFilename.toLowerCase().endsWith(".png")
        ? "image/png"
        : upload.originalFilename.toLowerCase().endsWith(".jpg") ||
            upload.originalFilename.toLowerCase().endsWith(".jpeg")
          ? "image/jpeg"
          : upload.originalFilename.toLowerCase().endsWith(".webp")
            ? "image/webp"
            : "application/octet-stream";

    const extractedProblems = await extractMathProblemsWithGemini({
      bytes: fileBytes,
      mimeType,
      filename: upload.originalFilename,
    });

    await insertExtractedProblems(uploadId, extractedProblems);
    const count = await countProblemsForUpload(uploadId);
    await updateTestUploadStatus(uploadId, "extracted");

    return Response.json({
      uploadId,
      count,
    });
  } catch (error) {
    if (uploadId) {
      try {
        await updateTestUploadStatus(uploadId, "failed");
      } catch {
        // Ignore status update failures while surfacing the original extraction error.
      }
    }

    const message =
      error instanceof Error ? error.message : "Problem extraction failed.";

    return Response.json(
      { error: "Problem extraction failed.", details: message },
      { status: 500 },
    );
  }
}
