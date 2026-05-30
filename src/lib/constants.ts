export const APP_NAME = "NUET Practice App";

export const TEST_UPLOADS_BUCKET = "test-uploads";
export const SOLUTION_PHOTOS_BUCKET = "solution-photos";

export const ROUTES = {
  home: "/",
  login: "/login",
  instructor: "/instructor",
  student: "/student",
} as const;

export function getStudentSessionProblemRoute(sessionId: string, index: number) {
  return `${ROUTES.student}/session/${sessionId}/problem/${index}`;
}

export function getStudentSessionResultsRoute(sessionId: string) {
  return `${ROUTES.student}/session/${sessionId}/results`;
}

export function getProblemSourceImageRoute(
  problemId: string,
  viewerId: string,
  viewerRole: "instructor" | "student",
) {
  return `/api/problems/${problemId}/source-image?viewerId=${encodeURIComponent(viewerId)}&viewerRole=${encodeURIComponent(viewerRole)}`;
}
