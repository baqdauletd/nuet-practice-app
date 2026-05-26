import { createClient } from "@insforge/sdk";
import { getPublicEnv } from "../env";

const { NEXT_PUBLIC_INSFORGE_URL, NEXT_PUBLIC_INSFORGE_ANON_KEY } =
  getPublicEnv();

export const insforge = createClient({
  baseUrl: NEXT_PUBLIC_INSFORGE_URL,
  anonKey: NEXT_PUBLIC_INSFORGE_ANON_KEY,
});
