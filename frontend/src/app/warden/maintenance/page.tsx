"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

export default function WardenMaintenancePage() {
  const occupancy = useQuery(api.warden.occupancy, {});
  const assignedHostels = occupancy?.hostels?.filter(Boolean) || [];

  const [selectedHostelId, setSelectedHostelId] = useState<string>("ALL");
  const stats = useQuery(
    api.maintenance.getMaintenanceStats,
    selectedHostelId !== "ALL" ? { hostelId: selectedHostelId as any } : {}
  );

  const requests = useQuery(
    api.maintenance.listMaintenance,
    selectedHostelId !== "ALL" ? { hostelId: selectedHostelId as any } : {}
  );

  const assignMaintenance = useMutation(api.maintenance.assignMaintenance);
  const startMaintenance = useMutation(api.maintenance.startMaintenance);
  const resolveMaintenance = useMutation(api.maintenance.resolveMaintenance);
  const closeMaintenance = useMutation(api.maintenance.closeMaintenance);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  // Modals & Action states
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [modalMode, setModalMode] = useState<"ASSIGN" | "START" | "RESOLVE" | "CLOSE" | "VIEW" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Forms
  const [assignForm, setAssignForm] = useState({
    assignedTo: "",
    technicianPhone: "",
    notes: "",
  });
  const [actionNotes, setActionNotes] = useState("");
  const [rating, setRating] = useState(5);

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter((r: any) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.student?.firstName?.toLowerCase().includes(q) ||
        r.student?.lastName?.toLowerCase().includes(q) ||
        r.assignedTo?.toLowerCase().includes(q) ||
        r.room?.roomNumber?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || r.category === categoryFilter;
      const matchesPriority = priorityFilter === "ALL" || r.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    });
  }, [requests, search, statusFilter, categoryFilter, priorityFilter]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReq || !assignForm.assignedTo.trim()) return;
    try {
      setIsSubmitting(true);
      await assignMaintenance({
        id: selectedReq._id,
        assignedTo: assignForm.assignedTo.trim(),
        note: assignForm.notes.trim() || undefined,
      });
      setMessage({ text: `Ticket assigned to ${assignForm.assignedTo}.`, type: "success" });
      setModalMode(null);
      setSelectedReq(null);
      setAssignForm({ assignedTo: "", technicianPhone: "", notes: "" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to assign technician.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStart() {
    if (!selectedReq) return;
    try {
      setIsSubmitting(true);
      await startMaintenance({
        id: selectedReq._id,
        note: actionNotes.trim() || undefined,
      });
      setMessage({ text: "Maintenance marked in-progress.", type: "success" });
      setModalMode(null);
      setSelectedReq(null);
      setActionNotes("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to start maintenance work.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReq || !actionNotes.trim()) {
      setMessage({ text: "Resolution notes are required.", type: "error" });
      return;
    }
    try {
      setIsSubmitting(true);
      await resolveMaintenance({
        id: selectedReq._id,
        resolutionNotes: actionNotes.trim(),
      });
      setMessage({ text: "Maintenance ticket resolved.", type: "success" });
      setModalMode(null);
      setSelectedReq(null);
      setActionNotes("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to resolve maintenance.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClose() {
    if (!selectedReq) return;
    try {
      setIsSubmitting(true);
      await closeMaintenance({
        id: selectedReq._id,
        note: actionNotes.trim() || undefined,
      });
      setMessage({ text: "Maintenance ticket closed.", type: "success" });
      setModalMode(null);
      setSelectedReq(null);
      setActionNotes("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to close ticket.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
      case "CLOSED":
        return "bg-slate-100 text-slate-700 ring-1 ring-slate-600/20";
      case "IN_PROGRESS":
        return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
      case "ASSIGNED":
        return "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20";
      case "PENDING":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
      default:
        return "bg-slate-50 text-slate-700 ring-1 ring-slate-600/20";
    }
  }

  function getPriorityBadge(priority: string) {
    switch (priority) {
      case "URGENT":
        return "bg-rose-100 text-rose-800 font-bold animate-pulse";
      case "HIGH":
        return "bg-rose-50 text-rose-700 font-semibold";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700";
      default:
        return "bg-slate-50 text-slate-600";
    }
  }

  return (
    <RoleGate role="WARDEN">
      <AppShell role="WARDEN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Warden Operations</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Hostel Maintenance & RMS</h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage room repairs, assign facility technicians, and track resolution for your assigned hostels.
              </p>
            </div>
            {message && (
              <div
                className={`rounded-xl border px-4 py-2.5 text-xs flex items-center gap-2 ${
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                <span>{message.text}</span>
                <button onClick={() => setMessage(null)} className="ml-2 font-bold hover:underline">
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Metric Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Requests</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {stats?.total ?? (requests?.length || 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">In assigned hostels</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Open Requests</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
                {stats?.open ?? 0}
              </p>
              <p className="mt-1 text-xs text-amber-600 font-medium">Pending action</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">In-Progress Repairs</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-blue-600">
                {stats?.inProgress || 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Work underway
              </p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Urgent Issues</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600">
                {stats?.urgent ?? 0}
              </p>
              <p className="mt-1 text-xs text-rose-600 font-medium">Immediate priority</p>
            </Card>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="relative min-w-[200px] flex-1">
              <input
                type="text"
                placeholder="Search ticket, room, student, technician..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {assignedHostels.length > 1 && (
              <select
                value={selectedHostelId}
                onChange={(e) => setSelectedHostelId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Assigned Hostels</option>
                {assignedHostels.map((h: any) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="CLEANING">Cleaning</option>
              <option value="FURNITURE">Furniture</option>
              <option value="INTERNET">Internet</option>
              <option value="AC_FAN">AC / Fan</option>
              <option value="BATHROOM">Bathroom</option>
              <option value="ROOM">Room</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Issue & Priority</th>
                    <th className="px-5 py-3.5">Location & Student</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Technician / Status</th>
                    <th className="px-5 py-3.5">Created</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center">
                        <EmptyState
                          title="No maintenance requests found"
                          description="No maintenance tickets matching your filters were found."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((r: any) => (
                      <tr key={r._id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-5 py-4 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 line-clamp-1">{r.title}</span>
                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] ${getPriorityBadge(r.priority)}`}>
                              {r.priority}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{r.description}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">
                            Room {r.room?.roomNumber || "N/A"}
                          </div>
                          <div className="text-xs text-indigo-600 font-medium">{r.hostel?.name || "Assigned Hostel"}</div>
                          <div className="text-[11px] text-slate-500">
                            By: {r.student?.firstName} {r.student?.lastName}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-medium text-slate-700">
                          {r.category}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${getStatusBadge(
                              r.status
                            )}`}
                          >
                            {r.status.replace("_", " ")}
                          </span>
                          {r.assignedTo && (
                            <div className="mt-1 text-xs font-medium text-purple-700">
                              Tech: {r.assignedTo} {r.technicianPhone ? `(${r.technicianPhone})` : ""}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {r.status === "PENDING" && (
                              <button
                                onClick={() => {
                                  setSelectedReq(r);
                                  setAssignForm({ assignedTo: "", technicianPhone: "", notes: "" });
                                  setModalMode("ASSIGN");
                                }}
                                className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                              >
                                Assign Tech
                              </button>
                            )}

                            {r.status === "ASSIGNED" && (
                              <button
                                onClick={() => {
                                  setSelectedReq(r);
                                  setActionNotes("");
                                  setModalMode("START");
                                }}
                                className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                              >
                                Start Work
                              </button>
                            )}

                            {r.status === "IN_PROGRESS" && (
                              <button
                                onClick={() => {
                                  setSelectedReq(r);
                                  setActionNotes("");
                                  setModalMode("RESOLVE");
                                }}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                              >
                                Mark Resolved
                              </button>
                            )}

                            {r.status === "RESOLVED" && (
                              <button
                                onClick={() => {
                                  setSelectedReq(r);
                                  setActionNotes("");
                                  setModalMode("CLOSE");
                                }}
                                className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-900"
                              >
                                Close Ticket
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedReq(r);
                                setModalMode("VIEW");
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Assign Tech Modal */}
          {modalMode === "ASSIGN" && selectedReq && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900">Assign Maintenance Technician</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Work Order: <strong>{selectedReq.title}</strong> (Room {selectedReq.room?.roomNumber}, {selectedReq.hostel?.name})
                </p>

                <form onSubmit={handleAssign} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Technician Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Senthil Kumar (Electrician)"
                      value={assignForm.assignedTo}
                      onChange={(e) => setAssignForm({ ...assignForm, assignedTo: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Technician Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 01234"
                      value={assignForm.technicianPhone}
                      onChange={(e) => setAssignForm({ ...assignForm, technicianPhone: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Instructions / Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g., Carry 15A socket replacement kit"
                      value={assignForm.notes}
                      onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setModalMode(null);
                        setSelectedReq(null);
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Assigning..." : "Confirm Assignment"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Start Work Modal */}
          {modalMode === "START" && selectedReq && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-blue-600">Start Repair Work</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Confirm technician has commenced work on {selectedReq.title}.
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Progress Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Work started by technician"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setModalMode(null);
                      setSelectedReq(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleStart}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Starting..." : "Mark In-Progress"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Resolve Modal */}
          {modalMode === "RESOLVE" && selectedReq && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-emerald-600">Mark Maintenance Resolved</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Record resolution for {selectedReq.title}.
                </p>

                <form onSubmit={handleResolve} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Resolution Notes <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Detail work completed, items replaced, or test results..."
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setModalMode(null);
                        setSelectedReq(null);
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Resolving..." : "Confirm Resolution"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Close Ticket Modal */}
          {modalMode === "CLOSE" && selectedReq && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900">Close Work Order Ticket</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Verify completion and close ticket {selectedReq.title}.
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Work Quality Rating (1 - 5)
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          className={`h-8 w-8 rounded-lg font-bold text-xs ${
                            rating >= star
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          ★ {star}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Warden Remarks
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g., Inspected and confirmed fixed"
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setModalMode(null);
                      setSelectedReq(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleClose}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-black disabled:opacity-50"
                  >
                    {isSubmitting ? "Closing..." : "Close Ticket"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Details Modal with Timeline */}
          {modalMode === "VIEW" && selectedReq && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedReq.title}</h3>
                    <p className="text-xs text-slate-500">{selectedReq.category} • Room {selectedReq.room?.roomNumber}, {selectedReq.hostel?.name}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${getStatusBadge(selectedReq.status)}`}>
                    {selectedReq.status.replace("_", " ")}
                  </span>
                </div>

                <div className="mt-4 space-y-4 text-xs">
                  <div>
                    <span className="text-slate-500 block font-semibold mb-1">Issue Description</span>
                    <p className="rounded-xl bg-slate-50 p-3 text-slate-800 border border-slate-100 whitespace-pre-wrap">
                      {selectedReq.description}
                    </p>
                  </div>

                  {selectedReq.resolutionNotes && (
                    <div>
                      <span className="text-emerald-700 block font-semibold mb-1">Resolution Details</span>
                      <p className="rounded-xl bg-emerald-50/50 p-3 text-emerald-900 border border-emerald-100 whitespace-pre-wrap">
                        {selectedReq.resolutionNotes}
                      </p>
                    </div>
                  )}

                  {selectedReq.statusHistory && selectedReq.statusHistory.length > 0 && (
                    <div>
                      <span className="text-slate-500 block font-semibold mb-2">Audit Status Timeline</span>
                      <div className="space-y-2 border-l-2 border-slate-200 pl-3 ml-1">
                        {selectedReq.statusHistory.map((item: any, i: number) => (
                          <div key={i} className="relative text-xs">
                            <div className="font-semibold text-slate-800">
                              {item.status.replace("_", " ")}
                              <span className="ml-2 font-normal text-slate-400">
                                {new Date(item.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {item.notes && <p className="text-slate-600 mt-0.5">{item.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setModalMode(null);
                      setSelectedReq(null);
                    }}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-900"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGate>
  );
}
