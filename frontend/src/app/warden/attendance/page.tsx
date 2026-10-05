"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, AlertCircle, Search, Calendar, UserCheck, Building2, Clock, Check, X, ShieldAlert } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";
import type { Id } from "../../../../../backend/convex/_generated/dataModel";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "LATE";

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getStartOfDay(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

export default function WardenAttendancePage() {
  const [dateStr, setDateStr] = useState<string>(() => toDateInputValue(new Date()));
  const [search, setSearch] = useState<string>("");
  const [selectedHostelId, setSelectedHostelId] = useState<string>("");
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const selectedDateTimestamp = useMemo(() => getStartOfDay(dateStr), [dateStr]);

  const occupancy = useQuery(api.warden.occupancy);
  const assignedHostels = useMemo(() => {
    return (occupancy?.hostels ?? []).filter(Boolean);
  }, [occupancy]);

  const students = useQuery(api.warden.students, {
    search: search.trim() || undefined,
    status: "ACTIVE",
    hostelId: (selectedHostelId || undefined) as Id<"hostels"> | undefined,
  });

  const attendanceRecords = useQuery(api.attendance.listForWarden, {
    date: selectedDateTimestamp,
    hostelId: (selectedHostelId || undefined) as Id<"hostels"> | undefined,
  });

  const markMutation = useMutation(api.attendance.mark);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, any>();
    if (attendanceRecords) {
      for (const rec of attendanceRecords) {
        map.set(rec.studentId, rec);
      }
    }
    return map;
  }, [attendanceRecords]);

  async function handleMark(studentId: Id<"students">, studentName: string, status: AttendanceStatus) {
    setSavingId(studentId);
    setFeedback(null);
    try {
      const studentRemarks = remarksMap[studentId] ?? attendanceMap.get(studentId)?.remarks ?? "";
      await markMutation({
        studentId,
        date: selectedDateTimestamp,
        status,
        remarks: studentRemarks.trim() || undefined,
      });
      setFeedback({
        type: "success",
        message: `Successfully marked ${studentName} as ${status}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to mark attendance.",
      });
    } finally {
      setSavingId(null);
    }
  }

  const isLoading = students === undefined || attendanceRecords === undefined;

  const activeStudents = useMemo(() => {
    return (students ?? []).filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [students]);

  const stats = useMemo(() => {
    if (!students || !attendanceRecords) return { total: 0, marked: 0, present: 0, absent: 0, leave: 0, percentage: 0 };
    const total = activeStudents.length;
    let present = 0;
    let absent = 0;
    let leave = 0;

    for (const s of activeStudents) {
      const rec = attendanceMap.get(s._id);
      if (rec) {
        if (rec.status === "PRESENT" || rec.status === "LATE") present++;
        else if (rec.status === "ABSENT") absent++;
        else if (rec.status === "LEAVE") leave++;
      }
    }

    const marked = present + absent + leave;
    const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;

    return { total, marked, present, absent, leave, percentage };
  }, [students, attendanceRecords, attendanceMap, activeStudents]);

  return (
    <RoleGate role="WARDEN">
      <AppShell role="WARDEN">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Daily Operations</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Attendance Management</h1>
            <p className="mt-1 text-sm text-slate-500">
              Mark and review daily resident verification for students across your assigned hostels.
            </p>
          </div>

          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="p-4 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Residents</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">{stats.total}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{stats.marked} marked today</p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-600">
                  <UserCheck size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-emerald-100 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Present</p>
                  <p className="mt-1.5 text-2xl font-bold text-emerald-800">{stats.present}</p>
                  <p className="mt-0.5 text-xs text-emerald-600">Verified On Campus</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-100/60 p-2.5 text-emerald-700">
                  <CheckCircle2 size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-rose-100 bg-rose-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Absent</p>
                  <p className="mt-1.5 text-2xl font-bold text-rose-800">{stats.absent}</p>
                  <p className="mt-0.5 text-xs text-rose-600">Unaccounted / Missing</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-100/60 p-2.5 text-rose-700">
                  <AlertCircle size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Attendance %</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">{stats.percentage}%</p>
                  <p className="mt-0.5 text-xs text-slate-500">Compliance Rate</p>
                </div>
                <div className="rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 shadow-2xs">
                  <Clock size={20} />
                </div>
              </div>
            </Card>
          </div>

          {/* Controls: Hostel, Date Picker & Search */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Building2 size={14} /> Assigned Hostel
                </label>
                <select
                  value={selectedHostelId}
                  onChange={(e) => {
                    setSelectedHostelId(e.target.value);
                    setFeedback(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
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
                  <Calendar size={14} /> Attendance Date
                </label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => {
                    setDateStr(e.target.value);
                    setFeedback(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Search size={14} /> Search Students
                </label>
                <input
                  type="text"
                  placeholder="Search by student name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`flex items-center gap-3 rounded-xl border p-4 text-sm transition-all duration-200 ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Main Attendance Table */}
          {isLoading ? (
            <LoadingState />
          ) : activeStudents.length === 0 ? (
            <EmptyState
              title="No students found"
              description="No active students matched your search in your assigned hostels."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-4 py-3.5">Student ID</th>
                    <th className="px-4 py-3.5">Room & Bed</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Remarks</th>
                    <th className="px-5 py-3.5 text-right">Attendance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeStudents.map((student: any) => {
                    const record = attendanceMap.get(student._id);
                    const currentStatus: AttendanceStatus | null = record?.status ?? null;
                    const studentName = `${student.firstName} ${student.lastName}`;
                    const isSaving = savingId === student._id;
                    const initials = `${student.firstName?.[0] ?? ""}${student.lastName?.[0] ?? ""}`.toUpperCase() || "S";
                    const roomInfo = student.allocation?.room?.roomNumber
                      ? `Room ${student.allocation.room.roomNumber}`
                      : "Unassigned";
                    const bedInfo = student.allocation?.bed?.label
                      ? `Bed ${student.allocation.bed.label}`
                      : "";

                    return (
                      <tr key={student._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{studentName}</div>
                              {student.allocation?.hostel?.name && (
                                <div className="text-xs text-slate-400">{student.allocation.hostel.name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                          <span className="rounded-md bg-slate-100 px-2 py-1">{student.studentId}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 text-xs">
                          <div className="font-medium text-slate-900">{roomInfo}</div>
                          {bedInfo && <div className="font-semibold text-indigo-700">{bedInfo}</div>}
                        </td>
                        <td className="px-4 py-3.5">
                          {currentStatus === "PRESENT" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                              PRESENT
                            </span>
                          )}
                          {currentStatus === "ABSENT" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                              ABSENT
                            </span>
                          )}
                          {currentStatus === "LEAVE" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                              LEAVE
                            </span>
                          )}
                          {currentStatus === "LATE" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                              LATE
                            </span>
                          )}
                          {!currentStatus && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                              Not Marked
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <input
                            type="text"
                            placeholder="Add remarks..."
                            defaultValue={record?.remarks ?? ""}
                            value={remarksMap[student._id]}
                            onChange={(e) =>
                              setRemarksMap((prev) => ({ ...prev, [student._id]: e.target.value }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={isSaving}
                              onClick={() => handleMark(student._id, studentName, "PRESENT")}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                                currentStatus === "PRESENT"
                                  ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/30"
                                  : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                              } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                              title={currentStatus ? "Update to Present" : "Mark Present"}
                            >
                              Present
                            </button>
                            <button
                              disabled={isSaving}
                              onClick={() => handleMark(student._id, studentName, "ABSENT")}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                                currentStatus === "ABSENT"
                                  ? "bg-rose-600 text-white shadow-xs ring-2 ring-rose-600/30"
                                  : "border border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                              } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                              title={currentStatus ? "Update to Absent" : "Mark Absent"}
                            >
                              Absent
                            </button>
                            <button
                              disabled={isSaving}
                              onClick={() => handleMark(student._id, studentName, "LEAVE")}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                                currentStatus === "LEAVE"
                                  ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/30"
                                  : "border border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                              } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                              title={currentStatus ? "Update to Leave" : "Mark Leave"}
                            >
                              Leave
                            </button>
                          </div>
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

