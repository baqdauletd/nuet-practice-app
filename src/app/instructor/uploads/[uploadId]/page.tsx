"use client";

import { useParams } from "next/navigation";
import { ProtectedDashboard } from "../../../../components/auth/ProtectedDashboard";
import { ProblemReviewPanel } from "../../../../components/instructor/ProblemReviewPanel";

export default function InstructorUploadReviewPage() {
  const params = useParams<{ uploadId: string }>();
  const uploadId =
    typeof params.uploadId === "string" ? params.uploadId : "";

  return (
    <ProtectedDashboard
      requiredRole="instructor"
      title="Review Extracted Problems"
      description="Inspect AI-extracted Math problems, correct the text and choices, and approve only the items ready for later student use."
      renderContent={(profile) => (
        <ProblemReviewPanel profile={profile} uploadId={uploadId} />
      )}
    />
  );
}
