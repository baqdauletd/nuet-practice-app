"use client";

import { createContext, useContext } from "react";
import type { AppUserProfile } from "../../lib/types";

type InstructorShellContextValue = {
  profile: AppUserProfile;
};

const InstructorShellContext = createContext<InstructorShellContextValue | null>(
  null,
);

export function InstructorShellProvider({
  value,
  children,
}: {
  value: InstructorShellContextValue;
  children: React.ReactNode;
}) {
  return (
    <InstructorShellContext.Provider value={value}>
      {children}
    </InstructorShellContext.Provider>
  );
}

export function useInstructorShell() {
  const value = useContext(InstructorShellContext);

  if (!value) {
    throw new Error("useInstructorShell must be used within InstructorShellProvider.");
  }

  return value;
}
