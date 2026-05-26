import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_INSFORGE_URL: z.url(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = publicEnvSchema.extend({
  GEMINI_API_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
});

function formatErrorMessages(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");
}

export function getPublicEnv() {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_INSFORGE_URL: process.env.NEXT_PUBLIC_INSFORGE_URL,
    NEXT_PUBLIC_INSFORGE_ANON_KEY: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  });

  if (!result.success) {
    throw new Error(
      `Invalid public environment variables: ${formatErrorMessages(result.error)}`,
    );
  }

  return result.data;
}

export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv must only be used on the server.");
  }

  const result = serverEnvSchema.safeParse({
    NEXT_PUBLIC_INSFORGE_URL: process.env.NEXT_PUBLIC_INSFORGE_URL,
    NEXT_PUBLIC_INSFORGE_ANON_KEY: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  });

  if (!result.success) {
    throw new Error(
      `Invalid server environment variables: ${formatErrorMessages(result.error)}`,
    );
  }

  return result.data;
}
