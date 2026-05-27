import { z } from "zod";
import { createDailySession } from "../../../../lib/student-sessions/server";

const requestSchema = z.object({
  studentId: z.string().uuid(),
  problemCount: z.number().int().min(1).max(30),
});

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

    // TODO: Add server-side auth and ownership checks before real multi-user usage.
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
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create today's practice session.";

    return Response.json(
      {
        error: message,
      },
      { status: message === "Not enough approved problems available." ? 400 : 500 },
    );
  }
}
