"use client";

import { use } from "react";
import { StudentInstructorProblemsPanel } from "../../../../components/student/StudentInstructorProblemsPanel";
import { useStudentShell } from "../../../../components/student/StudentShellContext";

export default function StudentInstructorProblemsPage({
  params,
}: {
  params: Promise<{ instructorId: string }>;
}) {
  const { profile } = useStudentShell();
  const { instructorId } = use(params);

  return (
    <StudentInstructorProblemsPanel
      profile={profile}
      instructorId={instructorId}
    />
  );
}
