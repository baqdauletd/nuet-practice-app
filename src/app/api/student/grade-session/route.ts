import { z } from "zod";
import { gradeSubmissionWithGemini } from "../../../../lib/ai/gemini";
import {
  downloadSolutionPhoto,
  getSessionProgress,
  getSessionProblems,
  setSessionCompleted,
  updateSubmissionGrading,
} from "../../../../lib/student-sessions/server";
import type { GradingFeedback } from "../../../../lib/types";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
});

function normalizeAnswer(value: string | null) {
  return value?.trim().toUpperCase() ?? "";
}

function createFallbackFeedback(isCorrect: boolean): GradingFeedback {
  return {
    is_correct: isCorrect,
    feedback: "AI feedback failed, but MCQ correctness was recorded.",
    mistakes: isCorrect
      ? []
      : ["AI feedback could not be generated for this problem."],
    guided_solution:
      "Use the instructor-approved solution and your work to review this problem manually.",
    optimal_solution:
      "Review the approved solution for the cleanest method until AI feedback is available.",
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid sessionId or studentId." },
        { status: 400 },
      );
    }

    const { sessionId, studentId } = parsed.data;
    const progress = await getSessionProgress(sessionId, studentId);

    if (!progress.allSubmitted) {
      return Response.json(
        { error: "Cannot grade before all problems are submitted." },
        { status: 400 },
      );
    }

    // TODO: Add server-side auth and ownership checks before real multi-user usage.
    const sessionProblems = await getSessionProblems(sessionId, studentId);

    for (const sessionProblem of sessionProblems) {
      if (!sessionProblem.submission) {
        return Response.json(
          { error: "Cannot grade before all problems are submitted." },
          { status: 400 },
        );
      }

      const normalizedSelectedAnswer = normalizeAnswer(
        sessionProblem.submission.selectedAnswer,
      );
      const normalizedCorrectAnswer = normalizeAnswer(
        sessionProblem.problem.correctAnswer,
      );
      const isCorrect =
        normalizedSelectedAnswer !== "" &&
        normalizedCorrectAnswer !== "" &&
        normalizedSelectedAnswer === normalizedCorrectAnswer;

      let feedback: GradingFeedback;

      try {
        let solutionPhotoBytes: Uint8Array | null = null;
        let solutionPhotoMimeType: string | null = null;

        if (sessionProblem.submission.solutionPhotoUrl) {
          const photo = await downloadSolutionPhoto(
            sessionProblem.submission.solutionPhotoUrl,
          );
          solutionPhotoBytes = photo.bytes;
          solutionPhotoMimeType = photo.mimeType;
        }

        const aiFeedback = await gradeSubmissionWithGemini({
          problemText: sessionProblem.problem.questionText,
          choices: sessionProblem.problem.choices,
          correctAnswer: sessionProblem.problem.correctAnswer,
          officialSolution: sessionProblem.problem.aiSolution,
          selectedAnswer: sessionProblem.submission.selectedAnswer,
          solutionPhotoBytes,
          solutionPhotoMimeType,
        });

        feedback = {
          ...aiFeedback,
          is_correct: isCorrect,
        };
      } catch {
        feedback = createFallbackFeedback(isCorrect);
      }

      await updateSubmissionGrading(sessionProblem.submission.id, {
        isCorrect,
        aiFeedback: feedback,
      });
    }

    await setSessionCompleted(sessionId, true);

    return Response.json({
      ok: true,
      gradedCount: sessionProblems.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to grade the session.";

    return Response.json(
      {
        error: "Unable to grade the session.",
        details: message,
      },
      { status: 500 },
    );
  }
}
