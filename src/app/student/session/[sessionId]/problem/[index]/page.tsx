"use client";

import { useParams } from "next/navigation";
import { ProtectedDashboard } from "../../../../../../components/auth/ProtectedDashboard";
import { ProblemSolver } from "../../../../../../components/student/ProblemSolver";

export default function StudentProblemPage() {
  const params = useParams<{ sessionId: string; index: string }>();
  const sessionId =
    typeof params.sessionId === "string" ? params.sessionId : "";
  const index =
    typeof params.index === "string" ? Number.parseInt(params.index, 10) : 0;

  return (
    <ProtectedDashboard
      requiredRole="student"
      title="Solve Today’s Practice"
      description="Work through one approved Math problem per page. Results remain locked until the entire daily session is submitted."
      renderContent={(profile) => (
        <ProblemSolver profile={profile} sessionId={sessionId} index={index} />
      )}
    />
  );
}
