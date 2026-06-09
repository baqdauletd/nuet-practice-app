import { z } from "zod";
import {
  getCurrentServerUser,
  requireServerProfileRole,
} from "../../../lib/auth/server";
import { extractMathProblemsWithGemini } from "../../../lib/ai/gemini";
import {
  countProblemsForUpload,
  insertExtractedProblems,
  updateProblemSourceImage,
} from "../../../lib/problems/server";
import {
  createProblemSourceImage,
  resolveUploadMimeType,
} from "../../../lib/problem-source-images/server";
import {
  downloadTestUploadFile,
  getOwnedTestUpload,
  getTestUpload,
  updateTestUploadStatus,
} from "../../../lib/test-uploads/server";

const requestSchema = z.object({
  uploadId: z.string().uuid(),
  instructorId: z.string().uuid().optional(),
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
    const currentServerUser = await getCurrentServerUser();
    if (currentServerUser.available) {
      return Response.json(
        { error: "Server-authenticated session enforcement is not wired yet." },
        { status: 501 },
      );
    }

    let upload;
    if (parsed.data.instructorId) {
      const instructorId = parsed.data.instructorId;
      await requireServerProfileRole(instructorId, "instructor");
      upload = await getOwnedTestUpload(uploadId, instructorId);
    } else {
      upload = await getTestUpload(uploadId);
    }
    if (!upload) {
      return Response.json(
        {
          error: parsed.data.instructorId
            ? "Upload not found for this instructor."
            : "Upload not found.",
        },
        { status: 404 },
      );
    }

    // TODO: Replace client-provided instructorId with a server-authenticated user id once InsForge server session API is available.
    await updateTestUploadStatus(uploadId, "extracting");

    for (const sourceFile of upload.sourceFiles) {
      const fileBytes = await downloadTestUploadFile(sourceFile.storageKey);
      const mimeType = resolveUploadMimeType({
        displayName: sourceFile.originalFilename,
        storageKey: sourceFile.storageKey,
        bytes: fileBytes,
      });

      const extractedProblems = await extractMathProblemsWithGemini({
        bytes: fileBytes,
        mimeType,
        filename: sourceFile.originalFilename,
      });

      const insertedProblems = await insertExtractedProblems(uploadId, extractedProblems);
      const snapshotKeysByPage = new Map<number, string | null>();

      for (const [index, problem] of extractedProblems.entries()) {
        const insertedProblem = insertedProblems[index];
        if (!insertedProblem || !problem.needs_visual_reference) {
          continue;
        }

        try {
          const pageNumber = problem.source_page ?? 1;
          let sourceImageUrl = snapshotKeysByPage.get(pageNumber);

          if (sourceImageUrl === undefined) {
            sourceImageUrl = await createProblemSourceImage({
              uploadId,
              uploadBytes: fileBytes,
              uploadFilename: sourceFile.originalFilename,
              uploadStorageKey: sourceFile.storageKey,
              sourcePage: pageNumber,
            });
            snapshotKeysByPage.set(pageNumber, sourceImageUrl);
          }

          if (sourceImageUrl) {
            await updateProblemSourceImage(insertedProblem.id, sourceImageUrl);
          }
        } catch (error) {
          logRouteError(
            "Problem source image generation failed; continuing without snapshot.",
            error,
            {
              uploadId,
              problemId: insertedProblem.id,
              sourceFile: sourceFile.originalFilename,
              sourcePage: problem.source_page,
            },
          );
        }
      }
    }

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
    logRouteError("Instructor extract-problems failed.", error, { uploadId });

    return Response.json(
      {
        error:
          message === "Profile not found." ||
          message === "Profile role must be instructor."
            ? message
            : "Problem extraction failed.",
      },
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
