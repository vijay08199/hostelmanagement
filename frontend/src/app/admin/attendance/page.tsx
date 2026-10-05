"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Calendar, Search, Filter, Building2, UserCheck, UserX, Clock, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";
import type { Id } from "../../../../../backend/convex/_generated/dataModel";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "LATE";

function getStartOfDay(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

export default function AdminAttendancePage() {
  const [dateStr, setDateStr] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedHostelId, setSelectedHostelId] = useState<string>("");

  const hostels = useQuery(api.admin.listHostels);

  const selectedDateTimestamp = useMemo(() => {
    return dateStr ? getStartOfDay(dateStr) : undefined;
  }, [dateStr]);

  const rows = useQuery(api.attendance.listForAdmin, {
    date: selectedDateTimestamp,
    status: (statusFilter || undefined) as AttendanceStatus | undefined,
    hostelId: (selectedHostelId || undefined) as Id<"hostels"> | undefined,
    search: search.trim() || undefined,
  });

  const stats = useMemo(() => {
    if (!rows) return { total: 0, present: 0, absent: 0, leave: 0, rate: 0 };
    const total = rows.length;
    let present = 0;
    let absent = 0;
    let leave = 0;

    for (const r of rows) {
      if (r.status === "PRESENT" || r.status === "LATE") present++;
      else if (r.status === "ABSENT") absent++;
      else if (r.status === "LEAVE") leave++;
    }

    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, leave, rate };
  }, [rows]);

  const isLoading = rows === undefined || hostels === undefined;

  return (
    <RoleGate role="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Verification & Compliance</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Attendance Oversight</h1>
            <p className="mt-1 text-sm text-slate-500">
              System-wide attendance logs across all hostels, blocks, and resident student cohorts.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="p-4 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Logs</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700">
                  <Users size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-emerald-100 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Present</p>
                  <p className="mt-1.5 text-2xl font-bold text-emerald-800">{stats.present}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-100/60 p-2.5 text-emerald-700">
                  <UserCheck size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-rose-100 bg-rose-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Absent</p>
                  <p className="mt-1.5 text-2xl font-bold text-rose-800">{stats.absent}</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-100/60 p-2.5 text-rose-700">
                  <UserX size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-amber-100 bg-amber-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">On Leave</p>
                  <p className="mt-1.5 text-2xl font-bold text-amber-800">{stats.leave}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-100/60 p-2.5 text-amber-700">
                  <Clock size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-indigo-100 bg-indigo-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Compliance Rate</p>
                  <p className="mt-1.5 text-2xl font-bold text-indigo-900">{stats.rate}%</p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-100/60 p-2.5 text-indigo-700">
                  <Filter size={20} />
                </div>
              </div>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Date Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Calendar size={14} /> Filter by Date
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                  {dateStr && (
                    <button
                      onClick={() => setDateStr("")}
                      className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Hostel Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Building2 size={14} /> Hostel Facility
                </label>
                <select
                  value={selectedHostelId}
                  onChange={(e) => setSelectedHostelId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Hostels</option>
                  {(hostels ?? []).map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Filter size={14} /> Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="PRESENT">PRESENT</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="LEAVE">LEAVE</option>
                  <option value="LATE">LATE</option>
                </select>
              </div>

              {/* Search Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Search size={14} /> Search
                </label>
                <input
                  type="text"
                  placeholder="Student, ID, room, remarks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Attendance Log Table */}
          {isLoading ? (
            <LoadingState />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No attendance records found"
              description="No attendance entries match your search criteria and date filter."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-4 py-3.5">Hostel & Room</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Roll Call Date</th>
                    <th className="px-4 py-3.5">Marked By</th>
                    <th className="px-5 py-3.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r: any) => {
                    const formattedDate = new Intl.DateTimeFormat("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(r.date));

                    const initials = `${r.studentName?.[0] ?? ""}`.toUpperCase() || "S";

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{r.studentName}</div>
                              <div className="font-mono text-xs text-slate-400">{r.studentIdentifier}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 text-xs">
                          <div className="font-medium text-slate-900">{r.hostelName}</div>
                          <div className="text-slate-400">Room {r.roomNumber}, Bed {r.bedLabel}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          {r.status === "PRESENT" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                              PRESENT
                            </span>
                          )}
                          {r.status === "ABSENT" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                              ABSENT
                            </span>
                          )}
                          {r.status === "LEAVE" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                              LEAVE
                            </span>
                          )}
                          {r.status === "LATE" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                              LATE
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                          {formattedDate}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-700 font-medium">
                          {r.markedByName || "Staff"}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {r.remarks || "—"}
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

