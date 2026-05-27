"use client";

"use client";

import { InstructorUploadPanel } from "../../components/instructor/InstructorUploadPanel";
import { ProtectedDashboard } from "../../components/auth/ProtectedDashboard";

export default function InstructorPage() {
  return (
    <ProtectedDashboard
      requiredRole="instructor"
      title="Instructor Dashboard"
      description="Upload source test files, run AI extraction, and open each upload to review the extracted Math problems."
      renderContent={(profile) => <InstructorUploadPanel profile={profile} />}
    />
  );
}
