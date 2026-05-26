"use client";

import { InstructorUploadPanel } from "../../components/instructor/InstructorUploadPanel";
import { ProtectedDashboard } from "../../components/auth/ProtectedDashboard";

export default function InstructorPage() {
  return (
    <ProtectedDashboard
      requiredRole="instructor"
      title="Instructor Dashboard"
      description="Upload source test files now. Later slices will add AI extraction and problem review."
      renderContent={(profile) => <InstructorUploadPanel profile={profile} />}
    />
  );
}
