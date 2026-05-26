import { createClient } from "@insforge/sdk";
import { getPublicEnv } from "../env";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getInsforgeClient() {
  if (browserClient) {
    return browserClient;
  }

  const { NEXT_PUBLIC_INSFORGE_URL, NEXT_PUBLIC_INSFORGE_ANON_KEY } =
    getPublicEnv();

  browserClient = createClient({
    baseUrl: NEXT_PUBLIC_INSFORGE_URL,
    anonKey: NEXT_PUBLIC_INSFORGE_ANON_KEY,
  });

  return browserClient;
}
