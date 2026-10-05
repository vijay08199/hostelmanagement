"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { CalendarCheck, CalendarX, Clock, CalendarDays, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";

export default function StudentAttendancePage() {
  const records = useQuery(api.attendance.mine);

  const stats = useMemo(() => {
    if (!records) {
      return {
        total: 0,
        present: 0,
        absent: 0,
        leave: 0,
        percentage: 0,
        currentMonthTotal: 0,
        currentMonthPresent: 0,
        currentMonthAbsent: 0,
        currentMonthLeave: 0,
        currentMonthPercentage: 0,
      };
    }

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    let present = 0;
    let absent = 0;
    let leave = 0;
    let currentMonthTotal = 0;
    let currentMonthPresent = 0;
    let currentMonthAbsent = 0;
    let currentMonthLeave = 0;

    for (const r of records) {
      const isPresent = r.status === "PRESENT" || r.status === "LATE";
      const isAbsent = r.status === "ABSENT";
      const isLeave = r.status === "LEAVE";

      if (isPresent) present++;
      if (isAbsent) absent++;
      if (isLeave) leave++;

      const recDate = new Date(r.date);
      if (recDate.getFullYear() === curYear && recDate.getMonth() === curMonth) {
        currentMonthTotal++;
        if (isPresent) currentMonthPresent++;
        if (isAbsent) currentMonthAbsent++;
        if (isLeave) currentMonthLeave++;
      }
    }

    const total = records.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    const currentMonthPercentage =
      currentMonthTotal > 0 ? Math.round((currentMonthPresent / currentMonthTotal) * 100) : 0;

    return {
      total,
      present,
      absent,
      leave,
      percentage,
      currentMonthTotal,
      currentMonthPresent,
      currentMonthAbsent,
      currentMonthLeave,
      currentMonthPercentage,
    };
  }, [records]);

  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());
  }, []);

  return (
    <RoleGate role="STUDENT">
      <AppShell role="STUDENT">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Verification & Compliance</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">My Attendance</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track your daily hostel attendance records, verify roll-calls, and monitor compliance.
            </p>
          </div>

          {/* Large Visual Percentage Banner & Stats */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Prominent Circular / Large Percentage Card */}
            <div className="rounded-3xl border border-indigo-100 bg-linear-to-b from-indigo-50/80 via-white to-white p-7 shadow-xs flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Attendance Compliance
              </span>
              <div className="mt-4 flex items-baseline justify-center">
                <span className="text-6xl font-black tracking-tight text-indigo-950">
                  {stats.percentage}%
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {stats.percentage >= 75 ? "Compliance Satisfied" : "Attention Required"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Based on {stats.total} recorded roll-call days
              </p>

              <div className="w-full mt-5 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  style={{ width: `${stats.percentage}%` }}
                  className={`h-full rounded-full transition-all duration-700 ${
                    stats.percentage >= 75 ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </div>
            </div>

            {/* Quick Stat Breakdown Grid */}
            <div className="lg:col-span-2 grid gap-4 sm:grid-cols-3">
              <Card className="p-5 border-emerald-100 bg-emerald-50/20 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Present</span>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-100/60 p-2 text-emerald-700">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-extrabold text-emerald-900">{stats.present}</p>
                  <p className="mt-1 text-xs text-emerald-700">Verified Days on Campus</p>
                </div>
              </Card>

              <Card className="p-5 border-rose-100 bg-rose-50/20 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Absent</span>
                  <div className="rounded-xl border border-rose-200 bg-rose-100/60 p-2 text-rose-700">
                    <CalendarX size={18} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-extrabold text-rose-900">{stats.absent}</p>
                  <p className="mt-1 text-xs text-rose-700">Unaccounted Roll Calls</p>
                </div>
              </Card>

              <Card className="p-5 border-amber-100 bg-amber-50/20 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Approved Leave</span>
                  <div className="rounded-xl border border-amber-200 bg-amber-100/60 p-2 text-amber-700">
                    <Clock size={18} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-extrabold text-amber-900">{stats.leave}</p>
                  <p className="mt-1 text-xs text-amber-700">Official Permission Days</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Current Month Highlight Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {currentMonthName} Monthly Breakdown
                </h2>
                <p className="text-xs text-slate-500">
                  {stats.currentMonthTotal} day{stats.currentMonthTotal === 1 ? "" : "s"} evaluated this calendar month
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Monthly Rate</span>
                  <div className="text-xl font-extrabold text-slate-900">
                    {stats.currentMonthPercentage}%
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-100 hidden sm:block" />
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Present</span>
                  <div className="text-xl font-extrabold text-emerald-700">
                    {stats.currentMonthPresent}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">Absent</span>
                  <div className="text-xl font-extrabold text-rose-700">
                    {stats.currentMonthAbsent}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Leave</span>
                  <div className="text-xl font-extrabold text-amber-700">
                    {stats.currentMonthLeave}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance History Table */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Attendance Log</h2>

            {records === undefined ? (
              <LoadingState />
            ) : records.length === 0 ? (
              <EmptyState
                title="No attendance records"
                description="Attendance records will appear here once marked by your hostel warden."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Roll Call Date</th>
                      <th className="px-4 py-3.5">Verification Status</th>
                      <th className="px-5 py-3.5">Warden Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((r: any) => {
                      const formattedDate = new Intl.DateTimeFormat("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(new Date(r.date));

                      return (
                        <tr key={r._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-slate-900">
                            {formattedDate}
                          </td>
                          <td className="px-4 py-3.5">
                            {r.status === "PRESENT" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                                PRESENT
                              </span>
                            )}
                            {r.status === "ABSENT" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                                ABSENT
                              </span>
                            )}
                            {r.status === "LEAVE" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                                LEAVE
                              </span>
                            )}
                            {r.status === "LATE" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                                LATE
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 text-xs">
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
        </div>
      </AppShell>
    </RoleGate>
  );
}

