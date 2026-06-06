import type { StoredUploadFile } from "./upload-files";

export type UserRole = "instructor" | "student";

export type Difficulty = "easy" | "medium" | "hard";
export type UploadStatus = "uploaded" | "extracting" | "extracted" | "failed";

export type ChoiceMap = Record<string, string>;

export type AppUserProfile = {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
  nickname: string | null;
  createdAt: string | null;
};

export type AuthState = {
  status: "loading" | "signed_out" | "missing_profile" | "signed_in";
  user: {
    id: string;
    email: string;
  } | null;
  profile: AppUserProfile | null;
  errorMessage: string | null;
};

export type Problem = {
  id: string;
  uploadId: string | null;
  subject: string;
  questionText: string;
  sourceImageUrl: string | null;
  choices: ChoiceMap | null;
  correctAnswer: string | null;
  aiSolution: string | null;
  difficulty: Difficulty | null;
  sourcePage: number | null;
  approved: boolean;
  createdAt: string | null;
};

export type ExtractedProblem = {
  question_text: string;
  choices: ChoiceMap | null;
  correct_answer: string | null;
  solution: string | null;
  needs_visual_reference: boolean | null;
  difficulty: Difficulty | null;
  source_page: number | null;
};

export type ExtractProblemsResponse = {
  uploadId: string;
  count: number;
};

export type TestUpload = {
  id: string;
  instructorId: string | null;
  fileUrl: string;
  fileUrls: string[];
  originalFilename: string;
  sourceFiles: StoredUploadFile[];
  status: UploadStatus;
  createdAt: string | null;
};

export type DailySession = {
  id: string;
  studentId: string | null;
  sessionDate: string;
  problemCount: number;
  completed: boolean;
  createdAt: string | null;
};

export type Submission = {
  id: string;
  sessionProblemId: string | null;
  studentId: string | null;
  selectedAnswer: string | null;
  solutionPhotoUrl: string | null;
  solutionPhotoUrls: string[];
  aiFeedback: GradingFeedback | null;
  isCorrect: boolean | null;
  submittedAt: string | null;
};

export type DailySessionProblem = {
  id: string;
  sessionId: string | null;
  problemId: string | null;
  orderIndex: number;
};

export type SessionProblemWithProblem = {
  id: string;
  sessionId: string | null;
  problemId: string | null;
  orderIndex: number;
  problem: Problem;
  submission: Submission | null;
};

export type StudentSessionStatus =
  | "not_started"
  | "in_progress"
  | "ready_for_grading"
  | "completed";

export type GradingFeedback = {
  is_correct: boolean;
  photo_solution_correct?: boolean | null;
  feedback: string;
  mistakes: string[];
  guided_solution: string;
  optimal_solution: string;
  debug_error?: string;
  debug_step?:
    | "gemini_grading"
    | "photo_download"
    | "json_parse"
    | "photo_download_failed_continued_without_photo";
};

export type SessionProgress = {
  session: DailySession;
  totalProblems: number;
  submittedCount: number;
  allSubmitted: boolean;
  status: StudentSessionStatus;
  firstIncompleteIndex: number | null;
};

export type StudentSessionSummary = {
  session: DailySession;
  totalProblems: number;
  submittedCount: number;
  allSubmitted: boolean;
  status: StudentSessionStatus;
  firstIncompleteIndex: number | null;
};

export type DailySessionSourceOption = {
  uploadId: string;
  originalFilename: string;
  approvedProblemCount: number;
  canUseEntireUpload: boolean;
};

export type CreateDailySessionInput = {
  studentId: string;
  problemCount?: number;
  uploadId?: string;
  useEntireUpload?: boolean;
};

export type ConnectionStatus = "pending" | "accepted" | "rejected";

export type InstructorStudentConnection = {
  id: string;
  instructorId: string;
  studentId: string;
  status: ConnectionStatus;
  createdAt: string | null;
  respondedAt: string | null;
};

export type ConnectionRequestSummary = {
  connection: InstructorStudentConnection;
  instructor: AppUserProfile;
  student: AppUserProfile;
};

export type AssignedProblem = {
  id: string;
  instructor: AppUserProfile;
  student: AppUserProfile;
  problem: Problem;
  upload: TestUpload | null;
  createdAt: string | null;
};

export type InstructorProblemLibraryItem = {
  problem: Problem;
  instructor: AppUserProfile;
  upload: TestUpload | null;
  assignedAt: string | null;
  assignmentId: string | null;
};

export type AssignedProblemProgressItem = {
  assignment: AssignedProblem;
  solved: boolean;
};

export type InstructorAssignedProblemProgress = {
  instructor: AppUserProfile;
  items: AssignedProblemProgressItem[];
  solvedCount: number;
  totalCount: number;
  unsolvedCount: number;
};
