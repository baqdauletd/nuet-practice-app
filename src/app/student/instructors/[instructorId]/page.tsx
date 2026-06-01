"use client";

import { use } from "react";
import { ProtectedDashboard } from "../../../../components/auth/ProtectedDashboard";
import { StudentInstructorProblemsPanel } from "../../../../components/student/StudentInstructorProblemsPanel";

export default function StudentInstructorProblemsPage({
  params,
}: {
  params: Promise<{ instructorId: string }>;
}) {
  const { instructorId } = use(params);

  return (
    <ProtectedDashboard
      requiredRole="student"
      title="Instructor Problems"
      description="Open one instructor at a time and review only the problems assigned by that instructor."
      renderContent={(profile) => (
        <StudentInstructorProblemsPanel
          profile={profile}
          instructorId={instructorId}
        />
      )}
    />
  );
}
