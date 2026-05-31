"use client";

import type { AppUserProfile } from "../../lib/types";
import { StudentConnectionsPanel } from "./StudentConnectionsPanel";
import { StudentDashboardPanel } from "./StudentDashboardPanel";

export function StudentHomePanel({
  profile,
}: {
  profile: AppUserProfile;
}) {
  return (
    <div className="grid gap-6">
      <StudentConnectionsPanel profile={profile} />
      <StudentDashboardPanel profile={profile} />
    </div>
  );
}
