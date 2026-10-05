"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

type MaintenanceCategory = "ELECTRICAL" | "PLUMBING" | "CLEANING" | "FURNITURE" | "INTERNET" | "AC_FAN" | "BATHROOM" | "ROOM" | "OTHER";
type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export default function StudentMaintenancePage() {
  const requests = useQuery(api.maintenance.myMaintenance, {}) || [];
  const createMaintenance = useMutation(api.maintenance.createMaintenance);
  const cancelMaintenance = useMutation(api.maintenance.cancelMaintenance);
  const closeMaintenance = useMutation(api.maintenance.closeMaintenance);

  const [showModal, setShowModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [cancellingId, setCancellingId] = useState<any>(null);
  const [closingReq, setClosingReq] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rating, setRating] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form
  const [form, setForm] = useState({
    category: "ELECTRICAL" as MaintenanceCategory,
    priority: "MEDIUM" as MaintenancePriority,
    title: "",
    description: "",
    imageUrl: "",
  });

  const stats = useMemo(() => {
    return {
      total: requests.length,
      open: requests.filter((r: any) => r.status === "PENDING" || r.status === "ASSIGNED" || r.status === "IN_PROGRESS").length,
      resolved: requests.filter((r: any) => r.status === "RESOLVED").length,
      closed: requests.filter((r: any) => r.status === "CLOSED").length,
    };
  }, [requests]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) {
      setMessage({ text: "Please enter an issue description.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      const fullDesc = form.title.trim()
        ? `${form.title.trim()}: ${form.description.trim()}`
        : form.description.trim();
      await createMaintenance({
        category: form.category,
        priority: form.priority,
        description: fullDesc,
      });
      setMessage({ text: "Maintenance request registered for your room.", type: "success" });
      setShowModal(false);
      setForm({
        category: "ELECTRICAL",
        priority: "MEDIUM",
        title: "",
        description: "",
        imageUrl: "",
      });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to create maintenance ticket.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!cancellingId) return;
    try {
      setIsSubmitting(true);
      await cancelMaintenance({
        id: cancellingId,
      });
      setMessage({ text: "Maintenance ticket cancelled.", type: "success" });
      setCancellingId(null);
      setCancelReason("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to cancel ticket.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCloseResolved() {
    if (!closingReq) return;
    try {
      setIsSubmitting(true);
      await closeMaintenance({
        id: closingReq._id,
        note: feedbackNotes.trim() || undefined,
      });
      setMessage({ text: "Thank you for confirming resolution. Ticket closed.", type: "success" });
      setClosingReq(null);
      setFeedbackNotes("");
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
    <RoleGate role="STUDENT">
      <AppShell role="STUDENT">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Student Portal</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Room Maintenance & Repairs</h1>
              <p className="mt-1 text-sm text-slate-500">
                Report electrical, plumbing, carpentry, or fixture issues in your allocated room.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
            >
              <span className="text-sm">+</span> Report Issue
            </button>
          </div>

          {message && (
            <div
              className={`rounded-xl border px-4 py-2.5 text-xs flex items-center justify-between gap-2 ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="font-bold hover:underline">
                ✕
              </button>
            </div>
          )}

          {/* Metric Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Work Orders</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{stats.total}</p>
              <p className="mt-1 text-xs text-slate-500">Submitted tickets</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active / In-Progress</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">{stats.open}</p>
              <p className="mt-1 text-xs text-amber-600 font-medium">Pending or being fixed</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Awaiting Confirmation</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{stats.resolved}</p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Fixed by technician</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Closed Tickets</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-600">{stats.closed}</p>
              <p className="mt-1 text-xs text-slate-500">Verified and closed</p>
            </Card>
          </div>

          {/* Maintenance Requests List */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 bg-slate-50/75 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Your Maintenance Tickets</h2>
              <p className="text-xs text-slate-500">Track technician assignments and repair status updates.</p>
            </div>

            <div className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <div className="p-8 text-center">
                  <EmptyState
                    title="No maintenance requests"
                    description="Everything in your room is running smoothly! Click 'Report Issue' if anything requires repair."
                  />
                </div>
              ) : (
                requests.map((r: any) => (
                  <div key={r._id} className="p-5 transition-colors hover:bg-slate-50/50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] ${getPriorityBadge(r.priority)}`}>
                            {r.priority}
                          </span>
                          <span className="font-semibold text-slate-900 text-sm">
                            {r.title}
                          </span>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getStatusBadge(r.status)}`}>
                            {r.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Category: <span className="font-medium text-slate-800">{r.category}</span> • Room:{" "}
                          <span className="font-medium text-slate-800">{r.room?.roomNumber || "Your Room"}</span> ({r.hostel?.name || "Hostel"})
                        </p>
                        {r.assignedTo && (
                          <p className="text-xs font-medium text-purple-700">
                            Assigned Technician: {r.assignedTo} {r.technicianPhone ? `(Ph: ${r.technicianPhone})` : ""}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {r.status === "RESOLVED" && (
                          <button
                            onClick={() => {
                              setClosingReq(r);
                              setRating(5);
                              setFeedbackNotes("");
                            }}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                          >
                            Confirm & Close
                          </button>
                        )}

                        {r.status === "PENDING" && (
                          <button
                            onClick={() => {
                              setCancellingId(r._id);
                              setCancelReason("");
                            }}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Cancel Ticket
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedReq(r)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          View Timeline
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100/80">
                      <p className="text-slate-700 whitespace-pre-wrap">{r.description}</p>
                      {r.resolutionNotes && (
                        <div className="mt-2 rounded-lg bg-emerald-50 p-2.5 text-emerald-900 border border-emerald-100">
                          <strong>Resolution Details:</strong> {r.resolutionNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* New Maintenance Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Report Maintenance Issue</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value as MaintenanceCategory })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="ELECTRICAL">Electrical (Lights, Fan, Switchboard)</option>
                        <option value="PLUMBING">Plumbing (Tap, Shower, Flush, Leakage)</option>
                        <option value="CLEANING">Cleaning & Sanitation</option>
                        <option value="FURNITURE">Furniture (Bed, Cupboard, Table, Chair)</option>
                        <option value="INTERNET">Internet / LAN / Wi-Fi</option>
                        <option value="AC_FAN">AC / Fan / Ventilation</option>
                        <option value="BATHROOM">Bathroom Fixtures</option>
                        <option value="ROOM">Room Door / Window / Lock</option>
                        <option value="OTHER">Other Issue</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Priority Level <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value as MaintenancePriority })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="LOW">Low (Minor aesthetic issue)</option>
                        <option value="MEDIUM">Medium (Normal daily repair)</option>
                        <option value="HIGH">High (Impacts room usage)</option>
                        <option value="URGENT">Urgent (Immediate attention required)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Problem Summary <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Geyser switch sparking or Ceiling fan regulator stuck"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Detailed Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describe what happened, exact location in room, and any safety concerns..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setShowModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Maintenance Ticket"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Confirm & Close Modal */}
          {closingReq && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-emerald-600">Confirm Repair Completion</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Please rate the maintenance service quality for: <strong>{closingReq.title}</strong>
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Satisfaction Rating
                    </label>
                    <div className="mt-1.5 flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          className={`h-9 w-9 rounded-xl font-bold text-sm ${
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
                      Student Feedback (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g., Fixed promptly, good work by electrician"
                      value={feedbackNotes}
                      onChange={(e) => setFeedbackNotes(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setClosingReq(null);
                      setFeedbackNotes("");
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleCloseResolved}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Closing..." : "Close Ticket"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Modal */}
          {cancellingId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-rose-600">Cancel Work Order</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Withdraw this maintenance request?
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Resolved on my own"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setCancellingId(null);
                      setCancelReason("");
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Keep Ticket
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleCancel}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Details / Timeline Modal */}
          {selectedReq && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedReq.title}</h3>
                    <p className="text-xs text-slate-500">{selectedReq.category} • Priority: {selectedReq.priority}</p>
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
                      <span className="text-slate-500 block font-semibold mb-2">Ticket Progress Timeline</span>
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
                    onClick={() => setSelectedReq(null)}
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
