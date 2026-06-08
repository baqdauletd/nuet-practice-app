import { Suspense } from "react";
import { InstructorAppShell } from "../../components/instructor/InstructorAppShell";

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <InstructorAppShell>{children}</InstructorAppShell>
    </Suspense>
  );
}
