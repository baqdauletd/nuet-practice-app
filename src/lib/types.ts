export type UserRole = "instructor" | "student";

export type Difficulty = "easy" | "medium" | "hard";

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
  aiFeedback: Record<string, unknown> | null;
  isCorrect: boolean | null;
  submittedAt: string | null;
};
