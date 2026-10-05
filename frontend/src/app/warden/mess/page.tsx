"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

type MealType = "BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER";
type AttendanceStatus = "TAKEN" | "SKIPPED" | "LEAVE";

export default function WardenMessPage() {
  const occupancy = useQuery(api.warden.occupancy, {});
  const assignedHostels = occupancy?.hostels || [];

  const [selectedHostelId, setSelectedHostelId] = useState<string>("");
  const activeHostelId = selectedHostelId || (assignedHostels[0]?._id as string) || "";

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMeal, setSelectedMeal] = useState<MealType>("LUNCH");

  // Queries
  const todayMenus = useQuery(api.mess.getTodayMenu, activeHostelId ? { hostelId: activeHostelId as any } : {});
  const stats = useQuery(
    api.mess.getMessStats,
    activeHostelId ? { hostelId: activeHostelId as any, date: selectedDate } : { date: selectedDate }
  );
  const students = useQuery(
    api.warden.students,
    activeHostelId ? { hostelId: activeHostelId as any } : {}
  );
  const attendanceList = useQuery(api.mess.listMealAttendance, {
    hostelId: activeHostelId ? (activeHostelId as any) : undefined,
    date: selectedDate,
    mealType: selectedMeal,
  });
  const feedbackList = useQuery(api.mess.listFeedback, {
    hostelId: activeHostelId ? (activeHostelId as any) : undefined,
  });

  // Mutations
  const markMealAttendance = useMutation(api.mess.markMealAttendance);
  const batchMarkMealAttendance = useMutation(api.mess.batchMarkMealAttendance);

  // Local state
  const [activeTab, setActiveTab] = useState<"ATTENDANCE" | "MENUS" | "FEEDBACK">("ATTENDANCE");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map of studentId -> status for current date & meal
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    if (attendanceList) {
      for (const rec of attendanceList) {
        map.set(rec.studentId, rec.status as AttendanceStatus);
      }
    }
    return map;
  }, [attendanceList]);

  // Filtered student list
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter((s: any) => {
      const name = `${s.firstName} ${s.lastName}`.toLowerCase();
      const id = (s.studentId || "").toLowerCase();
      const roll = (s.rollNumber || "").toLowerCase();
      const room = (s.allocation?.room?.roomNumber || "").toLowerCase();
      const q = search.toLowerCase();
      return name.includes(q) || id.includes(q) || roll.includes(q) || room.includes(q);
    });
  }, [students, search]);

  async function handleMarkSingle(studentId: any, status: AttendanceStatus) {
    if (!activeHostelId) {
      setMessage({ text: "Please select an assigned hostel.", type: "error" });
      return;
    }
    try {
      await markMealAttendance({
        studentId,
        hostelId: activeHostelId as any,
        date: selectedDate,
        mealType: selectedMeal,
        status,
      });
      setMessage({ text: `Attendance updated to ${status}.`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to mark attendance.", type: "error" });
    }
  }

  async function handleMarkAll(status: AttendanceStatus) {
    if (!activeHostelId || !filteredStudents || filteredStudents.length === 0) return;
    try {
      setIsSubmitting(true);
      const records = filteredStudents.map((s: any) => ({
        studentId: s._id,
        status,
      }));
      await batchMarkMealAttendance({
        hostelId: activeHostelId as any,
        date: selectedDate,
        mealType: selectedMeal,
        records,
      });
      setMessage({ text: `Marked all ${records.length} students as ${status}.`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update attendance.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RoleGate role="WARDEN">
      <AppShell role="WARDEN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Dining & Boarding</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Mess & Dining Hall</h1>
              <p className="mt-1 text-sm text-slate-500">
                Check off meal attendance at the counter, review today&apos;s food menu, and monitor meal quality feedback.
              </p>
            </div>

            {/* Hostel Selector */}
            {assignedHostels.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Hostel:</label>
                <select
                  value={activeHostelId}
                  onChange={(e) => setSelectedHostelId(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  {assignedHostels.map((h: any) => (
                    <option key={h._id} value={h._id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Toast Notification */}
          {message && (
            <div
              className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20"
                  : "bg-rose-50 text-rose-800 ring-1 ring-rose-600/20"
              }`}
            >
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="text-slate-500 hover:text-slate-800 font-bold ml-4">
                ✕
              </button>
            </div>
          )}

          {/* Metric Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expected Diners</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {stats?.expectedStudents || filteredStudents.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">Active hostel residents</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {selectedMeal} Taken
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
                {stats?.mealStats?.[selectedMeal]?.taken || 0}
              </p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Headcount confirmed</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {selectedMeal} Skipped / Leave
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
                {(stats?.mealStats?.[selectedMeal]?.skipped || 0) +
                  (stats?.mealStats?.[selectedMeal]?.leave || 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Not dining in hall</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hostel Food Rating</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-2xl font-bold text-slate-900">{stats?.averageRating || 0}</span>
                <span className="text-amber-500 text-lg">★</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{stats?.totalFeedback || 0} student reviews</p>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("ATTENDANCE")}
              className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
                activeTab === "ATTENDANCE"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Meal Attendance Counter
            </button>
            <button
              onClick={() => setActiveTab("MENUS")}
              className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
                activeTab === "MENUS"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Today&apos;s Menu Schedule
            </button>
            <button
              onClick={() => setActiveTab("FEEDBACK")}
              className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
                activeTab === "FEEDBACK"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Student Food Feedback
            </button>
          </div>

          {/* TAB 1: ATTENDANCE COUNTER */}
          {activeTab === "ATTENDANCE" && (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date:</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Meal Session:</label>
                      <div className="inline-flex rounded-xl bg-slate-100 p-1">
                        {(["BREAKFAST", "LUNCH", "SNACKS", "DINNER"] as MealType[]).map((m) => (
                          <button
                            key={m}
                            onClick={() => setSelectedMeal(m)}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                              selectedMeal === m
                                ? "bg-white text-emerald-700 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMarkAll("TAKEN")}
                      disabled={isSubmitting}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-xs"
                    >
                      ✓ Mark All Taken
                    </button>
                    <button
                      onClick={() => handleMarkAll("SKIPPED")}
                      disabled={isSubmitting}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition shadow-xs"
                    >
                      Mark All Skipped
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Quick search student name, room number, roll number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </Card>

              {/* Student attendance list */}
              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3.5">Student</th>
                        <th className="px-5 py-3.5">Room & Bed</th>
                        <th className="px-5 py-3.5">Department</th>
                        <th className="px-5 py-3.5">Current Status</th>
                        <th className="px-5 py-3.5 text-right">Quick Mark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center">
                            <EmptyState
                              title="No Students Found"
                              description="No resident students found matching your search."
                            />
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s: any) => {
                          const currentStatus = attendanceMap.get(s._id);
                          return (
                            <tr key={s._id} className="hover:bg-slate-50/60 transition">
                              <td className="px-5 py-3.5">
                                <p className="font-semibold text-slate-900">
                                  {s.firstName} {s.lastName}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {s.studentId} {s.rollNumber ? `• ${s.rollNumber}` : ""}
                                </p>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="font-medium text-slate-800">
                                  Room {s.allocation?.room?.roomNumber || "N/A"}
                                </span>
                                <span className="text-xs text-slate-400 block">
                                  Bed {s.allocation?.bed?.bedNumber || "N/A"}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-xs text-slate-600">
                                {s.department || "General"}
                              </td>
                              <td className="px-5 py-3.5">
                                {currentStatus ? (
                                  <span
                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                                      currentStatus === "TAKEN"
                                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                                        : currentStatus === "SKIPPED"
                                        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                                        : "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20"
                                    }`}
                                  >
                                    {currentStatus}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Not marked</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <div className="inline-flex gap-1.5">
                                  <button
                                    onClick={() => handleMarkSingle(s._id, "TAKEN")}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                      currentStatus === "TAKEN"
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                                    }`}
                                  >
                                    Taken
                                  </button>
                                  <button
                                    onClick={() => handleMarkSingle(s._id, "SKIPPED")}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                      currentStatus === "SKIPPED"
                                        ? "bg-amber-500 text-white shadow-xs"
                                        : "bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700"
                                    }`}
                                  >
                                    Skip
                                  </button>
                                  <button
                                    onClick={() => handleMarkSingle(s._id, "LEAVE")}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                      currentStatus === "LEAVE"
                                        ? "bg-blue-600 text-white shadow-xs"
                                        : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                                    }`}
                                  >
                                    Leave
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: TODAY'S MENUS */}
          {activeTab === "MENUS" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {(["BREAKFAST", "LUNCH", "SNACKS", "DINNER"] as MealType[]).map((mType) => {
                const meal = todayMenus?.find((m: any) => m.mealType === mType);
                return (
                  <Card key={mType} className="p-5 border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-slate-900">{mType}</h3>
                      <span className="text-xs text-slate-400">
                        {mType === "BREAKFAST"
                          ? "07:30 - 09:30"
                          : mType === "LUNCH"
                          ? "12:30 - 14:30"
                          : mType === "SNACKS"
                          ? "17:00 - 18:00"
                          : "19:30 - 21:30"}
                      </span>
                    </div>

                    <div className="mt-4">
                      {meal ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-800 whitespace-pre-line leading-relaxed">
                            {meal.items}
                          </p>
                          {meal.specialDietNote && (
                            <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200/60">
                              Dietary: {meal.specialDietNote}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="py-6 text-center text-xs text-slate-400 italic">No menu published for today</p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* TAB 3: FEEDBACK */}
          {activeTab === "FEEDBACK" && (
            <div className="space-y-4">
              {!feedbackList || feedbackList.length === 0 ? (
                <EmptyState
                  title="No Dining Feedback"
                  description="No food reviews submitted by hostel residents yet."
                />
              ) : (
                feedbackList.map((f: any) => (
                  <Card key={f._id} className="p-4 border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{f.studentName}</span>
                        <p className="text-xs text-slate-500">
                          {f.mealType} • {f.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 text-sm">
                        {"★".repeat(f.rating)}
                        {"☆".repeat(5 - f.rating)}
                        <span className="ml-1 text-xs font-bold text-slate-700">({f.rating}/5)</span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-800 bg-slate-50 rounded-xl p-3 border border-slate-100">
                      "{f.comment}"
                    </p>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}

