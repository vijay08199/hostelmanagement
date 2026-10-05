"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { BedDouble, CheckCircle2, DoorOpen, Calendar, AlertCircle, Building2 } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";

export default function Page() {
  const [status, setStatus] = useState<"ACTIVE" | "ENDED">("ACTIVE");
  const rows = useQuery(api.warden.allocations, { status });
  const occupancy = useQuery(api.warden.occupancy);
  const end = useMutation(api.allocations.end);

  const stats = useMemo(() => {
    const total = occupancy?.beds?.length ?? 0;
    const occupied = occupancy?.beds?.filter((b: any) => b.status === "OCCUPIED").length ?? 0;
    const available = occupancy?.beds?.filter((b: any) => b.status === "AVAILABLE").length ?? 0;
    return { total, occupied, available };
  }, [occupancy]);

  async function finish(id: any) {
    if (window.confirm("Are you sure you want to terminate this room allocation?")) {
      await end({ allocationId: id, endDate: Date.now() });
    }
  }

  const isLoading = rows === undefined;

  return (
    <RoleGate role="WARDEN">
      <AppShell role="WARDEN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Occupancy Console</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Room Allocations</h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage student bed allocations and checkout records within your assigned hostels.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
              <button
                onClick={() => setStatus("ACTIVE")}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  status === "ACTIVE"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Active Occupants
              </button>
              <button
                onClick={() => setStatus("ENDED")}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  status === "ENDED"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Past Records
              </button>
            </div>
          </div>

          {/* Summary Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4 border-indigo-100 bg-indigo-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Occupied Beds</p>
                  <p className="mt-1.5 text-2xl font-bold text-indigo-900">{stats.occupied}</p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-100/60 p-2.5 text-indigo-700">
                  <CheckCircle2 size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-teal-100 bg-teal-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Available Beds</p>
                  <p className="mt-1.5 text-2xl font-bold text-teal-900">{stats.available}</p>
                </div>
                <div className="rounded-xl border border-teal-200 bg-teal-100/60 p-2.5 text-teal-700">
                  <BedDouble size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Capacity</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">{stats.total} Beds</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700">
                  <DoorOpen size={20} />
                </div>
              </div>
            </Card>
          </div>

          {/* Allocations Table */}
          {isLoading ? (
            <LoadingState />
          ) : rows.length === 0 ? (
            <EmptyState
              title={`No ${status.toLowerCase()} allocations found`}
              description="Allocations in your assigned hostels will appear here once registered."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-4 py-3.5">Room</th>
                    <th className="px-4 py-3.5">Bed Slot</th>
                    <th className="px-4 py-3.5">Start Date</th>
                    <th className="px-4 py-3.5">End Date</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row: any) => {
                    const initials = `${row.student?.firstName?.[0] ?? ""}${row.student?.lastName?.[0] ?? ""}`.toUpperCase() || "S";
                    return (
                      <tr key={row._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {row.student?.firstName} {row.student?.lastName}
                              </div>
                              <div className="font-mono text-xs text-slate-400">{row.student?.studentId || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-800">
                          Room {row.room?.roomNumber || "—"}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-indigo-700">
                          {row.bed?.label || row.bed?.bedNumber || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {new Date(row.startDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {row.endDate ? new Date(row.endDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              row.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                row.status === "ACTIVE" ? "bg-emerald-600" : "bg-slate-400"
                              }`}
                            ></span>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {row.status === "ACTIVE" && (
                            <button
                              onClick={() => finish(row._id)}
                              className="rounded-lg border border-rose-200 bg-rose-50/40 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:border-rose-300 hover:bg-rose-100 transition shadow-2xs"
                            >
                              End Allocation
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}

