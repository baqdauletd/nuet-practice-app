"use client";

import type { UserSchema } from "@insforge/sdk";
import { getInsforgeClient } from "./insforge/client";
import type { AppUserProfile, UserRole } from "./types";

type ProfileRow = {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
  created_at: string | null;
};

export type CurrentUserProfileResult =
  | { status: "signed_out"; user: null; profile: null }
  | { status: "missing_profile"; user: UserSchema; profile: null }
  | { status: "signed_in"; user: UserSchema; profile: AppUserProfile };

function toAppUserProfile(row: ProfileRow): AppUserProfile {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    createdAt: row.created_at,
  };
}

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
) {
  const insforge = getInsforgeClient();
  const { data, error } = await insforge.auth.signInWithPassword({
    email,
    password,
  });

  throwIfError(error);

  if (!data) {
    throw new Error("Sign-in did not return a session.");
  }

  return data;
}

export async function signOut() {
  const insforge = getInsforgeClient();
  const { error } = await insforge.auth.signOut();
  throwIfError(error);
}

export async function getCurrentUser() {
  const insforge = getInsforgeClient();
  const { data, error } = await insforge.auth.getCurrentUser();
  throwIfError(error);
  return data.user;
}

export async function getCurrentUserProfile() {
  const insforge = getInsforgeClient();
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "signed_out",
      user: null,
      profile: null,
    } satisfies CurrentUserProfileResult;
  }

  const { data, error } = await insforge.database
    .from("profiles")
    .select("id, email, role, name, created_at")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  throwIfError(error);

  if (!data) {
    return {
      status: "missing_profile",
      user,
      profile: null,
    } satisfies CurrentUserProfileResult;
  }

  return {
    status: "signed_in",
    user,
    profile: toAppUserProfile(data),
  } satisfies CurrentUserProfileResult;
}
