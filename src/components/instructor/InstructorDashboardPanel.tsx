"use client";

import type { AppUserProfile } from "../../lib/types";
import { InstructorConnectionsPanel } from "./InstructorConnectionsPanel";
import { InstructorUploadPanel } from "./InstructorUploadPanel";

export function InstructorDashboardPanel({
  profile,
}: {
  profile: AppUserProfile;
}) {
  return (
    <div className="grid gap-6">
      <InstructorConnectionsPanel profile={profile} />
      <InstructorUploadPanel profile={profile} />
    </div>
  );
}
