import { InstructorAppShell } from "../../components/instructor/InstructorAppShell";

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InstructorAppShell>{children}</InstructorAppShell>;
}
