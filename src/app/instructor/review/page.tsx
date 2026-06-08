"use client";

import { useSearchParams } from "next/navigation";
import { InstructorSessionReviewPanel } from "../../../components/instructor/InstructorSessionReviewPanel";

export default function InstructorReviewPage() {
  const searchParams = useSearchParams();

  return (
    <InstructorSessionReviewPanel
      studentId={searchParams.get("studentId") ?? undefined}
      sessionId={searchParams.get("sessionId") ?? undefined}
    />
  );
}
