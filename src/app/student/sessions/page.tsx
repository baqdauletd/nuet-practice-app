"use client";

import { StudentSessionsPanel } from "../../../components/student/StudentSessionsPanel";
import { useStudentShell } from "../../../components/student/StudentShellContext";

export default function StudentSessionsPage() {
  const { profile } = useStudentShell();
  return <StudentSessionsPanel profile={profile} />;
}
