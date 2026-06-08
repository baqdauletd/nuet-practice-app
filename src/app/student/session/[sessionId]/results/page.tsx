"use client";

import { useParams } from "next/navigation";
import { ResultsPanel } from "../../../../../components/student/ResultsPanel";
import { useStudentShell } from "../../../../../components/student/StudentShellContext";

export default function StudentResultsPage() {
  const { profile } = useStudentShell();
  const params = useParams<{ sessionId: string }>();
  const sessionId =
    typeof params.sessionId === "string" ? params.sessionId : "";

  return <ResultsPanel profile={profile} sessionId={sessionId} />;
}
