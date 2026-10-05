"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

type MealType = "BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER";
type MenuStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export default function AdminMessPage() {
  const hostels = useQuery(api.admin.listHostels);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"MENUS" | "ATTENDANCE" | "FEEDBACK">("MENUS");

  // Today string
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Mess Stats
  const stats = useQuery(api.mess.getMessStats, { date: selectedDate });

  // Menu queries & mutations
  const menus = useQuery(api.mess.listMenus, { date: selectedDate });
  const createMenu = useMutation(api.mess.createMenu);
  const updateMenu = useMutation(api.mess.updateMenu);
  const deleteMenu = useMutation(api.mess.deleteMenu);

  // Attendance & Feedback queries
  const attendance = useQuery(
    api.mess.listMealAttendance,
    activeTab === "ATTENDANCE" ? { date: selectedDate } : "skip"
  );
  const feedbacks = useQuery(
    api.mess.listFeedback,
    activeTab === "FEEDBACK" ? {} : "skip"
  );

  // Menu Form Modal
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<any>(null);
  const [menuForm, setMenuForm] = useState({
    hostelId: "",
    date: todayStr,
    mealType: "BREAKFAST" as MealType,
    items: "",
    specialDietNote: "",
    status: "PUBLISHED" as MenuStatus,
  });

  // Notifications
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSaveMenu(e: React.FormEvent) {
    e.preventDefault();
    if (!menuForm.items.trim()) {
      setMessage({ text: "Please enter the menu items.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingMenu) {
        await updateMenu({
          id: editingMenu._id,
          items: menuForm.items,
          specialDietNote: menuForm.specialDietNote,
          status: menuForm.status,
        });
        setMessage({ text: "Menu updated successfully.", type: "success" });
      } else {
        await createMenu({
          hostelId: menuForm.hostelId ? (menuForm.hostelId as any) : undefined,
          date: menuForm.date,
          mealType: menuForm.mealType,
          items: menuForm.items,
          specialDietNote: menuForm.specialDietNote || undefined,
          status: menuForm.status,
        });
        setMessage({ text: "Menu item created successfully.", type: "success" });
      }
      setShowMenuModal(false);
      setEditingMenu(null);
      setMenuForm({
        hostelId: "",
        date: selectedDate,
        mealType: "BREAKFAST",
        items: "",
        specialDietNote: "",
        status: "PUBLISHED",
      });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save menu.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteMenu(id: any) {
    if (!confirm("Are you sure you want to delete this menu entry?")) return;
    try {
      await deleteMenu({ id });
      setMessage({ text: "Menu deleted.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to delete menu.", type: "error" });
    }
  }

  return (
    <RoleGate role="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Dining & Nutrition</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Mess Management</h1>
              <p className="mt-1 text-sm text-slate-500">
                Plan daily menus, monitor meal attendance, review student food feedback, and track headcounts.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none shadow-xs"
              />
              <button
                onClick={() => {
                  setEditingMenu(null);
                  setMenuForm({
                    hostelId: "",
                    date: selectedDate,
                    mealType: "BREAKFAST",
                    items: "",
                    specialDietNote: "",
                    status: "PUBLISHED",
                  });
                  setShowMenuModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Meal Menu
              </button>
            </div>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Boarding Students</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {stats?.expectedStudents || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Expected head count</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Breakfast Taken</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
                {stats?.mealStats?.BREAKFAST?.taken || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {stats?.mealStats?.BREAKFAST?.skipped || 0} skipped • {stats?.mealStats?.BREAKFAST?.leave || 0} on leave
              </p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lunch Taken</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
                {stats?.mealStats?.LUNCH?.taken || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {stats?.mealStats?.LUNCH?.skipped || 0} skipped • {stats?.mealStats?.LUNCH?.leave || 0} on leave
              </p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dinner Taken</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-indigo-600">
                {stats?.mealStats?.DINNER?.taken || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {stats?.mealStats?.DINNER?.skipped || 0} skipped • {stats?.mealStats?.DINNER?.leave || 0} on leave
              </p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Food Rating</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-2xl font-bold text-slate-900">{stats?.averageRating || 0}</span>
                <span className="text-amber-500 text-lg">★</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{stats?.totalFeedback || 0} student reviews</p>
            </Card>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("MENUS")}
              className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
                activeTab === "MENUS"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Daily Menus ({selectedDate})
            </button>
            <button
              onClick={() => setActiveTab("ATTENDANCE")}
              className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
                activeTab === "ATTENDANCE"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Meal Attendance Roster
            </button>
            <button
              onClick={() => setActiveTab("FEEDBACK")}
              className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${
                activeTab === "FEEDBACK"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Student Food Reviews
            </button>
          </div>

          {/* TAB 1: DAILY MENUS */}
          {activeTab === "MENUS" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {(["BREAKFAST", "LUNCH", "SNACKS", "DINNER"] as MealType[]).map((mType) => {
                const mealMenus = menus?.filter((m: any) => m.mealType === mType) || [];
                return (
                  <Card key={mType} className="flex flex-col justify-between p-5 border-slate-200">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              mType === "BREAKFAST"
                                ? "bg-amber-400"
                                : mType === "LUNCH"
                                ? "bg-emerald-500"
                                : mType === "SNACKS"
                                ? "bg-orange-400"
                                : "bg-indigo-500"
                            }`}
                          />
                          <h3 className="font-bold text-slate-900">{mType}</h3>
                        </div>
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

                      <div className="mt-3 space-y-3">
                        {mealMenus.length === 0 ? (
                          <p className="py-6 text-center text-xs text-slate-400 italic">No menu published for {mType}</p>
                        ) : (
                          mealMenus.map((item: any) => (
                            <div key={item._id} className="rounded-xl bg-slate-50 p-3 text-xs">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-semibold text-slate-700">{item.hostelName}</span>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    item.status === "PUBLISHED"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </div>
                              <p className="whitespace-pre-line text-slate-800 font-medium leading-relaxed">
                                {item.items}
                              </p>
                              {item.specialDietNote && (
                                <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 rounded p-1.5 border border-amber-200/60">
                                  Special / Diet: {item.specialDietNote}
                                </p>
                              )}

                              <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-200/60 pt-2">
                                <button
                                  onClick={() => {
                                    setEditingMenu(item);
                                    setMenuForm({
                                      hostelId: item.hostelId || "",
                                      date: item.date,
                                      mealType: item.mealType,
                                      items: item.items,
                                      specialDietNote: item.specialDietNote || "",
                                      status: item.status,
                                    });
                                    setShowMenuModal(true);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                  Edit
                                </button>
                                <span className="text-slate-300">•</span>
                                <button
                                  onClick={() => handleDeleteMenu(item._id)}
                                  className="text-rose-600 hover:text-rose-800 font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setEditingMenu(null);
                        setMenuForm({
                          hostelId: "",
                          date: selectedDate,
                          mealType: mType,
                          items: "",
                          specialDietNote: "",
                          status: "PUBLISHED",
                        });
                        setShowMenuModal(true);
                      }}
                      className="mt-4 w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition"
                    >
                      + Add {mType} Option
                    </button>
                  </Card>
                );
              })}
            </div>
          )}

          {/* TAB 2: MEAL ATTENDANCE ROSTER */}
          {activeTab === "ATTENDANCE" && (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Hostel</th>
                      <th className="px-5 py-3.5">Meal Type</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Marked At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!attendance || attendance.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center">
                          <EmptyState
                            title="No Attendance Logged"
                            description={`No student attendance entries found for ${selectedDate}.`}
                          />
                        </td>
                      </tr>
                    ) : (
                      attendance.map((rec: any) => (
                        <tr key={rec._id} className="hover:bg-slate-50/60 transition">
                          <td className="px-5 py-4 font-semibold text-slate-900">
                            {rec.studentName}
                            <p className="text-xs text-slate-400 font-normal">{rec.studentRegistrationNumber}</p>
                          </td>
                          <td className="px-5 py-4 text-slate-700">{rec.hostelName}</td>
                          <td className="px-5 py-4 font-medium text-slate-800">{rec.mealType}</td>
                          <td className="px-5 py-4 text-xs text-slate-600">{rec.date}</td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                                rec.status === "TAKEN"
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                                  : rec.status === "SKIPPED"
                                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                                  : "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20"
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-400">
                            {new Date(rec.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 3: FOOD FEEDBACK */}
          {activeTab === "FEEDBACK" && (
            <div className="space-y-4">
              {!feedbacks || feedbacks.length === 0 ? (
                <EmptyState
                  title="No Student Reviews"
                  description="Students haven't submitted any dining reviews yet."
                />
              ) : (
                feedbacks.map((f: any) => (
                  <Card key={f._id} className="p-4 border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{f.studentName}</span>
                          <span className="text-xs text-slate-400">• {f.hostelName}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Meal: <span className="font-semibold text-slate-700">{f.mealType}</span> • {f.date}
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

          {/* Modal: Create / Edit Menu */}
          {showMenuModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingMenu ? "Edit Meal Menu" : "Create Meal Menu"}
                  </h3>
                  <button
                    onClick={() => setShowMenuModal(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveMenu} className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Date *</label>
                      <input
                        type="date"
                        required
                        disabled={!!editingMenu}
                        value={menuForm.date}
                        onChange={(e) => setMenuForm({ ...menuForm, date: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Meal Type *</label>
                      <select
                        required
                        disabled={!!editingMenu}
                        value={menuForm.mealType}
                        onChange={(e) => setMenuForm({ ...menuForm, mealType: e.target.value as MealType })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="BREAKFAST">Breakfast</option>
                        <option value="LUNCH">Lunch</option>
                        <option value="SNACKS">Snacks</option>
                        <option value="DINNER">Dinner</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Hostel Scope</label>
                      <select
                        disabled={!!editingMenu}
                        value={menuForm.hostelId}
                        onChange={(e) => setMenuForm({ ...menuForm, hostelId: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">All Hostels (Campus Global)</option>
                        {hostels?.map((h: any) => (
                          <option key={h._id} value={h._id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Publish Status *</label>
                      <select
                        value={menuForm.status}
                        onChange={(e) => setMenuForm({ ...menuForm, status: e.target.value as MenuStatus })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="PUBLISHED">Published (Visible to Students)</option>
                        <option value="DRAFT">Draft</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Menu Items / Food List *</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="e.g. Masala Dosa, Sambar, Coconut Chutney, Tea / Coffee, Seasonal Fresh Fruits"
                      value={menuForm.items}
                      onChange={(e) => setMenuForm({ ...menuForm, items: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Special Diet / Allergy Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Contains dairy & gluten. Jain option available on counter 2."
                      value={menuForm.specialDietNote}
                      onChange={(e) => setMenuForm({ ...menuForm, specialDietNote: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowMenuModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                    >
                      {isSubmitting ? "Saving..." : editingMenu ? "Update Menu" : "Publish Menu"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}

