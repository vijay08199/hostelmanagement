"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Search, Filter, Clock, CheckCheck, AlertCircle, CheckCircle2, X, Eye, FileText, ChevronRight, MessageSquare } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";
import type { Id } from "../../../../../backend/convex/_generated/dataModel";

type RequestCategory = "MAINTENANCE" | "LEAVE" | "ROOM_CHANGE" | "COMPLAINT" | "OTHER";
type RequestPriority = "LOW" | "MEDIUM" | "HIGH";
type RequestStatus = "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | "RESOLVED" | "CANCELLED";

export default function WardenRequestsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<RequestStatus>("IN_PROGRESS");
  const [resolutionNote, setResolutionNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const requests = useQuery(api.requests.listForWarden, {
    statusFilter: (statusFilter || undefined) as RequestStatus | undefined,
    category: (categoryFilter || undefined) as RequestCategory | undefined,
    priority: (priorityFilter || undefined) as RequestPriority | undefined,
    search: search.trim() || undefined,
  });

  const updateStatusMutation = useMutation(api.requests.updateStatus);

  const stats = useMemo(() => {
    if (!requests) return { total: 0, pending: 0, inProgress: 0, resolved: 0, rejected: 0 };
    let pending = 0;
    let inProgress = 0;
    let resolved = 0;
    let rejected = 0;

    for (const r of requests) {
      if (r.status === "PENDING") pending++;
      else if (r.status === "IN_PROGRESS" || r.status === "APPROVED") inProgress++;
      else if (r.status === "RESOLVED") resolved++;
      else if (r.status === "REJECTED") rejected++;
    }

    return { total: requests.length, pending, inProgress, resolved, rejected };
  }, [requests]);

  function openDetails(request: any) {
    setActiveRequest(request);
    setNewStatus(request.status === "PENDING" ? "IN_PROGRESS" : request.status);
    setResolutionNote(request.resolutionNote ?? "");
    setFeedback(null);
  }

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRequest) return;

    setIsUpdating(true);
    setFeedback(null);

    try {
      await updateStatusMutation({
        requestId: activeRequest._id,
        status: newStatus,
        resolutionNote: resolutionNote.trim() || undefined,
      });

      setFeedback({
        type: "success",
        message: `Request status updated to ${newStatus}.`,
      });
      setActiveRequest((prev: any) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              resolutionNote: resolutionNote.trim() || undefined,
            }
          : null
      );
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to update request status.",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  const isLoading = requests === undefined;

  return (
    <RoleGate role="WARDEN">
      <AppShell role="WARDEN">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Ticket Center</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Request Management</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage, review, and resolve operational requests submitted by students in your assigned hostels.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Requests</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700">
                  <FileText size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-amber-100 bg-amber-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pending</p>
                  <p className="mt-1.5 text-2xl font-bold text-amber-800">{stats.pending}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-100/60 p-2.5 text-amber-700">
                  <Clock size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-blue-100 bg-blue-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">In Progress</p>
                  <p className="mt-1.5 text-2xl font-bold text-blue-800">{stats.inProgress}</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-100/60 p-2.5 text-blue-700">
                  <MessageSquare size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-emerald-100 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Resolved</p>
                  <p className="mt-1.5 text-2xl font-bold text-emerald-800">{stats.resolved}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-100/60 p-2.5 text-emerald-700">
                  <CheckCheck size={20} />
                </div>
              </div>
            </Card>
          </div>

          {/* Filters Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Search size={14} /> Search
                </label>
                <input
                  type="text"
                  placeholder="Student, ID, subject, room..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Filter size={14} /> Status Filter
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Filter size={14} /> Category Filter
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="LEAVE">LEAVE</option>
                  <option value="ROOM_CHANGE">ROOM_CHANGE</option>
                  <option value="COMPLAINT">COMPLAINT</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Filter size={14} /> Priority Filter
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Priorities</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Requests Table */}
          {isLoading ? (
            <LoadingState />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No requests found"
              description="No requests match your current filters in your assigned hostels."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Subject & Room</th>
                    <th className="px-4 py-3.5">Priority</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Created</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((r: any) => {
                    const formattedDate = new Intl.DateTimeFormat("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(r.createdAt));

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
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {r.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 line-clamp-1 max-w-xs">
                            {r.subject}
                          </div>
                          <div className="text-xs text-slate-400">
                            {r.hostelName} {r.roomNumber !== "—" ? `• Room ${r.roomNumber}` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {r.priority === "HIGH" && (
                            <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                              HIGH
                            </span>
                          )}
                          {r.priority === "MEDIUM" && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              MEDIUM
                            </span>
                          )}
                          {r.priority === "LOW" && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                              LOW
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {r.status === "PENDING" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                              PENDING
                            </span>
                          )}
                          {r.status === "IN_PROGRESS" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                              IN PROGRESS
                            </span>
                          )}
                          {r.status === "APPROVED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-teal-600"></span>
                              APPROVED
                            </span>
                          )}
                          {r.status === "RESOLVED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                              RESOLVED
                            </span>
                          )}
                          {r.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                              REJECTED
                            </span>
                          )}
                          {r.status === "CANCELLED" && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                              CANCELLED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => openDetails(r)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 shadow-2xs transition-colors"
                          >
                            <Eye size={14} /> Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Details & Resolution Modal */}
          {activeRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-6">
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {activeRequest.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        Priority: <strong className="text-slate-800">{activeRequest.priority}</strong>
                      </span>
                    </div>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {activeRequest.subject}
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveRequest(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Details Section */}
                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Student
                    </span>
                    <p className="mt-1 font-semibold text-slate-900">{activeRequest.studentName}</p>
                    <p className="font-mono text-xs text-slate-500">{activeRequest.studentIdentifier}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Hostel & Room
                    </span>
                    <p className="mt-1 font-medium text-slate-800">{activeRequest.hostelName}</p>
                    <p className="text-xs text-slate-500">Room {activeRequest.roomNumber}</p>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Description
                  </span>
                  <p className="mt-1.5 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
                    {activeRequest.description}
                  </p>
                </div>

                {/* Status Update & Resolution Form */}
                <form onSubmit={handleUpdateStatus} className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Update Status & Resolution</h4>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Change Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as RequestStatus)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="REJECTED">REJECTED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Resolution Note / Comments
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add notes for the student regarding resolution or status updates..."
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveRequest(null)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isUpdating ? "Saving..." : "Update Request"}
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
