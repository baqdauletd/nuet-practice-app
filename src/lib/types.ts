export type UserRole = "instructor" | "student";

export type Difficulty = "easy" | "medium" | "hard";
export type UploadStatus = "uploaded" | "extracting" | "extracted" | "failed";

export type ChoiceMap = Record<string, string>;

export type AppUserProfile = {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
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
  originalFilename: string;
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
  feedback: string;
  mistakes: string[];
  guided_solution: string;
  optimal_solution: string;
};

export type SessionProgress = {
  session: DailySession;
  totalProblems: number;
  submittedCount: number;
  allSubmitted: boolean;
  status: StudentSessionStatus;
  firstIncompleteIndex: number | null;
};
