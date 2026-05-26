import { ProtectedDashboard } from "../../components/auth/ProtectedDashboard";

export default function StudentPage() {
  return (
    <ProtectedDashboard
      requiredRole="student"
      title="Student Practice"
      description="Next slices will add daily problem sessions."
    />
  );
}
