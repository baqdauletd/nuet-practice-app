"use client";

import { useInstructorShell } from "./InstructorShellContext";

export function InstructorAccountPanel() {
  const { profile } = useInstructorShell();

  return (
    <div className="grid gap-6">
      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Account settings
        </h1>
      </section>

      <section className="border border-stone-300 bg-[rgba(255,253,248,0.94)] p-7 shadow-[0_20px_46px_-32px_rgba(50,44,35,0.35)]">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Name
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {profile.name?.trim() || "Not set"}
            </p>
          </div>
          <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Email
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">{profile.email}</p>
          </div>
          <div className="border border-stone-300 bg-[rgba(246,240,231,0.72)] p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Nickname
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {profile.nickname ?? "Not set"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
