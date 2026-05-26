"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "../../lib/constants";
import { signOut } from "../../lib/auth";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogout() {
    setIsPending(true);
    setErrorMessage(null);

    try {
      await signOut();
      router.replace(ROUTES.login);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign out.";
      setErrorMessage(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing out..." : "Log out"}
      </button>
      {errorMessage ? (
        <p className="text-sm text-rose-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}
