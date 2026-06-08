"use client";

import { StudentDashboardPanel } from "../../../components/student/StudentDashboardPanel";
import { useStudentShell } from "../../../components/student/StudentShellContext";

export default function StudentPracticePage() {
  const { profile } = useStudentShell();
  return <StudentDashboardPanel profile={profile} />;
}
