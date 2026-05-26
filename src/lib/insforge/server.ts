import "server-only";

import { createClient } from "@insforge/sdk";
import { getServerEnv } from "../env";

let serverClient: ReturnType<typeof createClient> | null = null;

export function getInsforgeServerClient() {
  if (serverClient) {
    return serverClient;
  }

  const { NEXT_PUBLIC_INSFORGE_URL, INSFORGE_SERVICE_KEY } = getServerEnv();

  serverClient = createClient({
    baseUrl: NEXT_PUBLIC_INSFORGE_URL,
    isServerMode: true,
    headers: {
      Authorization: `Bearer ${INSFORGE_SERVICE_KEY}`,
      apikey: INSFORGE_SERVICE_KEY,
    },
  });

  return serverClient;
}
