"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, X, AlertCircle, CheckCircle2, Clock, CheckCheck, Ban, Info, ChevronRight, FileText, MessageSquare } from "lucide-react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";
import { LoadingState } from "@/components/ui-states";
import type { Id } from "../../../../../backend/convex/_generated/dataModel";

type RequestCategory = "MAINTENANCE" | "LEAVE" | "ROOM_CHANGE" | "COMPLAINT" | "OTHER";
type RequestPriority = "LOW" | "MEDIUM" | "HIGH";
type RequestStatus = "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | "RESOLVED" | "CANCELLED";

export default function StudentRequestsPage() {
  const requests = useQuery(api.requests.listForStudent);
  const createMutation = useMutation(api.requests.create);
  const cancelMutation = useMutation(api.requests.cancel);

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<RequestCategory>("MAINTENANCE");
  const [priority, setPriority] = useState<RequestPriority>("MEDIUM");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const stats = useMemo(() => {
    if (!requests) return { total: 0, pending: 0, active: 0, resolved: 0 };
    let pending = 0;
    let active = 0;
    let resolved = 0;

    for (const r of requests) {
      if (r.status === "PENDING") pending++;
      else if (r.status === "IN_PROGRESS" || r.status === "APPROVED") active++;
      else if (r.status === "RESOLVED") resolved++;
    }

    return { total: requests.length, pending, active, resolved };
  }, [requests]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setFeedback({ type: "error", message: "Subject and description are required." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await createMutation({
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      });

      setSubject("");
      setDescription("");
      setCategory("MAINTENANCE");
      setPriority("MEDIUM");
      setIsOpenModal(false);
      setFeedback({ type: "success", message: "Request ticket submitted successfully. Your warden will be notified." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to submit request." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel(requestId: Id<"requests">) {
    if (!window.confirm("Are you sure you want to cancel this pending request?")) {
      return;
    }

    setCancellingId(requestId);
    setFeedback(null);
    try {
      await cancelMutation({ requestId });
      if (selectedRequest?._id === requestId) {
        setSelectedRequest(null);
      }
      setFeedback({ type: "success", message: "Request cancelled successfully." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to cancel request." });
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <RoleGate role="STUDENT">
      <AppShell role="STUDENT">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Student Support</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">My Requests</h1>
              <p className="mt-1 text-sm text-slate-500">
                Submit maintenance issues, room change requests, leaves of absence, or complaints.
              </p>
            </div>
            <button
              onClick={() => {
                setFeedback(null);
                setIsOpenModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
            >
              <Plus size={18} />
              + New Request
            </button>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">All Tickets</p>
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
                  <p className="mt-1.5 text-2xl font-bold text-blue-800">{stats.active}</p>
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

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* List of Requests */}
          {requests === undefined ? (
            <LoadingState />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No requests submitted yet"
              description="Click '+ New Request' above to submit a maintenance, leave, room change, or complaint ticket."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Subject & Description</th>
                    <th className="px-4 py-3.5">Priority</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Date Submitted</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((r: any) => {
                    const formattedDate = new Intl.DateTimeFormat("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(r.createdAt));

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {r.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{r.subject}</div>
                          <div className="text-xs text-slate-400 line-clamp-1 max-w-sm">
                            {r.description}
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedRequest(r)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                            >
                              Details
                            </button>
                            {r.status === "PENDING" && (
                              <button
                                disabled={cancellingId === r._id}
                                onClick={() => handleCancel(r._id)}
                                className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Details Modal */}
          {selectedRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-xl space-y-5">
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {selectedRequest.category}
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {selectedRequest.subject}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      My Request Description
                    </h4>
                    <p className="mt-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-slate-700 whitespace-pre-wrap text-sm">
                      {selectedRequest.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t pt-3">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Priority Level
                      </h4>
                      <p className="mt-1 font-semibold text-slate-800">{selectedRequest.priority}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Current Status
                      </h4>
                      <p className="mt-1 font-semibold text-slate-800">{selectedRequest.status}</p>
                    </div>
                  </div>

                  {selectedRequest.hostelName && (
                    <div className="border-t pt-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Hostel Facility
                      </h4>
                      <p className="mt-1 text-slate-700 font-medium">
                        {selectedRequest.hostelName} {selectedRequest.roomNumber ? `• Room ${selectedRequest.roomNumber}` : ""}
                      </p>
                    </div>
                  )}

                  {selectedRequest.resolutionNote && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                        Warden Resolution & Response
                      </h4>
                      <p className="mt-1 text-emerald-900 whitespace-pre-wrap text-sm">
                        {selectedRequest.resolutionNote}
                      </p>
                      {selectedRequest.resolvedByName && (
                        <p className="mt-2 text-xs font-medium text-emerald-700">
                          Resolved by: {selectedRequest.resolvedByName}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between border-t pt-4">
                  {selectedRequest.status === "PENDING" ? (
                    <button
                      onClick={() => handleCancel(selectedRequest._id)}
                      disabled={cancellingId === selectedRequest._id}
                      className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Cancel Request
                    </button>
                  ) : <div />}
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="rounded-xl bg-slate-100 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* New Request Modal */}
          {isOpenModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-xl">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-xl font-bold text-slate-900">Create New Request Ticket</h3>
                  <button
                    onClick={() => setIsOpenModal(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreate} className="mt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as RequestCategory)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="MAINTENANCE">MAINTENANCE</option>
                        <option value="LEAVE">LEAVE</option>
                        <option value="ROOM_CHANGE">ROOM_CHANGE</option>
                        <option value="COMPLAINT">COMPLAINT</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as RequestPriority)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Brief summary of your request..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Detailed Description
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Explain your problem, room maintenance issue, or request..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setIsOpenModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Ticket"}
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
