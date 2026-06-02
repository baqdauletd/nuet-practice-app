export const APP_NAME = "NUET Practice App";

export const TEST_UPLOADS_BUCKET = "test-uploads";
export const SOLUTION_PHOTOS_BUCKET = "solution-photos";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  instructor: "/instructor",
  student: "/student",
  studentSessions: "/student/sessions",
} as const;

export function getStudentSessionProblemRoute(sessionId: string, index: number) {
  return `${ROUTES.student}/session/${sessionId}/problem/${index}`;
}

export function getStudentSessionResultsRoute(sessionId: string) {
  return `${ROUTES.student}/session/${sessionId}/results`;
}

export function getStudentSessionsRoute() {
  return ROUTES.studentSessions;
}

export function getStudentInstructorRoute(instructorId: string) {
  return `${ROUTES.student}/instructors/${instructorId}`;
}

export function getProblemSourceImageRoute(
  problemId: string,
  viewerId: string,
  viewerRole: "instructor" | "student",
) {
  return `/api/problems/${problemId}/source-image?viewerId=${encodeURIComponent(viewerId)}&viewerRole=${encodeURIComponent(viewerRole)}`;
}

export function getStudentSubmissionPhotoRoute(
  sessionProblemId: string,
  studentId: string,
  version?: string | null,
) {
  const query = new URLSearchParams({
    studentId,
  });

  if (version) {
    query.set("v", version);
  }

  return `/api/student/session-problems/${sessionProblemId}/photo?${query.toString()}`;
}
