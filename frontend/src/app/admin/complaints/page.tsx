"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

export default function AdminComplaintsPage() {
  const hostels = useQuery(api.admin.listHostels, {}) || [];
  const stats = useQuery(api.complaints.getComplaintStats, {});
  const complaints = useQuery(api.complaints.listComplaints, {});

  const reviewComplaint = useMutation(api.complaints.reviewComplaint);
  const startComplaintWork = useMutation(api.complaints.startComplaintWork);
  const resolveComplaint = useMutation(api.complaints.resolveComplaint);
  const closeComplaint = useMutation(api.complaints.closeComplaint);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [hostelFilter, setHostelFilter] = useState<string>("ALL");

  // Modals & Action states
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [modalMode, setModalMode] = useState<"REVIEW" | "START" | "RESOLVE" | "CLOSE" | "VIEW" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Forms
  const [actionRemarks, setActionRemarks] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [rating, setRating] = useState(5);

  const filteredComplaints = useMemo(() => {
    if (!complaints) return [];
    return complaints.filter((c: any) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        c.subject?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        (!c.isAnonymous && (c.student?.firstName?.toLowerCase().includes(q) || c.student?.lastName?.toLowerCase().includes(q))) ||
        c.room?.roomNumber?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || c.category === categoryFilter;
      const matchesPriority = priorityFilter === "ALL" || c.priority === priorityFilter;
      const matchesHostel = hostelFilter === "ALL" || c.hostel?._id === hostelFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesHostel;
    });
  }, [complaints, search, statusFilter, categoryFilter, priorityFilter, hostelFilter]);

  async function handleReview() {
    if (!selectedComplaint) return;
    try {
      setIsSubmitting(true);
      await reviewComplaint({
        id: selectedComplaint._id,
        reviewNotes: actionRemarks.trim() || undefined,
      });
      setMessage({ text: "Complaint marked under review.", type: "success" });
      setModalMode(null);
      setSelectedComplaint(null);
      setActionRemarks("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update review status.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStartWork(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedComplaint) return;
    try {
      setIsSubmitting(true);
      await startComplaintWork({
        id: selectedComplaint._id,
        notes: actionRemarks.trim() || undefined,
      });
      setMessage({ text: "Complaint action initiated.", type: "success" });
      setModalMode(null);
      setSelectedComplaint(null);
      setAssignedTo("");
      setActionRemarks("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to initiate action.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedComplaint || !actionRemarks.trim()) {
      setMessage({ text: "Resolution remarks are required.", type: "error" });
      return;
    }
    try {
      setIsSubmitting(true);
      await resolveComplaint({
        id: selectedComplaint._id,
        resolutionNotes: actionRemarks.trim(),
      });
      setMessage({ text: "Complaint marked resolved.", type: "success" });
      setModalMode(null);
      setSelectedComplaint(null);
      setActionRemarks("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to resolve complaint.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClose() {
    if (!selectedComplaint) return;
    try {
      setIsSubmitting(true);
      await closeComplaint({
        id: selectedComplaint._id,
      });
      setMessage({ text: "Complaint closed successfully.", type: "success" });
      setModalMode(null);
      setSelectedComplaint(null);
      setActionRemarks("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to close complaint.", type: "error" });
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
      case "UNDER_REVIEW":
        return "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20";
      case "SUBMITTED":
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
    <RoleGate role="ADMIN">
      <AppShell role="ADMIN">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Grievance Redressal</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Student Complaint Management</h1>
              <p className="mt-1 text-sm text-slate-500">
                Review hostel grievances, investigate disciplinary reports, and ensure prompt student problem resolution.
              </p>
            </div>
            {message && (
              <div
                className={`rounded-xl border px-4 py-2.5 text-xs flex items-center gap-2 ${message.type === "success"
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
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Grievances</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {stats?.total ?? (complaints?.length || 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Across all hostels</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">New & Under Review</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
                {(stats?.submitted || 0) + (stats?.underReview || 0)}
              </p>
              <p className="mt-1 text-xs text-amber-600 font-medium">Awaiting investigation</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Action In-Progress</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-blue-600">
                {stats?.inProgress ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Investigation underway</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Urgent Grievances</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600">
                {stats?.urgent ?? 0}
              </p>
              <p className="mt-1 text-xs text-rose-600 font-medium">Anti-ragging / Security</p>
            </Card>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="relative min-w-[200px] flex-1">
              <input
                type="text"
                placeholder="Search complaint subject, details, student name..."
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

            <select
              value={hostelFilter}
              onChange={(e) => setHostelFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Hostels</option>
              {hostels.map((h: any) => (
                <option key={h._id} value={h._id}>
                  {h.name}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="HOSTEL">Hostel & Facilities</option>
              <option value="FOOD">Food & Mess</option>
              <option value="ROOMMATE">Roommate Issue</option>
              <option value="STAFF">Staff Conduct</option>
              <option value="FACILITY">Facility & Utilities</option>
              <option value="DISCIPLINE">Discipline & Noise</option>
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
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
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
                    <th className="px-5 py-3.5">Subject & Priority</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Reporting Student</th>
                    <th className="px-5 py-3.5">Status & Handling</th>
                    <th className="px-5 py-3.5">Submitted</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center">
                        <EmptyState
                          title="No complaints found"
                          description="No grievance tickets match your current filters."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map((c: any) => (
                      <tr key={c._id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-5 py-4 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 line-clamp-1">{c.subject}</span>
                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] ${getPriorityBadge(c.priority)}`}>
                              {c.priority}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{c.description}</p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-medium text-slate-700">
                          {c.category.replace("_", " ")}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {c.isAnonymous ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              🔒 Anonymous Student
                            </span>
                          ) : (
                            <div>
                              <div className="font-medium text-slate-900">
                                {c.student?.firstName} {c.student?.lastName}
                              </div>
                              <div className="text-xs text-slate-500">
                                Room {c.room?.roomNumber || "N/A"} • {c.hostel?.name || "Hostel"}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${getStatusBadge(
                              c.status
                            )}`}
                          >
                            {c.status.replace("_", " ")}
                          </span>
                          {c.assignedTo && (
                            <div className="mt-1 text-xs text-slate-500">
                              Assigned: {c.assignedTo}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.status === "SUBMITTED" && (
                              <button
                                onClick={() => {
                                  setSelectedComplaint(c);
                                  setActionRemarks("");
                                  setModalMode("REVIEW");
                                }}
                                className="rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700"
                              >
                                Review
                              </button>
                            )}

                            {c.status === "UNDER_REVIEW" && (
                              <button
                                onClick={() => {
                                  setSelectedComplaint(c);
                                  setAssignedTo("");
                                  setActionRemarks("");
                                  setModalMode("START");
                                }}
                                className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                              >
                                Take Action
                              </button>
                            )}

                            {c.status === "IN_PROGRESS" && (
                              <button
                                onClick={() => {
                                  setSelectedComplaint(c);
                                  setActionRemarks("");
                                  setModalMode("RESOLVE");
                                }}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                              >
                                Mark Resolved
                              </button>
                            )}

                            {c.status === "RESOLVED" && (
                              <button
                                onClick={() => {
                                  setSelectedComplaint(c);
                                  setActionRemarks("");
                                  setModalMode("CLOSE");
                                }}
                                className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-900"
                              >
                                Close
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedComplaint(c);
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

          {/* Action Modals */}
          {modalMode === "REVIEW" && selectedComplaint && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-purple-600">Mark Complaint Under Review</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Acknowledge grievance: <strong>{selectedComplaint.subject}</strong>
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Review Remark (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g., Forwarded to hostel proctorial board for inspection"
                    value={actionRemarks}
                    onChange={(e) => setActionRemarks(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setModalMode(null);
                      setSelectedComplaint(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleReview}
                    className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Updating..." : "Mark Under Review"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {modalMode === "START" && selectedComplaint && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-blue-600">Commence Action & Investigation</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Subject: <strong>{selectedComplaint.subject}</strong>
                </p>

                <form onSubmit={handleStartWork} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Assigned Officer / Warden / Committee
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Chief Warden / Mess Committee"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Action Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g., Meeting called with mess contractor to address quality issues"
                      value={actionRemarks}
                      onChange={(e) => setActionRemarks(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setModalMode(null);
                        setSelectedComplaint(null);
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Starting..." : "Begin Action"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {modalMode === "RESOLVE" && selectedComplaint && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-emerald-600">Resolve Complaint</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Subject: <strong>{selectedComplaint.subject}</strong>
                </p>

                <form onSubmit={handleResolve} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Resolution Remarks <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Detail findings and corrective actions taken..."
                      value={actionRemarks}
                      onChange={(e) => setActionRemarks(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setModalMode(null);
                        setSelectedComplaint(null);
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

          {modalMode === "CLOSE" && selectedComplaint && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900">Close Complaint Record</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Close grievance: <strong>{selectedComplaint.subject}</strong>
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Resolution Effectiveness (1 - 5)
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          className={`h-8 w-8 rounded-lg font-bold text-xs ${rating >= star
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
                      Final Close Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g., Matter completely concluded and verified"
                      value={actionRemarks}
                      onChange={(e) => setActionRemarks(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setModalMode(null);
                      setSelectedComplaint(null);
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
                    {isSubmitting ? "Closing..." : "Close Grievance"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {modalMode === "VIEW" && selectedComplaint && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedComplaint.subject}</h3>
                    <p className="text-xs text-slate-500">{selectedComplaint.category.replace("_", " ")} • Priority: {selectedComplaint.priority}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${getStatusBadge(selectedComplaint.status)}`}>
                    {selectedComplaint.status.replace("_", " ")}
                  </span>
                </div>

                <div className="mt-4 space-y-4 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <span className="text-slate-500 block font-semibold mb-1">Student & Origin</span>
                    {selectedComplaint.isAnonymous ? (
                      <p className="text-slate-700 font-medium">Submitted Anonymously by Student (Identity Protected)</p>
                    ) : (
                      <p className="text-slate-800 font-medium">
                        {selectedComplaint.student?.firstName} {selectedComplaint.student?.lastName} (Room {selectedComplaint.room?.roomNumber}, {selectedComplaint.hostel?.name})
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block font-semibold mb-1">Grievance Description</span>
                    <p className="rounded-xl bg-slate-50 p-3 text-slate-800 border border-slate-100 whitespace-pre-wrap">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  {selectedComplaint.resolutionRemarks && (
                    <div>
                      <span className="text-emerald-700 block font-semibold mb-1">Resolution Actions</span>
                      <p className="rounded-xl bg-emerald-50/50 p-3 text-emerald-900 border border-emerald-100 whitespace-pre-wrap">
                        {selectedComplaint.resolutionRemarks}
                      </p>
                    </div>
                  )}

                  {selectedComplaint.staffRemarks && (
                    <div>
                      <span className="text-slate-500 block font-semibold mb-1">Staff Notes</span>
                      <p className="rounded-xl bg-amber-50/50 p-3 text-amber-900 border border-amber-100">
                        {selectedComplaint.staffRemarks}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setModalMode(null);
                      setSelectedComplaint(null);
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
