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

export type SignUpResult =
  | {
      status: "signed_up";
      user: UserSchema;
      requireEmailVerification: false;
    }
  | {
      status: "verification_required";
      email: string;
      requireEmailVerification: true;
    }
  | {
      status: "error";
      message: string;
      raw: unknown;
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

function normalizeError(error: unknown) {
  if (!error || typeof error !== "object") {
    return error;
  }

  const source = error as Record<string, unknown>;

  return {
    message:
      typeof source.message === "string" ? source.message : "Unknown error",
    code: typeof source.code === "string" ? source.code : null,
    details: "details" in source ? source.details : null,
    statusCode:
      typeof source.statusCode === "number" ? source.statusCode : null,
    error: typeof source.error === "string" ? source.error : null,
    nextActions:
      typeof source.nextActions === "string" ? source.nextActions : null,
  };
}

function throwIfError(error: { message: string } | null) {
  if (error) {
    const detailedError = new Error(error.message) as Error & {
      code?: string | null;
      details?: unknown;
      raw?: unknown;
    };

    const normalized = normalizeError(error) as
      | {
          code?: string | null;
          details?: unknown;
        }
      | undefined;

    detailedError.code = normalized?.code ?? null;
    detailedError.details = normalized?.details ?? null;
    detailedError.raw = normalized ?? error;

    throw detailedError;
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

export async function signUpWithEmailPassword(
  email: string,
  password: string,
  name?: string,
): Promise<SignUpResult> {
  const insforge = getInsforgeClient();
  const { data, error } = await insforge.auth.signUp({
    email,
    password,
    name,
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
      raw: error,
    };
  }

  if (data?.requireEmailVerification) {
    return {
      status: "verification_required",
      email,
      requireEmailVerification: true,
    };
  }

  if (!data?.user) {
    return {
      status: "error",
      message: "Unable to create the user account.",
      raw: data,
    };
  }

  return {
    status: "signed_up",
    user: data.user,
    requireEmailVerification: false,
  };
}

export async function verifyEmailCode(email: string, otp: string) {
  const insforge = getInsforgeClient();
  const { error } = await insforge.auth.verifyEmail({
    email,
    otp,
  });

  if (error) {
    return {
      ok: false as const,
      message: error.message,
      raw: error,
    };
  }

  return {
    ok: true as const,
  };
}

export async function resendVerificationEmail(email: string) {
  const insforge = getInsforgeClient();
  const { data, error } = await insforge.auth.resendVerificationEmail({
    email,
  });

  throwIfError(error);

  if (!data?.success) {
    throw new Error("Unable to resend the verification email.");
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

export async function createAppUserProfile({
  id,
  email,
  role,
  name,
}: {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}) {
  const insforge = getInsforgeClient();

  const existingProfile = await insforge.database
    .from("profiles")
    .select("id, email, role, name, created_at")
    .eq("id", id)
    .maybeSingle<ProfileRow>();

  throwIfError(existingProfile.error);

  if (existingProfile.data) {
    return {
      status: "already_exists" as const,
      profile: toAppUserProfile(existingProfile.data),
    };
  }

  const { data, error } = await insforge.database
    .from("profiles")
    .insert({
      id,
      email,
      role,
      name,
    })
    .select("id, email, role, name, created_at")
    .single<ProfileRow>();

  throwIfError(error);

  if (!data) {
    throw new Error("Profile creation returned no data.");
  }

  return {
    status: "created" as const,
    profile: toAppUserProfile(data),
  };
}
