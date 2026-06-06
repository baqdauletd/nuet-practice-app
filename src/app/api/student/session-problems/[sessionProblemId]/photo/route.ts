import { z } from "zod";
import {
  getCurrentServerUser,
  requireServerProfileRole,
} from "../../../../../../lib/auth/server";
import {
  downloadSolutionPhoto,
  getOwnedSessionProblemByStudentId,
  getSubmissionForSessionProblem,
} from "../../../../../../lib/student-sessions/server";

const requestSchema = z.object({
  sessionProblemId: z.string().uuid(),
  studentId: z.string().uuid(),
  index: z.coerce.number().int().min(0).default(0),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionProblemId: string }> },
) {
  try {
    const { sessionProblemId } = await context.params;
    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId");
    const index = url.searchParams.get("index") ?? "0";

    const parsed = requestSchema.safeParse({
      sessionProblemId,
      studentId,
      index,
    });

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid sessionProblemId or studentId." },
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
      sessionProblemId: safeSessionProblemId,
      studentId: safeStudentId,
      index: safeIndex,
    } = parsed.data;

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

    const submission = await getSubmissionForSessionProblem(
      safeSessionProblemId,
      safeStudentId,
    );
    const solutionPhotoUrl = submission?.solutionPhotoUrls[safeIndex] ?? null;

    if (!solutionPhotoUrl) {
      return Response.json(
        { error: "Solution photo not found." },
        { status: 404 },
      );
    }

    const photo = await downloadSolutionPhoto(solutionPhotoUrl);

    return new Response(photo.bytes, {
      headers: {
        "Content-Type": photo.mimeType,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load the solution photo.";

    return Response.json(
      { error: message },
      {
        status:
          message === "Profile not found." ||
          message === "Profile role must be student."
            ? 400
            : 500,
      },
    );
  }
}
