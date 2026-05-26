import { ProtectedDashboard } from "../../components/auth/ProtectedDashboard";

export default function InstructorPage() {
  return (
    <ProtectedDashboard
      requiredRole="instructor"
      title="Instructor Dashboard"
      description="Next slice will add test upload and AI extraction."
    />
  );
}
