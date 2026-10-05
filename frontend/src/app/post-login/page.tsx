"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex-api";

export default function PostLogin() {
  const router = useRouter();
  const current = useQuery(api.auth.currentUser);
  const ensureUser = useMutation(api.auth.ensureUser);
  const syncAttempted = useRef(false);

  useEffect(() => {
    if (!syncAttempted.current) {
      syncAttempted.current = true;
      ensureUser().catch(() => {});
    }
  }, [ensureUser]);

  useEffect(() => {
    if (current === undefined) {
      return;
    }

    if (!current.authenticated) {
      router.replace("/login");
      return;
    }

    switch (current.state) {
      case "PENDING":
        router.replace("/pending-access");
        break;
      case "INACTIVE":
        router.replace("/account-inactive");
        break;
      case "ACTIVE_ADMIN":
        router.replace("/admin/dashboard");
        break;
      case "ACTIVE_WARDEN":
        router.replace("/warden/dashboard");
        break;
      case "ACTIVE_STUDENT":
        router.replace("/student/dashboard");
        break;
      default:
        router.replace("/unauthorized");
        break;
    }
  }, [current, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-sm w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 animate-pulse">
          <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-900">Verifying Permissions...</h2>
        <p className="mt-1 text-sm text-slate-500">Connecting to CampusNest and loading your role.</p>
      </div>
    </main>
  );
}

