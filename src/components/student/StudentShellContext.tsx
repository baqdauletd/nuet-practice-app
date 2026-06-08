"use client";

import { createContext, useContext } from "react";
import type { AppUserProfile } from "../../lib/types";

type StudentShellContextValue = {
  profile: AppUserProfile;
};

const StudentShellContext = createContext<StudentShellContextValue | null>(null);

export function StudentShellProvider({
  value,
  children,
}: {
  value: StudentShellContextValue;
  children: React.ReactNode;
}) {
  return (
    <StudentShellContext.Provider value={value}>
      {children}
    </StudentShellContext.Provider>
  );
}

export function useStudentShell() {
  const value = useContext(StudentShellContext);

  if (!value) {
    throw new Error("useStudentShell must be used within StudentShellProvider.");
  }

  return value;
}
