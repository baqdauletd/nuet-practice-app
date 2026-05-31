"use client";

import { InstructorDashboardPanel } from "../../components/instructor/InstructorDashboardPanel";
import { ProtectedDashboard } from "../../components/auth/ProtectedDashboard";

export default function InstructorPage() {
  return (
    <ProtectedDashboard
      requiredRole="instructor"
      title="Instructor Dashboard"
      description="Upload source test files, run AI extraction, and open each upload to review the extracted Math problems."
      renderContent={(profile) => <InstructorDashboardPanel profile={profile} />}
    />
  );
}
