import { z } from "zod";
import {
  getCurrentServerUser,
  requireServerProfileRole,
} from "../../../../lib/auth/server";
import {
  createDailySession,
  listDailySessionSourceOptions,
} from "../../../../lib/student-sessions/server";

const requestSchema = z.object({
  studentId: z.string().uuid(),
  problemCount: z.number().int().min(1).max(30).optional(),
  uploadId: z.string().uuid().optional(),
  useEntireUpload: z.boolean().optional(),
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
        { error: "Invalid session request." },
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
    const result = await createDailySession(parsed.data);

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
          message === "That file does not have enough approved problems." ||
          message === "This file is not eligible for an all-problems practice session." ||
          message === "A file must be selected to solve all problems from one upload." ||
          message === "Choose at least 1 problem when starting a file-based custom session." ||
          message === "Choose a valid number of problems." ||
          message === "Profile not found." ||
          message === "Profile role must be student."
            ? message
            : "Unable to create today's practice session.",
      },
      {
        status:
          message === "Not enough approved problems available." ||
          message === "That file does not have enough approved problems." ||
          message === "This file is not eligible for an all-problems practice session." ||
          message === "A file must be selected to solve all problems from one upload." ||
          message === "Choose at least 1 problem when starting a file-based custom session." ||
          message === "Choose a valid number of problems." ||
          message === "Profile not found." ||
          message === "Profile role must be student."
            ? 400
            : 500,
      },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return Response.json({ error: "Missing studentId." }, { status: 400 });
    }

    const parsedStudentId = z.string().uuid().safeParse(studentId);

    if (!parsedStudentId.success) {
      return Response.json({ error: "Invalid studentId." }, { status: 400 });
    }

    const currentServerUser = await getCurrentServerUser();
    if (currentServerUser.available) {
      return Response.json(
        { error: "Server-authenticated session enforcement is not wired yet." },
        { status: 501 },
      );
    }

    await requireServerProfileRole(parsedStudentId.data, "student");
    const options = await listDailySessionSourceOptions(parsedStudentId.data);

    return Response.json({ options });
  } catch (error) {
    logRouteError("Student session-source options failed.", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load session source options.";

    return Response.json(
      {
        error:
          message === "Profile not found." ||
          message === "Profile role must be student."
            ? message
            : "Unable to load session source options.",
      },
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
