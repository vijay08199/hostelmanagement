"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

export default function StudentLeavesPage() {
  const leaves = useQuery(api.leaves.myLeaves, {}) || [];
  const applyLeave = useMutation(api.leaves.applyLeave);
  const cancelLeave = useMutation(api.leaves.cancelLeave);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [cancellingLeaveId, setCancellingLeaveId] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form
  const [form, setForm] = useState({
    fromDate: new Date().toISOString().split("T")[0],
    toDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    destination: "",
    reason: "",
    emergencyContact: "",
  });

  const stats = useMemo(() => {
    return {
      total: leaves.length,
      pending: leaves.filter((l: any) => l.status === "PENDING").length,
      approved: leaves.filter((l: any) => l.status === "APPROVED").length,
      rejected: leaves.filter((l: any) => l.status === "REJECTED").length,
    };
  }, [leaves]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!form.destination.trim() || !form.reason.trim() || !form.emergencyContact.trim()) {
      setMessage({ text: "Please fill in all required fields.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      await applyLeave({
        fromDate: form.fromDate,
        toDate: form.toDate,
        destination: form.destination.trim(),
        reason: form.reason.trim(),
        emergencyContact: form.emergencyContact.trim(),
      });
      setMessage({ text: "Leave application submitted successfully for warden review.", type: "success" });
      setShowApplyModal(false);
      setForm({
        fromDate: new Date().toISOString().split("T")[0],
        toDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        destination: "",
        reason: "",
        emergencyContact: "",
      });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to submit leave application.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!cancellingLeaveId) return;
    try {
      setIsSubmitting(true);
      await cancelLeave({
        id: cancellingLeaveId,
      });
      setMessage({ text: "Leave request has been cancelled.", type: "success" });
      setCancellingLeaveId(null);
      setCancelReason("");
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to cancel leave.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
      case "PENDING":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
      case "CANCELLED":
        return "bg-slate-100 text-slate-700 ring-1 ring-slate-600/20";
      default:
        return "bg-slate-50 text-slate-700 ring-1 ring-slate-600/20";
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
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Hostel Leave Requests</h1>
              <p className="mt-1 text-sm text-slate-500">
                Apply for outstation or home visits, check approval status, and manage active gate passes.
              </p>
            </div>
            <button
              onClick={() => setShowApplyModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
            >
              <span className="text-sm">+</span> Apply for Leave
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
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Applications</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{stats.total}</p>
              <p className="mt-1 text-xs text-slate-500">Lifetime history</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Review</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">{stats.pending}</p>
              <p className="mt-1 text-xs text-amber-600 font-medium">Awaiting warden decision</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved Leaves</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{stats.approved}</p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Clearance granted</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rejected</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600">{stats.rejected}</p>
              <p className="mt-1 text-xs text-slate-500">Past declined requests</p>
            </Card>
          </div>

          {/* Leaves List */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 bg-slate-50/75 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Your Leave History</h2>
              <p className="text-xs text-slate-500">List of all home & outstation travel requests registered on your account.</p>
            </div>

            <div className="divide-y divide-slate-100">
              {leaves.length === 0 ? (
                <div className="p-8 text-center">
                  <EmptyState
                    title="No leave requests found"
                    description="You have not submitted any outstation or home leave applications yet. Click 'Apply for Leave' to create one."
                  />
                </div>
              ) : (
                leaves.map((l: any) => {
                  const days = Math.max(
                    1,
                    Math.round(
                      (new Date(l.toDate).getTime() - new Date(l.fromDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1
                  );

                  return (
                    <div key={l._id} className="p-5 transition-colors hover:bg-slate-50/50">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">
                              {l.destination}
                            </span>
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getStatusBadge(l.status)}`}>
                              {l.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Period: <span className="font-medium text-slate-800">{new Date(l.fromDate).toLocaleDateString()}</span> to{" "}
                            <span className="font-medium text-slate-800">{new Date(l.toDate).toLocaleDateString()}</span> ({days} Day{days > 1 ? "s" : ""})
                          </p>
                          <p className="text-xs text-slate-500">
                            Hostel: <span className="text-indigo-600">{l.hostel?.name || "Hostel"}</span> • Room {l.room?.roomNumber || "N/A"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {l.status === "PENDING" && (
                            <button
                              onClick={() => {
                                setCancellingLeaveId(l._id);
                                setCancelReason("");
                              }}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Cancel Request
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100/80">
                        <p className="text-slate-700">
                          <strong className="text-slate-900">Reason:</strong> {l.reason}
                        </p>
                        <p className="mt-1 text-slate-500">
                          <strong>Emergency Contact:</strong> <span className="font-mono text-slate-700">{l.emergencyContact}</span>
                        </p>
                        {l.remarks && (
                          <div className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-900 border border-amber-100">
                            <strong>Warden Remark:</strong> {l.remarks}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Apply Leave Modal */}
          {showApplyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Apply for Hostel Leave</h3>
                  <button
                    onClick={() => setShowApplyModal(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleApply} className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        From Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={form.fromDate}
                        onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        To Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        min={form.fromDate}
                        value={form.toDate}
                        onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Destination City / Town <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Hometown (Mysuru), Bangalore"
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Parent / Guardian Emergency Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={form.emergencyContact}
                      onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Reason for Leave <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Specify festival vacation, medical appointment, family event, etc."
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setShowApplyModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Application"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Cancel Leave Modal */}
          {cancellingLeaveId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 text-rose-600">Cancel Leave Request</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Are you sure you want to withdraw this leave request? This cannot be undone.
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reason for Cancellation (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Plans changed, postponed"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => {
                      setCancellingLeaveId(null);
                      setCancelReason("");
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Keep Leave
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
        </div>
      </AppShell>
    </RoleGate>
  );
}
