"use client";

import { ProtectedDashboard } from "../../../components/auth/ProtectedDashboard";
import { StudentSessionsPanel } from "../../../components/student/StudentSessionsPanel";

export default function StudentSessionsPage() {
  return (
    <ProtectedDashboard
      requiredRole="student"
      title="Session History"
      description="Review every practice session you have started, continue unfinished work, or reopen completed results."
      renderContent={(profile) => <StudentSessionsPanel profile={profile} />}
    />
  );
}
