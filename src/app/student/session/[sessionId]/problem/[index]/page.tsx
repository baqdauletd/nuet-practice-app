"use client";

import { useParams } from "next/navigation";
import { ProblemSolver } from "../../../../../../components/student/ProblemSolver";
import { useStudentShell } from "../../../../../../components/student/StudentShellContext";

export default function StudentProblemPage() {
  const { profile } = useStudentShell();
  const params = useParams<{ sessionId: string; index: string }>();
  const sessionId =
    typeof params.sessionId === "string" ? params.sessionId : "";
  const index =
    typeof params.index === "string" ? Number.parseInt(params.index, 10) : 0;

  return (
    <ProblemSolver profile={profile} sessionId={sessionId} index={index} />
  );
}
