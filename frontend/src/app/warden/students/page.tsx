"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Users, BedDouble, CheckCircle2, Search, Filter, Building2, BookOpen } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";
import type { Id } from "../../../../../backend/convex/_generated/dataModel";

export default function Page() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "">("");
  const [selectedHostelId, setSelectedHostelId] = useState<string>("");

  const occupancy = useQuery(api.warden.occupancy);
  const assignedHostels = useMemo(() => {
    return (occupancy?.hostels ?? []).filter(Boolean);
  }, [occupancy]);

  const students = useQuery(api.warden.students, {
    search: search.trim() || undefined,
    status: statusFilter ? statusFilter : undefined,
    hostelId: (selectedHostelId || undefined) as Id<"hostels"> | undefined,
  });

  const stats = useMemo(() => {
    const totalStudents = students?.length ?? 0;
    const activeStudents = students?.filter((s: any) => s.status === "ACTIVE").length ?? 0;
    const totalBeds = occupancy?.beds?.length ?? 0;
    const allocatedBeds = occupancy?.beds?.filter((b: any) => b.status === "OCCUPIED").length ?? 0;
    const availableBeds = occupancy?.beds?.filter((b: any) => b.status === "AVAILABLE").length ?? 0;

    return { totalStudents, activeStudents, totalBeds, allocatedBeds, availableBeds };
  }, [students, occupancy]);

  const isLoading = students === undefined;

  return (
    <RoleGate role="WARDEN">
      <AppShell role="WARDEN">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Resident Management</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Warden Students</h1>
            <p className="mt-1 text-sm text-slate-500">
              Residents assigned to your hostel facilities and active bed allocations.
            </p>
          </div>

          {/* Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Students</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">{stats.totalStudents}</p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-600">
                  <Users size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-emerald-100 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Active Students</p>
                  <p className="mt-1.5 text-2xl font-bold text-emerald-800">{stats.activeStudents}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-100/60 p-2.5 text-emerald-700">
                  <CheckCircle2 size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-amber-100 bg-amber-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Allocated Beds</p>
                  <p className="mt-1.5 text-2xl font-bold text-amber-800">{stats.allocatedBeds}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-100/60 p-2.5 text-amber-700">
                  <BedDouble size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-teal-100 bg-teal-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Available Beds</p>
                  <p className="mt-1.5 text-2xl font-bold text-teal-800">{stats.availableBeds}</p>
                </div>
                <div className="rounded-xl border border-teal-200 bg-teal-100/60 p-2.5 text-teal-700">
                  <BedDouble size={20} />
                </div>
              </div>
            </Card>
          </div>

          {/* Search & Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Search size={14} /> Search Residents
                </label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, roll number, or student ID..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Building2 size={14} /> Filter by Hostel
                </label>
                <select
                  value={selectedHostelId}
                  onChange={(e) => setSelectedHostelId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Assigned Hostels</option>
                  {assignedHostels.map((h: any) => (
                    <option key={h._id} value={h._id}>
                      {h.name} ({h.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Filter size={14} /> Status Filter
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
          </div>

          {/* Student Table */}
          {isLoading ? (
            <LoadingState />
          ) : students.length === 0 ? (
            <EmptyState
              title="No students found"
              description="No student allocations found matching your search query in your assigned hostels."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-4 py-3.5">Student ID</th>
                    <th className="px-4 py-3.5">Program & Year</th>
                    <th className="px-4 py-3.5">Hostel & Block</th>
                    <th className="px-4 py-3.5">Room & Bed</th>
                    <th className="px-4 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s: any) => {
                    const initials = `${s.firstName?.[0] ?? ""}${s.lastName?.[0] ?? ""}`.toUpperCase() || "S";
                    return (
                      <tr key={s._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 border border-indigo-100">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {s.firstName} {s.lastName}
                              </div>
                              <div className="text-xs text-slate-400">{s.email || "No email"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-medium text-slate-700">
                          <span className="rounded-md bg-slate-100 px-2 py-1">{s.studentId}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs">
                          <div className="font-medium text-slate-800">{s.program || s.department || "General"}</div>
                          <div className="text-slate-400">{s.year ? `Year ${s.year}` : "—"}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 text-xs">
                          <div className="font-medium text-slate-900">{s.allocation?.hostel?.name || "—"}</div>
                          <div className="text-slate-400">{s.allocation?.block?.name ? `Block ${s.allocation.block.name}` : ""}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          <div className="font-medium text-slate-800">
                            Room {s.allocation?.room?.roomNumber || "—"}
                          </div>
                          <div className="font-semibold text-indigo-700">
                            Bed {s.allocation?.bed?.label || s.allocation?.bed?.bedNumber || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              s.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {s.status}
                          </span>
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

