import { z } from "zod";
import {
  getCurrentServerUser,
  requireServerProfileRole,
} from "../../../../../lib/auth/server";
import { getProblemById } from "../../../../../lib/problems/server";
import { inferUploadMimeType } from "../../../../../lib/problem-source-images/server";
import {
  downloadTestUploadFile,
  getOwnedTestUpload,
} from "../../../../../lib/test-uploads/server";

const requestSchema = z.object({
  problemId: z.string().uuid(),
  viewerId: z.string().uuid(),
  viewerRole: z.enum(["instructor", "student"]),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ problemId: string }> },
) {
  try {
    const { problemId } = await context.params;
    const url = new URL(request.url);
    const viewerId = url.searchParams.get("viewerId");
    const viewerRole = url.searchParams.get("viewerRole");

    const parsed = requestSchema.safeParse({
      problemId,
      viewerId,
      viewerRole,
    });

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid problemId, viewerId, or viewerRole." },
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
      problemId: safeProblemId,
      viewerId: safeViewerId,
      viewerRole: safeViewerRole,
    } = parsed.data;

    await requireServerProfileRole(safeViewerId, safeViewerRole);

    const problem = await getProblemById(safeProblemId);
    if (!problem || !problem.sourceImageUrl) {
      return Response.json({ error: "Problem source image not found." }, { status: 404 });
    }

    if (safeViewerRole === "instructor") {
      if (!problem.uploadId) {
        return Response.json({ error: "Problem upload not found." }, { status: 404 });
      }

      const ownedUpload = await getOwnedTestUpload(problem.uploadId, safeViewerId);
      if (!ownedUpload) {
        return Response.json(
          { error: "Problem source image not found for this instructor." },
          { status: 404 },
        );
      }
    }

    const bytes = await downloadTestUploadFile(problem.sourceImageUrl);
    const mimeType = inferUploadMimeType(problem.sourceImageUrl);

    return new Response(bytes, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load the problem image.";

    return Response.json(
      { error: message },
      {
        status:
          message === "Profile not found." ||
          message === "Profile role must be instructor." ||
          message === "Profile role must be student."
            ? 400
            : 500,
      },
    );
  }
}
