import { z } from "zod";
import {
  getCurrentServerUser,
  requireServerProfileRole,
} from "../../../../lib/auth/server";
import { gradeSubmissionWithGemini } from "../../../../lib/ai/gemini";
import {
  getOwnedSessionByStudentId,
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

function logRouteError(message: string, error: unknown, context?: object) {
  if (process.env.NODE_ENV !== "production") {
    console.error(message, {
      ...(context ?? {}),
      error: error instanceof Error ? error.message : error,
    });
  }
}

function normalizeAnswer(value: string | null) {
  return value?.trim() ?? "";
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
}

function getDebugStepFromErrorMessage(
  message: string,
): GradingFeedback["debug_step"] {
  if (message.includes("invalid grading JSON") || message.includes("schema validation")) {
    return "json_parse";
  }

  return "gemini_grading";
}

function createDebugFallbackFeedback(
  isCorrect: boolean,
  debug: {
    debugError?: string;
    debugStep?: GradingFeedback["debug_step"];
  },
) {
  const feedback = createFallbackFeedback(isCorrect);

  if (process.env.NODE_ENV !== "production") {
    if (debug.debugError) {
      feedback.debug_error = debug.debugError;
    }

    if (debug.debugStep) {
      feedback.debug_step = debug.debugStep;
    }
  }

  return feedback;
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
    const currentServerUser = await getCurrentServerUser();
    if (currentServerUser.available) {
      return Response.json(
        { error: "Server-authenticated session enforcement is not wired yet." },
        { status: 501 },
      );
    }

    await requireServerProfileRole(studentId, "student");
    const ownedSession = await getOwnedSessionByStudentId(sessionId, studentId);
    if (!ownedSession) {
      return Response.json(
        { error: "Session not found for this student." },
        { status: 404 },
      );
    }

    const progress = await getSessionProgress(sessionId, studentId);

    if (!progress.allSubmitted) {
      return Response.json(
        { error: "Cannot grade before all problems are submitted." },
        { status: 400 },
      );
    }

    // TODO: Replace client-provided studentId with a server-authenticated user id once InsForge server session API is available.
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
        let photoDownloadDebugStep:
          | "photo_download_failed_continued_without_photo"
          | undefined;
        let photoDownloadDebugError: string | undefined;

        if (sessionProblem.submission.solutionPhotoUrl) {
          try {
            const photo = await downloadSolutionPhoto(
              sessionProblem.submission.solutionPhotoUrl,
            );
            solutionPhotoBytes = photo.bytes;
            solutionPhotoMimeType = photo.mimeType;
          } catch (error) {
            const message = getErrorMessage(error);
            console.error("Student grading photo download failed.", {
              sessionId,
              sessionProblemId: sessionProblem.id,
              submissionId: sessionProblem.submission.id,
              solutionPhotoUrl: sessionProblem.submission.solutionPhotoUrl,
              error: message,
            });
            photoDownloadDebugStep =
              "photo_download_failed_continued_without_photo";
            photoDownloadDebugError = message;
          }
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

        if (
          process.env.NODE_ENV !== "production" &&
          photoDownloadDebugStep &&
          photoDownloadDebugError
        ) {
          feedback.debug_step = photoDownloadDebugStep;
          feedback.debug_error = photoDownloadDebugError;
        }
      } catch (error) {
        const message = getErrorMessage(error);
        const debugStep = getDebugStepFromErrorMessage(message);
        console.error("Student grading Gemini feedback failed.", {
          sessionId,
          sessionProblemId: sessionProblem.id,
          submissionId: sessionProblem.submission.id,
          error: message,
          selectedAnswer: sessionProblem.submission.selectedAnswer,
          correctAnswer: sessionProblem.problem.correctAnswer,
          hasSolutionPhoto: Boolean(sessionProblem.submission.solutionPhotoUrl),
        });
        feedback = createDebugFallbackFeedback(isCorrect, {
          debugError: message,
          debugStep,
        });
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
    logRouteError("Student grade-session failed.", error);
    const message =
      error instanceof Error ? error.message : "Unable to grade the session.";

    return Response.json(
      {
        error: "Unable to grade the session.",
      },
      { status: message === "Profile not found." || message === "Profile role must be student." ? 400 : 500 },
    );
  }
}
