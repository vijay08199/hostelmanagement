"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex-api";
import type { Role } from "@/types";

export function RoleGate({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const current = useQuery(api.auth.currentUser);

  useEffect(() => {
    if (current === undefined) return;

    if (!current.authenticated) {
      router.replace("/login");
      return;
    }

    if (current.state === "PENDING") {
      router.replace("/pending-access");
      return;
    }
    if (current.state === "INACTIVE") {
      router.replace("/account-inactive");
      return;
    }
    if (current.state !== `ACTIVE_${role}` || !current.user) {
      router.replace("/unauthorized");
      return;
    }
  }, [current, role, router]);

  if (current === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500 bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-xs">
          <svg className="h-5 w-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Authenticating portal access...</span>
        </div>
      </div>
    );
  }

  if (!current.authenticated || !current.user || current.state !== `ACTIVE_${role}`) {
    return null;
  }

  return <>{children}</>;
}

