"use client";

import { InstructorUploadPanel } from "../../../components/instructor/InstructorUploadPanel";
import { useInstructorShell } from "../../../components/instructor/InstructorShellContext";

function UploadsPageContent() {
  const { profile } = useInstructorShell();
  return <InstructorUploadPanel profile={profile} />;
}

export default function InstructorUploadsPage() {
  return <UploadsPageContent />;
}
