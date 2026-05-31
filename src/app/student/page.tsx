"use client";

import { ProtectedDashboard } from "../../components/auth/ProtectedDashboard";
import { StudentHomePanel } from "../../components/student/StudentHomePanel";

export default function StudentPage() {
  return (
    <ProtectedDashboard
      requiredRole="student"
      title="Student Practice"
      description="Start today’s Math practice, continue one problem at a time, and unlock results only after submitting the full session."
      renderContent={(profile) => <StudentHomePanel profile={profile} />}
    />
  );
}
