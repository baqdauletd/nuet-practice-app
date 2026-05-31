"use client";

import type { UserSchema } from "@insforge/sdk";
import { getInsforgeClient } from "./insforge/client";
import type { AppUserProfile, UserRole } from "./types";

type ProfileRow = {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
  nickname: string | null;
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
    nickname: row.nickname,
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

const NICKNAME_FIRST_WORDS = [
  "pineapple",
  "cracked",
  "noodle",
  "cosmic",
  "spicy",
  "wobble",
  "dusty",
  "bouncy",
  "toasted",
  "marshmallow",
  "sneaky",
  "zippy",
];

const NICKNAME_SECOND_WORDS = [
  "juice",
  "muffin",
  "teapot",
  "pickle",
  "waffle",
  "meteor",
  "taco",
  "pudding",
  "otter",
  "banjo",
  "bubble",
  "carrot",
];

function createNicknameCandidate() {
  const first =
    NICKNAME_FIRST_WORDS[Math.floor(Math.random() * NICKNAME_FIRST_WORDS.length)];
  const second =
    NICKNAME_SECOND_WORDS[Math.floor(Math.random() * NICKNAME_SECOND_WORDS.length)];

  return `${first} ${second}`;
}

async function ensureProfileNickname(profile: ProfileRow) {
  if (profile.nickname) {
    return profile;
  }

  const insforge = getInsforgeClient();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const baseNickname = createNicknameCandidate();
    const nickname =
      attempt < 4
        ? baseNickname
        : `${baseNickname} ${Math.floor(10 + Math.random() * 90)}`;

    const { data, error } = await insforge.database
      .from("profiles")
      .update({
        nickname,
      })
      .eq("id", profile.id)
      .is("nickname", null)
      .select("id, email, role, name, nickname, created_at")
      .maybeSingle<ProfileRow>();

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        continue;
      }

      throwIfError(error);
    }

    if (data?.nickname) {
      return data;
    }

    const { data: existing, error: existingError } = await insforge.database
      .from("profiles")
      .select("id, email, role, name, nickname, created_at")
      .eq("id", profile.id)
      .maybeSingle<ProfileRow>();

    throwIfError(existingError);

    if (existing?.nickname) {
      return existing;
    }
  }

  throw new Error("Unable to assign a nickname to this profile.");
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
    .select("id, email, role, name, nickname, created_at")
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

  const profile = await ensureProfileNickname(data);

  return {
    status: "signed_in",
    user,
    profile: toAppUserProfile(profile),
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
    .select("id, email, role, name, nickname, created_at")
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
    .select("id, email, role, name, nickname, created_at")
    .single<ProfileRow>();

  throwIfError(error);

  if (!data) {
    throw new Error("Profile creation returned no data.");
  }

  return {
    status: "created" as const,
    profile: toAppUserProfile(await ensureProfileNickname(data)),
  };
}
