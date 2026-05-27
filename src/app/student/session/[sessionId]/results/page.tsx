"use client";

import { useParams } from "next/navigation";
import { ProtectedDashboard } from "../../../../../components/auth/ProtectedDashboard";
import { ResultsPanel } from "../../../../../components/student/ResultsPanel";

export default function StudentResultsPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId =
    typeof params.sessionId === "string" ? params.sessionId : "";

  return (
    <ProtectedDashboard
      requiredRole="student"
      title="Practice Results"
      description="Results unlock only after all problems in the daily session are submitted."
      renderContent={(profile) => (
        <ResultsPanel profile={profile} sessionId={sessionId} />
      )}
    />
  );
}
