import "server-only";

import { getInsforgeServerClient } from "../insforge/server";
import type { AppUserProfile, UserRole } from "../types";

type ProfileRow = {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
  created_at: string | null;
};

function toAppUserProfile(row: ProfileRow): AppUserProfile {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function getCurrentServerUser() {
  return {
    available: false as const,
    reason:
      "InsForge server mode in this app does not yet have a request-bound session helper. Replace client-provided IDs with a server-authenticated user id once a supported Next.js server-session pattern is wired.",
    user: null,
    profile: null,
  };
}

export async function getServerProfileById(userId: string) {
  const insforge = getInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("profiles")
    .select("id, email, role, name, created_at")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toAppUserProfile(data) : null;
}

export async function requireServerProfileRole(
  userId: string,
  role: UserRole,
) {
  const profile = await getServerProfileById(userId);

  if (!profile) {
    throw new Error("Profile not found.");
  }

  if (profile.role !== role) {
    throw new Error(`Profile role must be ${role}.`);
  }

  return profile;
}
