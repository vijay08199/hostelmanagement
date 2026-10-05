"use client";

import { Dashboard } from "@/components/dashboard/dashboard";
import { RoleGate } from "@/components/auth/role-gate";

export default function Page() {
  return (
    <RoleGate role="WARDEN">
      <Dashboard role="WARDEN" />
    </RoleGate>
  );
}

