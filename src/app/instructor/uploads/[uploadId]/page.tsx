"use client";

import { useParams } from "next/navigation";
import { ProblemReviewPanel } from "../../../../components/instructor/ProblemReviewPanel";
import { useInstructorShell } from "../../../../components/instructor/InstructorShellContext";

export default function InstructorUploadReviewPage() {
  const { profile } = useInstructorShell();
  const params = useParams<{ uploadId: string }>();
  const uploadId =
    typeof params.uploadId === "string" ? params.uploadId : "";

  return <ProblemReviewPanel profile={profile} uploadId={uploadId} />;
}
