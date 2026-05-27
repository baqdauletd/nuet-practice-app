import { z } from "zod";
import {
  getCurrentServerUser,
  requireServerProfileRole,
} from "../../../../lib/auth/server";
import { createDailySession } from "../../../../lib/student-sessions/server";

const requestSchema = z.object({
  studentId: z.string().uuid(),
  problemCount: z.number().int().min(1).max(30),
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
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid studentId or problemCount." },
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

    await requireServerProfileRole(parsed.data.studentId, "student");
    // TODO: Replace client-provided studentId with a server-authenticated user id once InsForge server session API is available.
    const result = await createDailySession(
      parsed.data.studentId,
      parsed.data.problemCount,
    );

    return Response.json({
      sessionId: result.session.id,
      problemCount: result.problemCount,
      firstProblemPath: result.firstProblemPath,
    });
  } catch (error) {
    logRouteError("Student create-session failed.", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create today's practice session.";

    return Response.json(
      {
        error:
          message === "Not enough approved problems available." ||
          message === "Profile not found." ||
          message === "Profile role must be student."
            ? message
            : "Unable to create today's practice session.",
      },
      {
        status:
          message === "Not enough approved problems available." ||
          message === "Profile not found." ||
          message === "Profile role must be student."
            ? 400
            : 500,
      },
    );
  }
}
